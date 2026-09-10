import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../auth';
import { db } from '../db';
import {
  MediaIngestionService,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '../services/mediaIngestion.service';
import { AnalysisEngineService } from '../services/analysisEngine.service';
import { EntitlementService } from '../services/entitlement.service';
import { ScanPipelineService, SCAN_ERROR_CODES } from '../services/scanPipeline.service';
import { TEST_SAMPLES } from '../services/testSamples.service';

const router = Router();

// Configure temporary upload storage
const TMP_UPLOAD_DIR = path.join(process.cwd(), '.data', 'tmp_uploads');
if (!fs.existsSync(TMP_UPLOAD_DIR)) {
  fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `upload_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_MIME_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file format (${file.mimetype}). PreScan supports MP4, MOV, WebM, MP3, WAV, AAC.`));
    }
  },
});

/**
 * Helper to get active organization ID for request
 */
function getTargetOrganizationId(req: Request): string | null {
  const headerOrgId = (req.headers['x-workspace-id'] || req.headers['x-organization-id']) as string;
  if (headerOrgId && headerOrgId.trim()) return headerOrgId.trim();
  const user = req.user;
  if (!user) return null;
  if (user.defaultOrganizationId) return user.defaultOrganizationId;
  const orgs = db.findOrganizationsByUserId(user.id);
  return orgs[0]?.id || null;
}

/**
 * POST /api/scans/youtube/validate
 * Validates YouTube URL and retrieves preview metadata without creating a record
 */
router.post('/youtube/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required.', isValid: false });
    }

    const validation = MediaIngestionService.validateYouTubeUrl(url);
    if (!validation.isValid || !validation.videoId) {
      return res.status(400).json({
        isValid: false,
        error: validation.error || 'Invalid YouTube video URL.',
      });
    }

    // Fetch public preview metadata
    const metadata = await MediaIngestionService.fetchYouTubeMetadata(validation.videoId);

    return res.json({
      isValid: true,
      videoId: validation.videoId,
      normalizedUrl: validation.normalizedUrl,
      metadata,
    });
  } catch (err: any) {
    return res.status(500).json({
      isValid: false,
      error: err?.message || 'Failed to validate YouTube URL.',
    });
  }
});

/**
 * POST /api/scans/upload
 * Upload media file directly and initiate ingestion pipeline
 */
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const orgId = req.body.organizationId || getTargetOrganizationId(req);

      if (!orgId) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'Workspace organization context is required.' });
      }

      // Check membership
      const membership = db.findMembership(orgId, user.id);
      if (!membership) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ error: 'You are not a member of this workspace.', code: 'FORBIDDEN_WORKSPACE' });
      }

      // Check workspace plan entitlement for new scans
      const entitlement = EntitlementService.canCreateScan(orgId);
      if (!entitlement.allowed) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({
          error: entitlement.reason,
          code: entitlement.errorCode || 'PLAN_LIMIT_REACHED',
          limits: entitlement.limits,
          usage: entitlement.usage,
          plan: entitlement.plan,
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No media file provided for upload.' });
      }

      // Parse metadata from form
      const tagsArray = req.body.tags
        ? typeof req.body.tags === 'string'
          ? req.body.tags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : req.body.tags
        : [];

      const metadata = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        tags: tagsArray,
        madeForKids: req.body.madeForKids === 'true' || req.body.madeForKids === true,
        language: req.body.language || 'en',
        sensitivityLevel: req.body.sensitivityLevel === 'STRICT' ? 'STRICT' : 'STANDARD',
        checkCommunityGuidelines: req.body.checkCommunityGuidelines !== 'false',
        checkAdvertiserSuitability: req.body.checkAdvertiserSuitability !== 'false',
        checkCopyrightSignals: req.body.checkCopyrightSignals !== 'false',
        checkMetadataIntegrity: req.body.checkMetadataIntegrity !== 'false',
      };

      const result = await MediaIngestionService.createAndProcessFileUpload({
        organizationId: orgId,
        userId: user.id,
        file: req.file,
        metadata: metadata as any,
      });

      // Automatically trigger unified end-to-end processing pipeline
      ScanPipelineService.startPipeline(result.scan.id, orgId, user.id).catch((err) => {
        console.error('ScanPipeline file startup error:', err);
      });

      return res.status(201).json({
        success: true,
        scan: result.scan,
        job: result.job,
      });
    } catch (err: any) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Upload handler error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to process file upload.',
      });
    }
  }
);

/**
 * POST /api/scans/youtube
 * Ingest YouTube URL and initiate ingestion pipeline
 */
router.post('/youtube', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const orgId = req.body.organizationId || getTargetOrganizationId(req);

    if (!orgId) {
      return res.status(400).json({ error: 'Workspace organization context is required.' });
    }

    const membership = db.findMembership(orgId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace.', code: 'FORBIDDEN_WORKSPACE' });
    }

    // Check workspace plan entitlement for new scans
    const entitlement = EntitlementService.canCreateScan(orgId);
    if (!entitlement.allowed) {
      return res.status(403).json({
        error: entitlement.reason,
        code: entitlement.errorCode || 'PLAN_LIMIT_REACHED',
        limits: entitlement.limits,
        usage: entitlement.usage,
        plan: entitlement.plan,
      });
    }

    const { url, metadata = {} } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required.' });
    }

    const tagsArray = metadata.tags
      ? typeof metadata.tags === 'string'
        ? metadata.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : metadata.tags
      : [];

    const parsedMeta = {
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      tags: tagsArray,
      madeForKids: metadata.madeForKids === true,
      language: metadata.language || 'en',
      sensitivityLevel: metadata.sensitivityLevel === 'STRICT' ? 'STRICT' : 'STANDARD',
      checkCommunityGuidelines: metadata.checkCommunityGuidelines !== false,
      checkAdvertiserSuitability: metadata.checkAdvertiserSuitability !== false,
      checkCopyrightSignals: metadata.checkCopyrightSignals !== false,
      checkMetadataIntegrity: metadata.checkMetadataIntegrity !== false,
    };

    const result = await MediaIngestionService.createAndProcessYouTubeUrl({
      organizationId: orgId,
      userId: user.id,
      url,
      metadata: parsedMeta as any,
    });

    // Automatically trigger unified end-to-end processing pipeline
    ScanPipelineService.startPipeline(result.scan.id, orgId, user.id).catch((err) => {
      console.error('ScanPipeline YouTube startup error:', err);
    });

    return res.status(201).json({
      success: true,
      scan: result.scan,
      job: result.job,
    });
  } catch (err: any) {
    console.error('YouTube ingestion error:', err);
    return res.status(400).json({
      error: err?.message || 'Failed to ingest YouTube video URL.',
    });
  }
});

/**
 * POST /api/scans/sample
 * Ingest built-in sample test fixture for testing realistic QA scenarios
 */
router.post('/sample', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const orgId = req.body.organizationId || getTargetOrganizationId(req);

    if (!orgId) {
      return res.status(400).json({ error: 'Workspace organization context is required.' });
    }

    const membership = db.findMembership(orgId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace.', code: 'FORBIDDEN_WORKSPACE' });
    }

    const sampleId = req.body.sampleId;
    const sample = TEST_SAMPLES[sampleId];
    if (!sample) {
      return res.status(400).json({ error: `Invalid sample ID: ${sampleId}` });
    }

    // Check workspace plan entitlement for new scans
    const entitlement = EntitlementService.canCreateScan(orgId);
    if (!entitlement.allowed) {
      return res.status(403).json({
        error: entitlement.reason,
        code: entitlement.errorCode || 'PLAN_LIMIT_REACHED',
        limits: entitlement.limits,
        usage: entitlement.usage,
        plan: entitlement.plan,
      });
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobId = `ingest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const initialJob = db.createIngestionJob({
      id: jobId,
      scanId,
      organizationId: orgId,
      status: 'QUEUED',
      sourceType: 'file',
      sourceDetails: {
        fileName: `${sample.id}.mp4`,
      },
      progressPercent: 5,
      currentStep: 'Loading realistic test fixture scenario...',
      logs: [{ timestamp: now, level: 'INFO', message: `Test scenario initialized: ${sample.name}` }],
      createdAt: now,
      updatedAt: now,
    });

    const initialScan = db.createScan({
      id: scanId,
      organizationId: orgId,
      title: sample.title,
      description: sample.description,
      category: sample.category,
      tags: sample.tags,
      madeForKids: sample.madeForKids,
      language: sample.language,
      status: 'QUEUED',
      stage: 'QUEUED',
      config: {
        checkCommunityGuidelines: true,
        checkAdvertiserSuitability: true,
        checkCopyrightSignals: true,
        checkMetadataIntegrity: true,
        targetCategory: sample.category,
        targetLanguage: sample.language,
        sensitivityLevel: 'STANDARD',
      },
      sourceType: 'file',
      source: {
        type: 'file',
        fileName: `${sample.id}.mp4`,
      },
      mediaInfo: {
        fileName: `${sample.id}.mp4`,
        durationSeconds: sample.durationSeconds,
        channelTitle: 'PreScan Test Suite',
        format: 'Preset Audio Stream',
        storagePath: undefined,
      } as any,
      ingestionJobId: jobId,
      progressPercent: 5,
      currentStepMessage: 'Queued test sample analysis...',
      overallRisk: 'INSUFFICIENT_DATA',
      initiatedById: user.id,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Tag the scan object for sample pipeline
    (initialScan as any).testSampleId = sampleId;

    // Launch pipeline
    ScanPipelineService.startPipeline(scanId, orgId, user.id).catch((err) => {
      console.error('ScanPipeline sample startup error:', err);
    });

    return res.status(201).json({
      success: true,
      scan: initialScan,
      job: initialJob,
    });
  } catch (err: any) {
    console.error('Sample ingestion error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to start sample test scan.' });
  }
});

/**
 * GET /api/scans
 * List scans for the active workspace with pagination and filters
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const orgId = (req.query.organizationId as string) || getTargetOrganizationId(req);

    if (!orgId) {
      return res.status(400).json({ error: 'Workspace organization context is required.' });
    }

    const membership = db.findMembership(orgId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this workspace.' });
    }

    const status = req.query.status as string;
    const search = req.query.search as string;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const { scans, total } = db.findScansByOrg(orgId, { status, search, limit, offset });

    const enrichedScans = scans.map((scan) => {
      const initiator = scan.initiatedById ? db.findUserById(scan.initiatedById) : undefined;
      return {
        ...scan,
        initiator: initiator
          ? { id: initiator.id, displayName: initiator.displayName, fullName: initiator.fullName, avatarUrl: initiator.avatarUrl, email: initiator.email }
          : undefined,
      };
    });

    return res.json({
      scans: enrichedScans,
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('List scans error:', err);
    return res.status(500).json({ error: 'Failed to retrieve workspace scans.' });
  }
});

/**
 * GET /api/scans/:id
 * Retrieve single scan and its ingestion job status
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    // Verify tenant membership
    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this scan record.' });
    }

    const job = scan.ingestionJobId ? db.findIngestionJobById(scan.ingestionJobId) : undefined;

    return res.json({
      scan,
      job,
    });
  } catch (err: any) {
    console.error('Get scan error:', err);
    return res.status(500).json({ error: 'Failed to fetch scan details.' });
  }
});

/**
 * GET /api/scans/:id/logs
 * Retrieve ingestion job logs for real-time progress streaming
 */
router.get('/:id/logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const job = scan.ingestionJobId ? db.findIngestionJobById(scan.ingestionJobId) : undefined;

    return res.json({
      scanStatus: scan.status,
      jobStatus: job?.status || scan.status,
      progressPercent: job?.progressPercent ?? scan.progressPercent,
      currentStep: job?.currentStep || scan.currentStepMessage || '',
      logs: job?.logs || [],
      errorDetails: job?.errorDetails || scan.errorMessage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch ingestion logs.' });
  }
});

/**
 * POST /api/scans/:id/cancel
 * Cancel ongoing ingestion
 */
router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const success = MediaIngestionService.cancelIngestion(scanId, scan.organizationId);
    if (!success) {
      return res.status(400).json({ error: 'Scan cannot be cancelled in its current state.' });
    }

    return res.json({ success: true, message: 'Ingestion cancelled.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to cancel scan ingestion.' });
  }
});

/**
 * DELETE /api/scans/:id
 * Delete scan record and clean up associated files
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const success = MediaIngestionService.deleteScan(scanId, scan.organizationId);

    // Audit log
    db.createAuditLog({
      id: `audit_${Date.now()}`,
      organizationId: scan.organizationId,
      actorUserId: user.id,
      action: 'SCAN_DELETED',
      targetResourceType: 'SCAN',
      targetResourceId: scanId,
      metadataJson: JSON.stringify({ title: scan.title }),
      createdAt: new Date().toISOString(),
    });

    return res.json({ success, message: 'Scan deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete scan.' });
  }
});

/**
 * POST /api/scans/:id/retry
 * Retry a failed or incomplete scan through the unified pipeline
 */
router.post('/:id/retry', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    // Verify workspace membership
    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this workspace scan.' });
    }

    if (scan.attempts && scan.attempts >= 3) {
      return res.status(400).json({
        error: 'Maximum retry limit (3 attempts) reached for this scan.',
        code: 'MAX_RETRIES_REACHED',
      });
    }

    const updatedScan = await ScanPipelineService.startPipeline(scanId, scan.organizationId, user.id);

    return res.json({
      success: true,
      scan: updatedScan,
    });
  } catch (err: any) {
    console.error('Retry scan error:', err);
    return res.status(400).json({
      error: err?.message || 'Failed to retry scan.',
    });
  }
});

/**
 * POST /api/scans/:id/analyze
 * Trigger or resume PreScan AI analysis on scan
 */
router.post('/:id/analyze', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    // Verify workspace membership
    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied to this workspace scan.' });
    }

    const updatedScan = await ScanPipelineService.startPipeline(
      scanId,
      scan.organizationId,
      user.id
    );

    return res.json({
      success: true,
      scan: updatedScan,
    });
  } catch (err: any) {
    console.error('Start analysis error:', err);
    return res.status(400).json({
      error: err?.message || 'Failed to initiate PreScan analysis.',
    });
  }
});

/**
 * GET /api/scans/:id/analysis
 * Get analysis job status and progress logs for real-time tracking
 */
router.get('/:id/analysis', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const job = db.findLatestAnalysisJobByScanId(scanId);

    return res.json({
      scan,
      job: job || null,
      status: job?.status || scan.status,
      progressPercent: job?.progressPercent ?? scan.progressPercent,
      currentStep: job?.currentStep || scan.currentStepMessage || '',
      logs: job?.logs || [],
      errorDetails: job?.errorMessage || scan.errorMessage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch analysis job status.' });
  }
});

/**
 * GET /api/scans/:id/report
 * Retrieve persisted PreScan V1 report and transcript for scan
 */
router.get('/:id/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const dbReport = db.findPreScanReportByScanId(scanId);
    const dbTranscript = db.findTranscriptByScanId(scanId);
    const dbReviews = db.findFindingReviewsByScanId(scanId);

    if (!dbReport) {
      return res.status(404).json({
        error: 'PreScan report not found. Analysis may still be in progress or failed.',
        scan,
        report: null,
        reviews: [],
      });
    }

    // Enrich reviews with user details for team review persistence display
    const enrichedReviews = dbReviews.map((rev) => {
      const reviewer = rev.reviewedByUserId ? db.findUserById(rev.reviewedByUserId) : undefined;
      return {
        ...rev,
        reviewerName: reviewer ? (reviewer.displayName || reviewer.fullName || reviewer.email) : undefined,
      };
    });

    return res.json({
      scan,
      report: dbReport.report,
      transcript: dbTranscript || null,
      reviews: enrichedReviews,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve PreScan report.' });
  }
});

/**
 * GET /api/scans/:id/reviews
 * Retrieve review state & creator notes for all findings in a scan
 */
router.get('/:id/reviews', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const reviews = db.findFindingReviewsByScanId(scanId);
    const enrichedReviews = reviews.map((rev) => {
      const reviewer = rev.reviewedByUserId ? db.findUserById(rev.reviewedByUserId) : undefined;
      return {
        ...rev,
        reviewerName: reviewer ? (reviewer.displayName || reviewer.fullName || reviewer.email) : undefined,
      };
    });

    return res.json({ reviews: enrichedReviews });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch finding reviews.' });
  }
});

/**
 * PUT /api/scans/:id/reviews/:findingId
 * Update creator review status and notes for a specific finding (workspace isolated)
 */
router.put('/:id/reviews/:findingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { id: scanId, findingId } = req.params;
    const { reviewStatus, creatorNote } = req.body;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    // Strict workspace membership authorization check (IDOR Protection)
    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied to update finding review for this workspace scan.' });
    }

    const validStatuses = ['OPEN', 'REVIEWED', 'NEEDS_EDIT', 'NOT_APPLICABLE'];
    if (reviewStatus && !validStatuses.includes(reviewStatus)) {
      return res.status(400).json({ error: `Invalid review status. Allowed: ${validStatuses.join(', ')}` });
    }

    // XSS Sanitization helper for creatorNote text
    const sanitizedNote = typeof creatorNote === 'string'
      ? creatorNote.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()
      : undefined;

    const updatedReview = db.upsertFindingReview({
      scanId,
      findingId,
      organizationId: scan.organizationId,
      reviewStatus: reviewStatus || 'REVIEWED',
      creatorNote: sanitizedNote,
      reviewedByUserId: user.id,
    });

    // Record audit log
    db.createAuditLog({
      id: `audit_${Date.now()}`,
      organizationId: scan.organizationId,
      actorUserId: user.id,
      action: 'FINDING_REVIEWED',
      targetResourceType: 'SCAN_FINDING',
      targetResourceId: `${scanId}_${findingId}`,
      metadataJson: JSON.stringify({ reviewStatus: updatedReview.reviewStatus, noteLength: sanitizedNote?.length || 0 }),
      createdAt: new Date().toISOString(),
    });

    const reviewer = db.findUserById(user.id);
    const responsePayload = {
      ...updatedReview,
      reviewerName: reviewer ? (reviewer.displayName || reviewer.fullName || reviewer.email) : undefined,
    };

    return res.json({
      success: true,
      review: responsePayload,
    });
  } catch (err: any) {
    console.error('Update finding review error:', err);
    return res.status(500).json({ error: 'Failed to update finding review state.' });
  }
});

/**
 * GET /api/scans/:id/transcript
 * Retrieve timestamped transcript for scan
 */
router.get('/:id/transcript', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const scanId = req.params.id;

    const scan = db.findScanById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found.' });
    }

    const membership = db.findMembership(scan.organizationId, user.id);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const dbTranscript = db.findTranscriptByScanId(scanId);
    if (!dbTranscript) {
      return res.status(404).json({ error: 'Transcript not available for this scan.' });
    }

    return res.json({
      transcript: dbTranscript,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve transcript.' });
  }
});

export default router;
