import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { db, DbScan, DbIngestionJob, DbVideo } from '../db';
import { generateId } from '../auth';

// Base upload storage root partitioned by tenant organizations
const UPLOADS_ROOT = path.join(process.cwd(), '.data', 'uploads');

// Ensure base upload directory exists
if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

// Supported upload formats
export const SUPPORTED_MIME_TYPES: Record<string, { type: 'video' | 'audio'; ext: string; label: string }> = {
  'video/mp4': { type: 'video', ext: '.mp4', label: 'MP4 Video' },
  'video/quicktime': { type: 'video', ext: '.mov', label: 'QuickTime Video' },
  'video/webm': { type: 'video', ext: '.webm', label: 'WebM Video' },
  'video/x-matroska': { type: 'video', ext: '.mkv', label: 'Matroska Video' },
  'video/mpeg': { type: 'video', ext: '.mpeg', label: 'MPEG Video' },
  'audio/mpeg': { type: 'audio', ext: '.mp3', label: 'MP3 Audio' },
  'audio/mp3': { type: 'audio', ext: '.mp3', label: 'MP3 Audio' },
  'audio/wav': { type: 'audio', ext: '.wav', label: 'WAV Audio' },
  'audio/x-wav': { type: 'audio', ext: '.wav', label: 'WAV Audio' },
  'audio/aac': { type: 'audio', ext: '.aac', label: 'AAC Audio' },
  'audio/mp4': { type: 'audio', ext: '.m4a', label: 'M4A Audio' },
  'audio/x-m4a': { type: 'audio', ext: '.m4a', label: 'M4A Audio' },
  'audio/ogg': { type: 'audio', ext: '.ogg', label: 'OGG Audio' },
  'audio/flac': { type: 'audio', ext: '.flac', label: 'FLAC Audio' },
};

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit

// Disallowed IP patterns / SSRF Protection
const SSRF_BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.google.com',
];

export interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  normalizedUrl?: string;
  error?: string;
}

import { YouTubeMetadataService } from './youtubeMetadata.service';

export interface ExtractedYouTubeMetadata {
  title: string;
  authorName: string;
  thumbnailUrl: string;
  providerUrl: string;
  videoId: string;
  description?: string;
  tags?: string[];
  tagsCount?: number;
  tagsUnavailable?: boolean;
  channelId?: string;
  publishedAt?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  category?: string;
  regionsAllowed?: string[];
}

export class MediaIngestionService {
  /**
   * SSRF-safe URL validator and YouTube Video ID Extractor
   */
  public static validateYouTubeUrl(inputUrl: string): YouTubeValidationResult {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return { isValid: false, error: 'YouTube URL cannot be empty.' };
    }

    const trimmed = inputUrl.trim();
    let parsed: URL;

    try {
      // Must have protocol
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        parsed = new URL(`https://${trimmed}`);
      } else {
        parsed = new URL(trimmed);
      }
    } catch {
      return { isValid: false, error: 'Invalid URL format.' };
    }

    // SSRF Check: Only http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL protocol must be HTTP or HTTPS.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check SSRF blocked hosts
    for (const blocked of SSRF_BLOCKED_HOSTNAMES) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return { isValid: false, error: 'Access to private or local network hosts is prohibited.' };
      }
    }

    // Check private IP ranges (10.x, 192.168.x, 172.16-31.x, 127.x)
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const b0 = parseInt(ipMatch[1], 10);
      const b1 = parseInt(ipMatch[2], 10);
      if (
        b0 === 10 ||
        b0 === 127 ||
        b0 === 0 ||
        (b0 === 172 && b1 >= 16 && b1 <= 31) ||
        (b0 === 192 && b1 === 168) ||
        (b0 === 169 && b1 === 254)
      ) {
        return { isValid: false, error: 'Access to private IP ranges is strictly prohibited.' };
      }
    }

    // Must be recognized YouTube domains
    const allowedDomains = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'];
    const isYouTubeHost = allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

    if (!isYouTubeHost) {
      return { isValid: false, error: 'URL must belong to youtube.com or youtu.be domain.' };
    }

    let videoId: string | null = null;

    // Pattern 1: youtu.be/VIDEO_ID
    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      const match = parsed.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        videoId = match[1];
      }
    }
    // Pattern 2: youtube.com/watch?v=VIDEO_ID
    else if (parsed.pathname === '/watch') {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        videoId = v;
      }
    }
    // Pattern 3: youtube.com/shorts/VIDEO_ID or /embed/VIDEO_ID or /v/VIDEO_ID
    else {
      const match = parsed.pathname.match(/^\/(?:shorts|embed|v|live)\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        videoId = match[1];
      }
    }

    if (!videoId) {
      return {
        isValid: false,
        error: 'Could not extract valid 11-character YouTube video ID from URL.',
      };
    }

    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      isValid: true,
      videoId,
      normalizedUrl,
    };
  }

  /**
   * Fetch complete real YouTube video metadata (tags, description, channel, date, duration)
   */
  public static async fetchYouTubeMetadata(videoId: string): Promise<ExtractedYouTubeMetadata | null> {
    try {
      const fullMeta = await YouTubeMetadataService.fetchCompleteMetadata(videoId);
      return {
        title: fullMeta.title,
        authorName: fullMeta.channelTitle,
        thumbnailUrl: fullMeta.thumbnailUrl,
        providerUrl: fullMeta.sourceUrl,
        videoId: fullMeta.videoId,
        description: fullMeta.description,
        tags: fullMeta.tags,
        tagsCount: fullMeta.tagsCount,
        tagsUnavailable: fullMeta.tagsUnavailable,
        channelId: fullMeta.channelId,
        publishedAt: fullMeta.publishedAt,
        durationSeconds: fullMeta.durationSeconds,
        durationFormatted: fullMeta.durationFormatted,
        category: fullMeta.category,
        regionsAllowed: fullMeta.regionsAllowed,
      };
    } catch (err) {
      console.warn(`YouTube metadata extraction failed for videoId ${videoId}:`, err);
    }

    // Safe fallback if extraction is unreachable or video is unlisted
    return {
      title: `YouTube Video (${videoId})`,
      authorName: 'YouTube Channel',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      providerUrl: 'https://www.youtube.com/',
      videoId,
      tags: [],
      tagsCount: 0,
      tagsUnavailable: true,
      durationSeconds: 0,
    };
  }

  /**
   * Resolve secure tenant storage path for a scan
   */
  public static getScanStorageDir(organizationId: string, scanId: string): string {
    const dir = path.join(UPLOADS_ROOT, 'organizations', organizationId, 'scans', scanId, 'source');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Create and start an Ingestion Pipeline for a File Upload
   */
  public static async createAndProcessFileUpload(params: {
    organizationId: string;
    userId: string;
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
      filename: string;
    };
    metadata: {
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      madeForKids?: boolean;
      language?: string;
      durationEstimate?: string;
      sensitivityLevel?: 'STANDARD' | 'STRICT';
      checkCommunityGuidelines?: boolean;
      checkAdvertiserSuitability?: boolean;
      checkCopyrightSignals?: boolean;
      checkMetadataIntegrity?: boolean;
    };
  }): Promise<{ scan: DbScan; job: DbIngestionJob }> {
    const { organizationId, userId, file, metadata } = params;

    const scanId = generateId('scan');
    const jobId = generateId('ingest');
    const now = new Date().toISOString();

    // Move uploaded file to tenant-isolated destination
    const targetDir = MediaIngestionService.getScanStorageDir(organizationId, scanId);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFilePath = path.join(targetDir, sanitizedFilename);

    try {
      fs.renameSync(file.path, finalFilePath);
    } catch {
      // Fallback copy if across partitions
      fs.copyFileSync(file.path, finalFilePath);
      fs.unlinkSync(file.path);
    }

    // Compute checksum
    let checksum = '';
    try {
      const fileBuffer = fs.readFileSync(finalFilePath);
      checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    } catch {
      checksum = crypto.randomBytes(8).toString('hex');
    }

    // Determine clean title
    const cleanTitle =
      metadata.title?.trim() ||
      file.originalname.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ').trim() ||
      'Uploaded Media Scan';

    // Create Ingestion Job Record
    const initialJob: DbIngestionJob = {
      id: jobId,
      scanId,
      organizationId,
      status: 'QUEUED',
      sourceType: 'file',
      sourceDetails: {
        fileName: file.originalname,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        storagePath: finalFilePath,
      },
      progressPercent: 5,
      currentStep: 'Media file queued for validation and container analysis',
      logs: [
        {
          timestamp: now,
          level: 'INFO',
          message: `File upload received: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    db.createIngestionJob(initialJob);

    // Create Scan Record
    const initialScan: DbScan = {
      id: scanId,
      organizationId,
      title: cleanTitle,
      description: metadata.description || '',
      category: metadata.category || 'entertainment',
      tags: metadata.tags || [],
      madeForKids: metadata.madeForKids ?? false,
      language: metadata.language || 'en',
      status: 'QUEUED',
      config: {
        checkCommunityGuidelines: metadata.checkCommunityGuidelines ?? true,
        checkAdvertiserSuitability: metadata.checkAdvertiserSuitability ?? true,
        checkCopyrightSignals: metadata.checkCopyrightSignals ?? true,
        checkMetadataIntegrity: metadata.checkMetadataIntegrity ?? true,
        targetCategory: metadata.category,
        targetLanguage: metadata.language,
        sensitivityLevel: metadata.sensitivityLevel || 'STANDARD',
      },
      sourceType: 'file',
      source: {
        type: 'file',
        fileName: file.originalname,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
      },
      mediaInfo: {
        fileName: file.originalname,
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        storagePath: finalFilePath,
        format: SUPPORTED_MIME_TYPES[file.mimetype]?.label || file.mimetype,
        checksum,
      },
      ingestionJobId: jobId,
      progressPercent: 5,
      currentStepMessage: 'Queued for media verification...',
      overallRisk: 'INSUFFICIENT_DATA',
      initiatedById: userId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    db.createScan(initialScan);

    // Log audit action
    db.createAuditLog({
      id: generateId('audit'),
      organizationId,
      actorUserId: userId,
      action: 'SCAN_INITIATED',
      targetResourceType: 'SCAN',
      targetResourceId: scanId,
      metadataJson: JSON.stringify({
        sourceType: 'file',
        fileName: file.originalname,
        fileSizeBytes: file.size,
      }),
      createdAt: now,
    });

    // Unified 9-stage pipeline is orchestrated by ScanPipelineService.startPipeline
    // (triggered by the route handler)

    return { scan: initialScan, job: initialJob };
  }

  /**
   * Create and start an Ingestion Pipeline for a YouTube URL
   */
  public static async createAndProcessYouTubeUrl(params: {
    organizationId: string;
    userId: string;
    url: string;
    metadata: {
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      madeForKids?: boolean;
      language?: string;
      durationEstimate?: string;
      sensitivityLevel?: 'STANDARD' | 'STRICT';
      checkCommunityGuidelines?: boolean;
      checkAdvertiserSuitability?: boolean;
      checkCopyrightSignals?: boolean;
      checkMetadataIntegrity?: boolean;
    };
  }): Promise<{ scan: DbScan; job: DbIngestionJob }> {
    const { organizationId, userId, url, metadata } = params;

    // Validate YouTube URL
    const validation = MediaIngestionService.validateYouTubeUrl(url);
    if (!validation.isValid || !validation.videoId) {
      throw new Error(validation.error || 'Invalid YouTube URL provided.');
    }

    const videoId = validation.videoId;
    const scanId = generateId('scan');
    const jobId = generateId('ingest');
    const now = new Date().toISOString();

    // Fetch oEmbed metadata in parallel
    const fetchedMeta = await MediaIngestionService.fetchYouTubeMetadata(videoId);

    const title =
      metadata.title?.trim() ||
      fetchedMeta?.title ||
      `YouTube Video Review (${videoId})`;

    const thumbnailUrl =
      fetchedMeta?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Create Ingestion Job Record
    const initialJob: DbIngestionJob = {
      id: jobId,
      scanId,
      organizationId,
      status: 'QUEUED',
      sourceType: 'youtube_url',
      sourceDetails: {
        youtubeUrl: validation.normalizedUrl,
        youtubeVideoId: videoId,
      },
      progressPercent: 10,
      currentStep: 'Validating YouTube URL structure and resolving video metadata',
      logs: [
        {
          timestamp: now,
          level: 'INFO',
          message: `YouTube URL accepted: ${validation.normalizedUrl}`,
        },
        {
          timestamp: now,
          level: 'SUCCESS',
          message: `SSRF host verification passed: ${validation.videoId}`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    db.createIngestionJob(initialJob);

    // Create Scan Record
    const initialScan: DbScan = {
      id: scanId,
      organizationId,
      title,
      description: metadata.description || fetchedMeta?.description || '',
      category: metadata.category || fetchedMeta?.category || 'entertainment',
      tags: (metadata.tags && metadata.tags.length > 0) ? metadata.tags : (fetchedMeta?.tags || []),
      madeForKids: metadata.madeForKids ?? false,
      language: metadata.language || 'en',
      status: 'QUEUED',
      config: {
        checkCommunityGuidelines: metadata.checkCommunityGuidelines ?? true,
        checkAdvertiserSuitability: metadata.checkAdvertiserSuitability ?? true,
        checkCopyrightSignals: metadata.checkCopyrightSignals ?? true,
        checkMetadataIntegrity: metadata.checkMetadataIntegrity ?? true,
        targetCategory: metadata.category || fetchedMeta?.category,
        targetLanguage: metadata.language,
        sensitivityLevel: metadata.sensitivityLevel || 'STANDARD',
      },
      sourceType: 'youtube_url',
      source: {
        type: 'youtube_url',
        url: validation.normalizedUrl,
        videoId,
      },
      mediaInfo: {
        youtubeVideoId: videoId,
        youtubeUrl: validation.normalizedUrl,
        thumbnailUrl,
        channelTitle: fetchedMeta?.authorName || 'YouTube Creator',
        channelId: fetchedMeta?.channelId,
        durationSeconds: fetchedMeta?.durationSeconds,
        format: 'YouTube Stream',
        publishedAt: fetchedMeta?.publishedAt,
        category: fetchedMeta?.category,
        tagsUnavailable: fetchedMeta?.tagsUnavailable,
      },
      ingestionJobId: jobId,
      progressPercent: 10,
      currentStepMessage: 'Queued for YouTube metadata extraction...',
      overallRisk: 'INSUFFICIENT_DATA',
      initiatedById: userId,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    db.createScan(initialScan);

    // Log audit action
    db.createAuditLog({
      id: generateId('audit'),
      organizationId,
      actorUserId: userId,
      action: 'SCAN_INITIATED',
      targetResourceType: 'SCAN',
      targetResourceId: scanId,
      metadataJson: JSON.stringify({
        sourceType: 'youtube_url',
        videoId,
        url: validation.normalizedUrl,
      }),
      createdAt: now,
    });

    // Unified 9-stage pipeline is orchestrated by ScanPipelineService.startPipeline
    // (triggered by the route handler)

    return { scan: initialScan, job: initialJob };
  }

  /**
   * Background Worker Simulation for File Ingestion Pipeline
   * Moves through: QUEUED -> VALIDATING -> INGESTING -> READY_FOR_ANALYSIS
   */
  private static async runFileIngestionPipeline(
    scanId: string,
    jobId: string,
    file: { originalname: string; mimetype: string; size: number },
    finalFilePath: string
  ) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: VALIDATING (after 500ms)
      await sleep(600);
      let job = db.findIngestionJobById(jobId);
      if (!job || job.status === 'CANCELLED') return;

      db.updateIngestionJob(jobId, {
        status: 'VALIDATING',
        progressPercent: 30,
        currentStep: 'Validating media container format and stream integrity',
      });
      db.addIngestionLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `MIME type validated: ${file.mimetype} (${SUPPORTED_MIME_TYPES[file.mimetype]?.label || 'Media Stream'})`,
      });
      db.updateScan(scanId, {
        status: 'VALIDATING',
        progressPercent: 30,
        currentStepMessage: 'Validating media headers and container format...',
      });

      // Step 2: INGESTING (after 800ms)
      await sleep(900);
      job = db.findIngestionJobById(jobId);
      if (!job || job.status === 'CANCELLED') return;

      db.updateIngestionJob(jobId, {
        status: 'INGESTING',
        progressPercent: 70,
        currentStep: 'Archiving media in workspace tenant partition and preparing audio streams',
      });
      db.addIngestionLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Audio track extracted and partitioned securely for workspace analysis`,
      });
      db.updateScan(scanId, {
        status: 'INGESTING',
        progressPercent: 70,
        currentStepMessage: 'Partitioning media in secure storage and indexing tracks...',
      });

      // Step 3: READY_FOR_ANALYSIS (after 800ms)
      await sleep(800);
      job = db.findIngestionJobById(jobId);
      if (!job || job.status === 'CANCELLED') return;

      const completionTime = new Date().toISOString();
      db.updateIngestionJob(jobId, {
        status: 'READY_FOR_ANALYSIS',
        progressPercent: 100,
        currentStep: 'Media ingestion complete. Source media ready for AI policy evaluation.',
      });
      db.addIngestionLog(jobId, {
        timestamp: completionTime,
        level: 'SUCCESS',
        message: `Ingestion verified. Ready for Gemini multi-modal scanning.`,
      });

      db.updateScan(scanId, {
        status: 'READY_FOR_ANALYSIS',
        progressPercent: 100,
        currentStepMessage: 'Media successfully ingested and ready for analysis.',
        completedAt: completionTime,
      });
    } catch (err: any) {
      console.error(`File Ingestion error for scan ${scanId}:`, err);
      db.updateIngestionJob(jobId, {
        status: 'FAILED',
        errorDetails: err?.message || 'Media validation failed unexpectedly.',
      });
      db.addIngestionLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: `Ingestion failed: ${err?.message || 'Unknown processing failure'}`,
      });
      db.updateScan(scanId, {
        status: 'FAILED',
        errorMessage: err?.message || 'Media ingestion failed.',
      });
    }
  }

  /**
   * Background Worker Simulation for YouTube Ingestion Pipeline
   * Moves through: QUEUED -> VALIDATING -> INGESTING -> READY_FOR_ANALYSIS
   */
  private static async runYouTubeIngestionPipeline(
    scanId: string,
    jobId: string,
    videoId: string,
    metadata: ExtractedYouTubeMetadata | null
  ) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Step 1: VALIDATING (after 500ms)
      await sleep(600);
      let job = db.findIngestionJobById(jobId);
      if (!job || job.status === 'CANCELLED') return;

      db.updateIngestionJob(jobId, {
        status: 'VALIDATING',
        progressPercent: 35,
        currentStep: 'Verifying video stream availability and YouTube channel attribution',
      });
      db.addIngestionLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Attributed to channel: ${metadata?.authorName || 'YouTube Creator'}`,
      });
      db.updateScan(scanId, {
        status: 'VALIDATING',
        progressPercent: 35,
        currentStepMessage: 'Verifying video link availability and channel attribution...',
      });

      // Step 2: INGESTING (after 900ms)
      await sleep(900);
      job = db.findIngestionJobById(jobId);
      if (!job || job.status === 'CANCELLED') return;

      db.updateIngestionJob(jobId, {
        status: 'INGESTING',
        progressPercent: 75,
        currentStep: 'Extracting public audio stream and thumbnail assets from YouTube source',
      });

      // Phase 05.1: Pass public YouTube URL directly to Gemini instead of downloading via yt-dlp
      const currentScan = db.findScanById(scanId);
      if (currentScan) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        db.updateScan(scanId, {
          mediaInfo: {
            ...currentScan.mediaInfo,
            youtubeUrl,
            format: 'Public YouTube Video URL',
          },
        });
        db.addIngestionLog(jobId, {
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          message: `Public YouTube URL prepared for direct Gemini video analysis (${youtubeUrl})`,
        });
      }

      db.addIngestionLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Thumbnail asset resolved: ${metadata?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}`,
      });
      db.updateScan(scanId, {
        status: 'INGESTING',
        progressPercent: 75,
        currentStepMessage: 'Extracting video thumbnails and media stream...',
      });

      // Step 3: READY_FOR_ANALYSIS (after 800ms)
      await sleep(800);
      job = db.findIngestionJobById(jobId);
      if (!job || job.status === 'CANCELLED') return;

      const completionTime = new Date().toISOString();
      db.updateIngestionJob(jobId, {
        status: 'READY_FOR_ANALYSIS',
        progressPercent: 100,
        currentStep: 'YouTube source ingestion complete. Video payload prepared for policy analysis.',
      });
      db.addIngestionLog(jobId, {
        timestamp: completionTime,
        level: 'SUCCESS',
        message: `Source link verified and cached. Ready for Gemini multi-modal scanning.`,
      });

      db.updateScan(scanId, {
        status: 'READY_FOR_ANALYSIS',
        progressPercent: 100,
        currentStepMessage: 'YouTube media successfully ingested and ready for analysis.',
        completedAt: completionTime,
      });
    } catch (err: any) {
      console.error(`YouTube Ingestion error for scan ${scanId}:`, err);
      db.updateIngestionJob(jobId, {
        status: 'FAILED',
        errorDetails: err?.message || 'YouTube link ingestion failed unexpectedly.',
      });
      db.addIngestionLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message: `Ingestion failed: ${err?.message || 'Unknown processing failure'}`,
      });
      db.updateScan(scanId, {
        status: 'FAILED',
        errorMessage: err?.message || 'YouTube link ingestion failed.',
      });
    }
  }

  /**
   * Cancel in-progress ingestion
   */
  public static cancelIngestion(scanId: string, organizationId: string): boolean {
    const scan = db.findScanById(scanId);
    if (!scan || scan.organizationId !== organizationId) return false;

    if (
      scan.status === 'READY_FOR_ANALYSIS' ||
      scan.status === 'COMPLETED' ||
      scan.status === 'FAILED'
    ) {
      return false;
    }

    db.updateScan(scanId, {
      status: 'CANCELLED',
      errorMessage: 'Ingestion cancelled by user.',
    });

    if (scan.ingestionJobId) {
      db.updateIngestionJob(scan.ingestionJobId, {
        status: 'CANCELLED',
        currentStep: 'Ingestion cancelled by user.',
      });
      db.addIngestionLog(scan.ingestionJobId, {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: 'Ingestion operation was manually cancelled.',
      });
    }

    return true;
  }

  /**
   * Delete scan and clean up storage
   */
  public static deleteScan(scanId: string, organizationId: string): boolean {
    const scan = db.findScanById(scanId);
    if (!scan || scan.organizationId !== organizationId) return false;

    // Remove files on disk if present
    const dir = path.join(UPLOADS_ROOT, 'organizations', organizationId, 'scans', scanId);
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Could not clean up directory ${dir}:`, err);
    }

    return db.deleteScan(scanId, organizationId);
  }
}
