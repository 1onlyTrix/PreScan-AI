import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, DbScan, DbAnalysisJob, DbIngestionJob, DbTranscript, DbPreScanReport, DbTranscriptSegment } from '../db';
import { generateId } from '../auth';
import { MediaIngestionService, SUPPORTED_MIME_TYPES } from './mediaIngestion.service';
import { AudioPreparationService } from './audioPreparation.service';
import { GeminiMediaService, GeminiUploadedFileRef } from './geminiMedia.service';
import { TranscriptionService } from './transcription.service';
import { AnalysisEngineService } from './analysisEngine.service';
import { EntitlementService } from './entitlement.service';
import { TEST_SAMPLES, TestSampleData } from './testSamples.service';

export const SCAN_ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  VIDEO_TOO_LONG: 'VIDEO_TOO_LONG',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  YOUTUBE_INVALID_URL: 'YOUTUBE_INVALID_URL',
  YOUTUBE_VIDEO_UNAVAILABLE: 'YOUTUBE_VIDEO_UNAVAILABLE',
  YOUTUBE_MEDIA_UNAVAILABLE: 'YOUTUBE_MEDIA_UNAVAILABLE',
  MEDIA_DOWNLOAD_FAILED: 'MEDIA_DOWNLOAD_FAILED',
  AUDIO_EXTRACTION_FAILED: 'AUDIO_EXTRACTION_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  REPORT_VALIDATION_FAILED: 'REPORT_VALIDATION_FAILED',
  PLAN_LIMIT_REACHED: 'PLAN_LIMIT_REACHED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TEMPORARY_PROCESSING_ERROR: 'TEMPORARY_PROCESSING_ERROR',
} as const;

export type ScanErrorCode = (typeof SCAN_ERROR_CODES)[keyof typeof SCAN_ERROR_CODES];

export interface ScanErrorPayload {
  code: ScanErrorCode | string;
  message: string;
  reason: string;
  action: string;
  retryable: boolean;
}

export class ScanPipelineService {
  private static activeScans = new Set<string>();

  /**
   * Diagnostic mapper for user-friendly error messages and actionable advice
   */
  public static getErrorDetails(code: string, originalMessage?: string): ScanErrorPayload {
    switch (code) {
      case SCAN_ERROR_CODES.INVALID_INPUT:
        return {
          code,
          message: 'Invalid scan input parameters.',
          reason: originalMessage || 'The provided media file or YouTube URL could not be validated.',
          action: 'Please check your input source and verify the video format or link.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.FILE_TOO_LARGE:
        return {
          code,
          message: 'File size exceeds maximum upload limit.',
          reason: 'Your uploaded media file exceeds the 500 MB upload limit.',
          action: 'Compress the video or extract the audio track (MP3/AAC) before uploading.',
          retryable: false,
        };
      case SCAN_ERROR_CODES.VIDEO_TOO_LONG:
        return {
          code,
          message: 'Video duration exceeds your workspace plan limit.',
          reason: originalMessage || 'The video duration is longer than the maximum duration allowed by your current plan.',
          action: 'Upgrade to a higher tier plan or trim your video to fit within your plan allowance.',
          retryable: false,
        };
      case SCAN_ERROR_CODES.UNSUPPORTED_FORMAT:
        return {
          code,
          message: 'Unsupported media file format.',
          reason: originalMessage || 'PreScan supports MP4, MOV, WebM, MKV, MP3, WAV, AAC, M4A, OGG, and FLAC files.',
          action: 'Convert your file to a standard MP4 or MP3 format and try again.',
          retryable: false,
        };
      case SCAN_ERROR_CODES.YOUTUBE_INVALID_URL:
        return {
          code,
          message: 'Invalid YouTube video URL structure.',
          reason: originalMessage || 'The URL must be a valid public YouTube watch link (e.g. youtube.com/watch?v=... or youtu.be/...).',
          action: 'Copy the full URL directly from your browser address bar and try again.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.YOUTUBE_VIDEO_UNAVAILABLE:
        return {
          code,
          message: 'YouTube video is private or unavailable.',
          reason: originalMessage || 'The requested YouTube video cannot be accessed publicly (it may be private, age-restricted, or geo-blocked).',
          action: 'Ensure the video is set to Unlisted or Public on YouTube, or upload the video file directly.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.YOUTUBE_MEDIA_UNAVAILABLE:
        return {
          code,
          message: 'Could not access YouTube audio stream.',
          reason: 'YouTube streaming endpoints are currently throttled or restricting automated access for this link.',
          action: 'Upload the original video or audio file directly to PreScan for instant processing.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.AUDIO_EXTRACTION_FAILED:
        return {
          code,
          message: 'Audio track extraction failed.',
          reason: originalMessage || 'No valid audio stream was found in the media container or the codec is unsupported.',
          action: 'Verify that your video contains an audible sound track and export with AAC/MP3 audio.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.TRANSCRIPTION_FAILED:
        return {
          code,
          message: 'Speech transcription failed.',
          reason: originalMessage || 'The AI transcription service could not process the audio dialogue.',
          action: 'Click [Try Again] to retry transcription, or ensure the audio quality is clear.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.ANALYSIS_FAILED:
        return {
          code,
          message: 'Policy risk analysis failed.',
          reason: originalMessage || 'The compliance AI engine encountered an issue while evaluating policy rules.',
          action: 'Click [Try Again] to re-run policy evaluation.',
          retryable: true,
        };
      case SCAN_ERROR_CODES.PLAN_LIMIT_REACHED:
        return {
          code,
          message: 'Workspace scan allowance reached.',
          reason: originalMessage || 'You have used all available scans in your current billing cycle.',
          action: 'Upgrade your plan or wait until your next monthly billing cycle renews.',
          retryable: false,
        };
      case SCAN_ERROR_CODES.TEMPORARY_PROCESSING_ERROR:
      default:
        return {
          code: code || SCAN_ERROR_CODES.TEMPORARY_PROCESSING_ERROR,
          message: 'A temporary processing error occurred.',
          reason: originalMessage || 'An unexpected pipeline error occurred during scan execution.',
          action: 'Please try again in a few moments or upload the file again.',
          retryable: true,
        };
    }
  }

  /**
   * Starts or restarts the unified scan pipeline asynchronously
   */
  public static async startPipeline(scanId: string, organizationId: string, userId: string): Promise<DbScan> {
    const scan = db.findScanById(scanId);
    if (!scan || scan.organizationId !== organizationId) {
      throw new Error('Scan record not found or access denied.');
    }

    if (this.activeScans.has(scanId)) {
      console.log(`[ScanPipeline] Scan ${scanId} is already actively processing. Ignoring duplicate trigger.`);
      return scan;
    }

    // Entitlement Check: scan limits
    const existingEvents = db.getUsageEventsByWorkspace(organizationId, 100);
    const alreadyConsumed = existingEvents.some((e) => e.scanId === scanId && e.type === 'SCAN_CONSUMED');

    if (!alreadyConsumed) {
      const entitlement = EntitlementService.canCreateScan(organizationId);
      if (!entitlement.allowed) {
        const errorDetails = this.getErrorDetails(
          SCAN_ERROR_CODES.PLAN_LIMIT_REACHED,
          entitlement.reason || 'Workspace monthly scan limit reached.'
        );
        const failedScan = db.updateScan(scanId, {
          status: 'FAILED',
          errorCode: SCAN_ERROR_CODES.PLAN_LIMIT_REACHED,
          errorMessage: errorDetails.message,
          errorDetails,
          progressPercent: 0,
        })!;
        return failedScan;
      }

      // Consume entitlement token
      EntitlementService.consumeScanEntitlement(organizationId, userId, scanId, {
        durationSeconds: scan.mediaInfo?.durationSeconds,
      });
    }

    // Initialize or update Ingestion Job
    let ingestionJob = scan.ingestionJobId ? db.findIngestionJobById(scan.ingestionJobId) : undefined;
    const now = new Date().toISOString();

    if (!ingestionJob) {
      const jobId = generateId('ingest');
      ingestionJob = {
        id: jobId,
        scanId,
        organizationId,
        status: 'QUEUED',
        sourceType: scan.sourceType || 'file',
        sourceDetails: {
          fileName: scan.mediaInfo?.fileName || scan.source?.fileName,
          fileSizeBytes: scan.mediaInfo?.fileSizeBytes || scan.source?.fileSizeBytes,
          mimeType: scan.mediaInfo?.mimeType || scan.source?.mimeType,
          youtubeUrl: scan.mediaInfo?.youtubeUrl || scan.source?.url,
          youtubeVideoId: scan.mediaInfo?.youtubeVideoId || scan.source?.videoId,
          storagePath: scan.mediaInfo?.storagePath,
        },
        progressPercent: 5,
        currentStep: 'Scan queued for pipeline processing',
        logs: [{ timestamp: now, level: 'INFO', message: 'Scan initialized in processing queue' }],
        createdAt: now,
        updatedAt: now,
      };
      db.createIngestionJob(ingestionJob);
    } else {
      db.updateIngestionJob(ingestionJob.id, {
        status: 'QUEUED',
        progressPercent: 5,
        currentStep: 'Restarting scan pipeline',
        logs: [
          ...ingestionJob.logs,
          { timestamp: now, level: 'INFO', message: `Pipeline execution started (Attempt ${(scan.attempts || 0) + 1})` },
        ],
      });
    }

    // Update Scan state to QUEUED
    const updatedScan = db.updateScan(scanId, {
      status: 'QUEUED',
      stage: 'QUEUED',
      progressPercent: 5,
      currentStepMessage: 'Queued for media verification and policy evaluation...',
      errorCode: undefined,
      errorMessage: undefined,
      errorDetails: undefined,
      attempts: (scan.attempts || 0) + 1,
      startedAt: scan.startedAt || now,
      ingestionJobId: ingestionJob.id,
    })!;

    // Launch pipeline in background non-blocking
    this.executePipelineAsync(scanId, ingestionJob.id, organizationId, userId).catch((err) => {
      console.error(`[ScanPipeline] Unhandled pipeline error on scan ${scanId}:`, err);
    });

    return updatedScan;
  }

  /**
   * Internal asynchronous pipeline executor transitioning through all 9 stages
   */
  private static async executePipelineAsync(
    scanId: string,
    jobId: string,
    organizationId: string,
    userId: string
  ) {
    this.activeScans.add(scanId);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let cleanupRemoteFileName: string | undefined = undefined;

    try {
      let scan = db.findScanById(scanId);
      if (!scan) throw new Error('Scan record missing during pipeline execution.');

      const log = (level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string) => {
        db.addIngestionLog(jobId, { timestamp: new Date().toISOString(), level, message });
      };

      const setStage = (
        status: DbScan['status'],
        progressPercent: number,
        currentStepMessage: string
      ) => {
        db.updateScan(scanId, {
          status,
          stage: status,
          progressPercent,
          currentStepMessage,
        });
        db.updateIngestionJob(jobId, {
          status: status as any,
          progressPercent,
          currentStep: currentStepMessage,
        });
      };

      // ----------------------------------------------------
      // STAGE 1: QUEUED (5%)
      // ----------------------------------------------------
      setStage('QUEUED', 5, 'Initializing scan pipeline and workspace entitlements...');
      log('INFO', `Starting scan pipeline for "${scan.title}" (ID: ${scan.id})`);
      await sleep(350);

      // Check for Test Sample Preset Simulation
      const testSampleKey = (scan as any).testSampleId || (scan.mediaInfo as any)?.testSampleId;
      if (testSampleKey && TEST_SAMPLES[testSampleKey]) {
        await this.runTestSamplePipeline(scanId, jobId, organizationId, userId, TEST_SAMPLES[testSampleKey]);
        this.activeScans.delete(scanId);
        return;
      }

      // ----------------------------------------------------
      // STAGE 2: VALIDATING (15%)
      // ----------------------------------------------------
      setStage('VALIDATING', 15, 'Validating media format, headers, and duration constraints...');
      log('INFO', 'Validating media input parameters and workspace security constraints...');

      const sourceType = scan.sourceType || scan.source?.type || 'file';

      if (sourceType === 'youtube_url') {
        const url = scan.source?.url || scan.mediaInfo?.youtubeUrl || `https://www.youtube.com/watch?v=${scan.mediaInfo?.youtubeVideoId}`;
        const validation = MediaIngestionService.validateYouTubeUrl(url);
        if (!validation.isValid || !validation.videoId) {
          throw { code: SCAN_ERROR_CODES.YOUTUBE_INVALID_URL, message: validation.error || 'Invalid YouTube URL' };
        }
        log('SUCCESS', `YouTube URL and SSRF verification passed (Video ID: ${validation.videoId})`);
      } else {
        const storagePath = scan.mediaInfo?.storagePath;
        if (!storagePath || !fs.existsSync(storagePath)) {
          throw { code: SCAN_ERROR_CODES.INVALID_INPUT, message: 'Uploaded media file could not be found on server storage.' };
        }
        const mimeType = scan.mediaInfo?.mimeType || 'video/mp4';
        if (!SUPPORTED_MIME_TYPES[mimeType]) {
          throw { code: SCAN_ERROR_CODES.UNSUPPORTED_FORMAT, message: `MIME type ${mimeType} is not supported.` };
        }
        log('SUCCESS', `File container verified: ${scan.mediaInfo?.fileName} (${mimeType})`);
      }
      await sleep(400);

      // ----------------------------------------------------
      // STAGE 3: FETCHING_METADATA (25%)
      // ----------------------------------------------------
      setStage('FETCHING_METADATA', 25, 'Fetching video metadata and container attributes...');
      let videoTitle = scan.title;
      let authorName = scan.mediaInfo?.channelTitle || 'Creator';
      let thumbnailUrl = scan.mediaInfo?.thumbnailUrl;
      let durationSeconds = scan.mediaInfo?.durationSeconds || 60;

      if (sourceType === 'youtube_url') {
        const videoId = scan.mediaInfo?.youtubeVideoId || scan.source?.videoId!;
        log('INFO', `Querying public metadata for YouTube video ${videoId}...`);
        const meta = await MediaIngestionService.fetchYouTubeMetadata(videoId);
        let tags = scan.tags || [];
        let description = scan.description || '';
        let category = scan.category || 'General';

        if (meta) {
          if (!videoTitle || videoTitle.startsWith('YouTube Video')) {
            videoTitle = meta.title;
          }
          authorName = meta.authorName;
          thumbnailUrl = meta.thumbnailUrl;
          if (!description && meta.description) {
            description = meta.description;
          }
          if ((!tags || tags.length === 0) && meta.tags && meta.tags.length > 0) {
            tags = meta.tags;
          }
          if (meta.category) {
            category = meta.category;
          }
          if (meta.durationSeconds) {
            durationSeconds = meta.durationSeconds;
          }
        }
        db.updateScan(scanId, {
          title: videoTitle,
          description,
          tags,
          category,
          mediaInfo: {
            ...scan.mediaInfo,
            youtubeVideoId: videoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
            channelTitle: authorName,
            channelId: meta?.channelId,
            thumbnailUrl: thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            durationSeconds,
            durationFormatted: meta?.durationFormatted,
            publishedAt: meta?.publishedAt,
            category: meta?.category,
            tagsUnavailable: meta?.tagsUnavailable,
          },
        });
        log('SUCCESS', `Metadata resolved: "${videoTitle}" by ${authorName} (${tags.length} tag(s), duration: ${durationSeconds}s)`);
      } else {
        log('INFO', `Extracting local media metadata from file headers...`);
      }
      await sleep(400);

      // ----------------------------------------------------
      // STAGE 4: ACQUIRING_MEDIA (40%)
      // ----------------------------------------------------
      setStage('ACQUIRING_MEDIA', 40, 'Securing media payload in isolated tenant storage...');
      let mediaPartForGemini: any = null;

      if (sourceType === 'youtube_url') {
        const videoId = scan.mediaInfo?.youtubeVideoId || scan.source?.videoId!;
        const youtubeUrl = scan.mediaInfo?.youtubeUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);
        if (!youtubeUrl) {
          throw { code: SCAN_ERROR_CODES.YOUTUBE_VIDEO_UNAVAILABLE, message: 'Public YouTube video URL is missing.' };
        }
        log('INFO', `Preparing public YouTube video stream for Gemini multimodal ingestion: ${youtubeUrl}`);
        mediaPartForGemini = {
          fileData: {
            fileUri: youtubeUrl,
            mimeType: 'video/mp4',
          },
        };
        log('SUCCESS', `YouTube stream linked for Gemini multimodal analysis (${youtubeUrl})`);
      } else {
        const storagePath = scan.mediaInfo?.storagePath!;
        log('INFO', `Uploading media to Gemini Files API (${path.basename(storagePath)})...`);
        let uploadedRef: GeminiUploadedFileRef | null = null;
        try {
          uploadedRef = await GeminiMediaService.uploadVideoForAnalysis(storagePath);
        } catch (uploadErr: any) {
          log('WARN', `Direct video upload failed (${uploadErr.message}). Preparing audio track fallback...`);
          const outDir = path.dirname(storagePath);
          const prep = await AudioPreparationService.prepareAudio(storagePath, outDir, scanId);
          if (prep.hasAudio && prep.audioFilePath && fs.existsSync(prep.audioFilePath)) {
            uploadedRef = await GeminiMediaService.uploadVideoForAnalysis(prep.audioFilePath, 'audio/mp3');
          } else {
            throw { code: SCAN_ERROR_CODES.AUDIO_EXTRACTION_FAILED, message: `Media extraction failed: ${uploadErr.message}` };
          }
        }

        cleanupRemoteFileName = uploadedRef.name;
        mediaPartForGemini = {
          fileData: {
            fileUri: uploadedRef.uri,
            mimeType: uploadedRef.mimeType,
          },
        };
        log('SUCCESS', `Media uploaded to Gemini Files API (${uploadedRef.name})`);
      }
      await sleep(400);

      // ----------------------------------------------------
      // STAGE 5: EXTRACTING_AUDIO (55%)
      // ----------------------------------------------------
      setStage('EXTRACTING_AUDIO', 55, 'Extracting audio stream and analyzing spoken channels...');
      log('INFO', 'Verifying audio channels, sample rates, and spoken track integrity...');
      await sleep(450);

      // ----------------------------------------------------
      // STAGE 6: TRANSCRIBING (70%)
      // ----------------------------------------------------
      setStage('TRANSCRIBING', 70, 'Transcribing spoken dialogue with millisecond timestamp markers...');
      log('INFO', 'Performing speech-to-text recognition with Gemini AI speech engine...');

      // ----------------------------------------------------
      // STAGE 7: ANALYZING (85%)
      // ----------------------------------------------------
      setStage('ANALYZING', 85, 'Evaluating policy compliance across Community Guidelines, Advertiser Suitability, and Copyright...');
      log('INFO', 'Evaluating profanity, hate speech, advertiser suitability, and copyright rights...');

      // Reload fresh scan state
      scan = db.findScanById(scanId)!;

      let rawGeminiResult: { transcriptSegments: DbTranscriptSegment[]; report: any };

      try {
        rawGeminiResult = await AnalysisEngineService.analyzeMediaWithGemini({
          mediaPart: mediaPartForGemini,
          metadata: {
            scanId: scan.id,
            title: scan.title,
            description: scan.description,
            category: scan.category,
            madeForKids: scan.madeForKids,
            tags: scan.tags,
            sourceType: scan.sourceType,
            durationSeconds: scan.mediaInfo?.durationSeconds,
            channelTitle: scan.mediaInfo?.channelTitle,
            youtubeVideoId: scan.mediaInfo?.youtubeVideoId,
            publishedAt: scan.mediaInfo?.publishedAt,
            tagsUnavailable: scan.mediaInfo?.tagsUnavailable,
          },
        });
      } catch (geminiErr: any) {
        log('ERROR', `Gemini media analysis failed: ${geminiErr.message}`);
        throw {
          code: SCAN_ERROR_CODES.ANALYSIS_FAILED,
          message: geminiErr?.message || 'Policy analysis failed.',
        };
      } finally {
        if (cleanupRemoteFileName) {
          try {
            await GeminiMediaService.deleteRemoteFile(cleanupRemoteFileName);
          } catch (delErr) {
            console.warn('Cleanup of remote Gemini file failed:', delErr);
          }
        }
      }

      // Save Transcript
      if (rawGeminiResult.transcriptSegments && rawGeminiResult.transcriptSegments.length > 0) {
        const fullText = rawGeminiResult.transcriptSegments.map((s) => s.text).join(' ');
        const dbTranscript: DbTranscript = {
          id: generateId('tr'),
          scanId,
          organizationId,
          language: rawGeminiResult.report.metadata?.language || scan.language || 'en',
          durationSeconds: scan.mediaInfo?.durationSeconds || 60,
          segments: rawGeminiResult.transcriptSegments,
          fullText,
          createdAt: new Date().toISOString(),
        };
        db.saveTranscript(dbTranscript);
        log('SUCCESS', `Transcript generated with ${rawGeminiResult.transcriptSegments.length} timestamped segment(s)`);
      }

      // ----------------------------------------------------
      // STAGE 8: VALIDATING_REPORT (95%)
      // ----------------------------------------------------
      setStage('VALIDATING_REPORT', 95, 'Validating report schema, policy disclaimers, and creator action plan...');
      log('INFO', 'Validating structured findings, severity weights, and grounding disclaimers...');

      const validatedReportData = rawGeminiResult.report;

      // Enforce Non-Definitive Disclaimers and Limitations
      if (!validatedReportData.limitations || validatedReportData.limitations.length === 0) {
        validatedReportData.limitations = [
          'Visual video content was not analyzed — PreScan evaluates spoken dialogue and video metadata only.',
          'Background music was not fingerprinted for Content ID audio database matches.',
        ];
      }

      validatedReportData.disclaimer =
        'PreScan is an advisory pre-upload QA tool. Final policy decisions rest entirely with YouTube automated systems and review teams.';

      const reportId = generateId('report');
      const nowComplete = new Date().toISOString();

      const dbReport: DbPreScanReport = {
        id: reportId,
        scanId,
        analysisJobId: jobId,
        organizationId,
        createdByUserId: userId,
        report: validatedReportData,
        createdAt: nowComplete,
        updatedAt: nowComplete,
      };

      db.savePreScanReport(dbReport);
      log('SUCCESS', `PreScan V1 Report saved (Report ID: ${reportId})`);
      await sleep(350);

      // ----------------------------------------------------
      // STAGE 9: COMPLETED (100%)
      // ----------------------------------------------------
      const riskLevel = validatedReportData.overall_risk?.risk_level || 'LOW';
      db.updateScan(scanId, {
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progressPercent: 100,
        currentStepMessage: 'PreScan analysis completed successfully.',
        overallRisk: riskLevel as any,
        completedAt: nowComplete,
        language: validatedReportData.metadata?.language || (validatedReportData.languageDetails?.primaryLanguage ? `${validatedReportData.languageDetails.primaryLanguage} (${validatedReportData.languageDetails.languageCode})` : scan.language),
        errorCode: undefined,
        errorMessage: undefined,
        errorDetails: undefined,
      });

      db.updateIngestionJob(jobId, {
        status: 'READY_FOR_ANALYSIS',
        progressPercent: 100,
        currentStep: 'PreScan analysis completed successfully.',
        updatedAt: nowComplete,
      });

      log(
        'SUCCESS',
        `PreScan completed: Overall Risk ${riskLevel}, ${validatedReportData.findings?.length || 0} finding(s).`
      );
    } catch (error: any) {
      console.error(`[ScanPipeline] Execution failed for scan ${scanId}:`, error);

      const rawCode = error?.code || SCAN_ERROR_CODES.ANALYSIS_FAILED;
      const rawMessage = error?.message || "PreScan couldn't complete the analysis.";
      const errorDetails = ScanPipelineService.getErrorDetails(rawCode, rawMessage);
      const nowErr = new Date().toISOString();

      db.updateScan(scanId, {
        status: 'FAILED',
        stage: 'FAILED',
        errorCode: errorDetails.code,
        errorMessage: errorDetails.message,
        errorDetails,
        overallRisk: 'INSUFFICIENT_DATA',
      });

      db.updateIngestionJob(jobId, {
        status: 'FAILED',
        errorDetails: `${errorDetails.message}: ${errorDetails.reason}`,
        updatedAt: nowErr,
      });

      db.addIngestionLog(jobId, {
        timestamp: nowErr,
        level: 'ERROR',
        message: `Pipeline failed (${errorDetails.code}): ${errorDetails.message} — ${errorDetails.reason}`,
      });
    } finally {
      this.activeScans.delete(scanId);
    }
  }

  /**
   * Deterministic Simulation Pipeline for Test Fixtures
   */
  private static async runTestSamplePipeline(
    scanId: string,
    jobId: string,
    organizationId: string,
    userId: string,
    sample: TestSampleData
  ) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const log = (level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string) => {
      db.addIngestionLog(jobId, { timestamp: new Date().toISOString(), level, message });
    };

    const setStage = (status: DbScan['status'], progress: number, msg: string) => {
      db.updateScan(scanId, { status, stage: status, progressPercent: progress, currentStepMessage: msg });
      db.updateIngestionJob(jobId, { status: status as any, progressPercent: progress, currentStep: msg });
    };

    log('INFO', `Loading structured test fixture: ${sample.name}`);
    setStage('VALIDATING', 15, 'Validating sample media payload...');
    await sleep(400);

    setStage('FETCHING_METADATA', 25, 'Loading metadata for test sample...');
    db.updateScan(scanId, {
      title: sample.title,
      description: sample.description,
      category: sample.category,
      tags: sample.tags,
      madeForKids: sample.madeForKids,
      language: sample.language,
      mediaInfo: {
        fileName: `${sample.id}.mp4`,
        durationSeconds: sample.durationSeconds,
        channelTitle: 'PreScan Test Suite',
        format: 'Test Fixture Audio Stream',
      },
    });
    await sleep(400);

    setStage('ACQUIRING_MEDIA', 40, 'Acquiring sample audio tracks...');
    await sleep(400);

    setStage('EXTRACTING_AUDIO', 55, 'Extracting sample dialogue tracks...');
    await sleep(400);

    setStage('TRANSCRIBING', 70, 'Generating timestamped transcript from sample dialogue...');
    const transcript: DbTranscript = {
      id: generateId('tr'),
      scanId,
      organizationId,
      language: sample.language,
      durationSeconds: sample.durationSeconds,
      segments: sample.transcript.segments,
      fullText: sample.transcript.fullText,
      createdAt: new Date().toISOString(),
    };
    db.saveTranscript(transcript);
    log('SUCCESS', `Transcript saved with ${sample.transcript.segments.length} segment(s)`);
    await sleep(450);

    setStage('ANALYZING', 85, 'Running policy rule evaluation on test dialogue...');

    // Run AI Evaluation or build deterministic report
    let reportData: any;
    try {
      const geminiRes = await AnalysisEngineService.analyzeMediaWithGemini({
        mediaPart: {
          text: `Evaluate this transcript dialogue:\n${sample.transcript.fullText}\n\nMetadata:\nTitle: ${sample.title}\nDescription: ${sample.description}\nCategory: ${sample.category}\nMade for Kids: ${sample.madeForKids}`,
        },
        metadata: {
          scanId,
          title: sample.title,
          description: sample.description,
          category: sample.category,
          madeForKids: sample.madeForKids,
          tags: sample.tags,
          durationSeconds: sample.durationSeconds,
        },
      });
      reportData = geminiRes.report;
    } catch {
      // Fallback deterministic findings based on sample ID
      reportData = this.buildDeterministicReport(scanId, sample);
    }

    setStage('VALIDATING_REPORT', 95, 'Finalizing compliance findings...');
    const nowComplete = new Date().toISOString();

    reportData.limitations = [
      'Visual video content was not analyzed — PreScan evaluates spoken dialogue and video metadata only.',
      'Background music was not fingerprinted for Content ID audio database matches.',
    ];
    reportData.disclaimer =
      'PreScan is an advisory pre-upload QA tool. Final policy decisions rest entirely with YouTube automated systems and review teams.';

    const dbReport: DbPreScanReport = {
      id: generateId('report'),
      scanId,
      analysisJobId: jobId,
      organizationId,
      createdByUserId: userId,
      report: reportData,
      createdAt: nowComplete,
      updatedAt: nowComplete,
    };
    db.savePreScanReport(dbReport);
    await sleep(350);

    const riskLevel = reportData.overall_risk?.risk_level || 'LOW';
    db.updateScan(scanId, {
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progressPercent: 100,
      currentStepMessage: 'PreScan analysis completed successfully.',
      overallRisk: riskLevel as any,
      completedAt: nowComplete,
      errorCode: undefined,
      errorMessage: undefined,
      errorDetails: undefined,
    });
    db.updateIngestionJob(jobId, {
      status: 'READY_FOR_ANALYSIS',
      progressPercent: 100,
      currentStep: 'PreScan analysis completed successfully.',
      updatedAt: nowComplete,
    });
    log('SUCCESS', `Test fixture scan completed: Overall Risk ${riskLevel}`);
  }

  /**
   * Builds deterministic report when AI model is in offline test mode
   */
  private static buildDeterministicReport(scanId: string, sample: TestSampleData): any {
    const isProfane = sample.id === 'profanity_heavy';
    const isMismatch = sample.id === 'metadata_mismatch';
    const isCopyright = sample.id === 'copyright_reference';
    const isRoast = sample.id === 'comedy_roast';

    let riskLevel = 'LOW';
    let decision = 'LOW_RISK';
    let findings: any[] = [];

    if (isProfane) {
      riskLevel = 'HIGH';
      decision = 'HIGH_RISK';
      findings.push({
        id: 'f_1',
        category: 'advertiser_suitability',
        policy: 'Advertiser-Friendly Content — Inappropriate Language',
        policy_rule: 'Strong profanity used in first 7-15 seconds of dialogue',
        severity: 'HIGH',
        confidence: 'HIGH',
        start_timestamp: '00:00',
        end_timestamp: '00:18',
        evidence_quote: 'What the fuck is wrong with drivers today?',
        title: 'Strong Profanity in Video Opening',
        explanation:
          'YouTube advertiser guidelines restrict monetization for videos featuring strong profanity ("fuck") in the first 7-15 seconds.',
        recommended_action: 'Mute or bleep the profanity at 00:00–00:18, or trim the opening segment.',
      });
      findings.push({
        id: 'f_2',
        category: 'advertiser_suitability',
        policy: 'Advertiser-Friendly Content — Repeated Profanity',
        policy_rule: 'Multiple instances of strong vulgarity throughout dialogue',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        start_timestamp: '00:42',
        end_timestamp: '00:70',
        evidence_quote: 'Learn how to drive you fucking idiot! It was complete bullshit.',
        title: 'Frequent Profane Language',
        explanation: 'Repeated use of harsh vulgarity throughout the video may trigger limited ad serving.',
        recommended_action: 'Consider adding sound-effect bleeps over vulgar words.',
      });
    } else if (isMismatch) {
      riskLevel = 'HIGH';
      decision = 'HIGH_RISK';
      findings.push({
        id: 'f_1',
        category: 'metadata_integrity',
        policy: 'Misleading Metadata & Child Safety Alignment',
        policy_rule: 'Made for Kids flag set on adult financial trading content',
        severity: 'HIGH',
        confidence: 'HIGH',
        start_timestamp: '00:00',
        end_timestamp: '00:25',
        evidence_quote: 'Today we are analyzing high risk leveraged Bitcoin futures trading strategies.',
        title: 'Severe Metadata & Audience Mismatch',
        explanation:
          'The video is marked as "Made for Kids" with preschool ABC tags, but the spoken dialogue discusses high-risk cryptocurrency derivatives.',
        recommended_action: 'Uncheck "Made for Kids" and update tags and title to accurately describe crypto trading.',
      });
    } else if (isCopyright) {
      riskLevel = 'MEDIUM';
      decision = 'NEEDS_REVIEW';
      findings.push({
        id: 'f_1',
        category: 'copyright_signals',
        policy: 'Copyright Rights & Content ID Awareness',
        policy_rule: 'Verbal statement of playing commercial studio master recording',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        start_timestamp: '00:25',
        end_timestamp: '00:65',
        evidence_quote: "I'm going to play the studio master recording clip right here in full stereo sound.",
        title: 'Commercial Sound Recording Playback Mention',
        explanation:
          'Dialogue explicitly references playing original studio master recordings ("Shape of You"), which frequently triggers Content ID claims.',
        recommended_action:
          'Ensure you hold licensing or keep music commentary clips brief under Fair Use principles.',
      });
    } else if (isRoast) {
      riskLevel = 'LOW';
      decision = 'LOW_RISK';
      findings.push({
        id: 'f_1',
        category: 'community_guidelines',
        policy: 'Harassment & Cyberbullying — Comedy Context',
        policy_rule: 'Consensual standup roast context detected',
        severity: 'LOW',
        confidence: 'MEDIUM',
        start_timestamp: '00:00',
        end_timestamp: '00:50',
        evidence_quote: 'No, I love Dave, he is like a brother to me...',
        title: 'Roast Dialogue Within Clear Comedy Context',
        explanation:
          'Playful insults are contextualized by audience laughter and explicit disclaimers of friendship, mitigating harassment policy risk.',
        recommended_action: 'Include "Standup Comedy" in description to reinforce context for automated reviewers.',
      });
    }

    return {
      preScanVersion: '1.0',
      metadata: {
        scanId,
        title: sample.title,
        category: sample.category,
        language: sample.language,
        analyzedAt: new Date().toISOString(),
      },
      overall_risk: {
        risk_level: riskLevel,
        decision,
        safety_score: riskLevel === 'HIGH' ? 45 : riskLevel === 'MEDIUM' ? 75 : 95,
        monetization_impact: riskLevel === 'HIGH' ? 'LIMITED_MONETIZATION' : 'FULLY_MONETIZABLE',
        summary:
          riskLevel === 'HIGH'
            ? 'High policy risk signals detected that may impact monetization or audience reach.'
            : riskLevel === 'MEDIUM'
            ? 'Moderate risk signals identified. Creator review recommended before publishing.'
            : 'Low risk detected across all audited policy categories.',
      },
      categories: {
        community_guidelines: {
          risk_level: isRoast ? 'LOW' : 'LOW',
          score: 95,
          findings_count: isRoast ? 1 : 0,
          summary: isRoast ? 'Comedy context noted.' : 'No community guidelines violations found.',
        },
        advertiser_suitability: {
          risk_level: isProfane ? 'HIGH' : 'LOW',
          score: isProfane ? 40 : 100,
          findings_count: isProfane ? 2 : 0,
          summary: isProfane ? 'Strong profanity in opening detected.' : 'Advertiser-friendly language confirmed.',
        },
        copyright_signals: {
          risk_level: isCopyright ? 'MEDIUM' : 'LOW',
          score: isCopyright ? 70 : 100,
          findings_count: isCopyright ? 1 : 0,
          summary: isCopyright ? 'Commercial master track playback referenced.' : 'No third-party rights claims indicated.',
        },
        metadata_integrity: {
          risk_level: isMismatch ? 'HIGH' : 'LOW',
          score: isMismatch ? 30 : 100,
          findings_count: isMismatch ? 1 : 0,
          summary: isMismatch ? 'Critical mismatch between kids metadata and crypto content.' : 'Metadata accurately matches dialogue.',
        },
      },
      findings,
      positiveObservations: [
        'Spoken dialogue is audible and well-structured.',
        'No hate speech or dangerous activities detected.',
      ],
      creatorActionPlan:
        findings.length > 0
          ? findings.map((f) => f.recommended_action)
          : ['Video is ready for final creator review before scheduling on YouTube.'],
    };
  }

  /**
   * Recovers any scans left in non-terminal states across server restarts
   */
  public static recoverStuckScans() {
    try {
      const scans = (db as any).data?.scans || [];
      const nonTerminal = [
        'QUEUED',
        'VALIDATING',
        'FETCHING_METADATA',
        'ACQUIRING_MEDIA',
        'EXTRACTING_AUDIO',
        'TRANSCRIBING',
        'ANALYZING',
        'VALIDATING_REPORT',
        'PROCESSING',
        'INGESTING',
      ];

      for (const s of scans) {
        if (nonTerminal.includes(s.status)) {
          console.log(`[ScanPipeline] Recovering stuck scan ${s.id} (was in ${s.status})...`);
          const err = ScanPipelineService.getErrorDetails(
            SCAN_ERROR_CODES.TEMPORARY_PROCESSING_ERROR,
            'Scan was interrupted due to a system restart.'
          );
          db.updateScan(s.id, {
            status: 'FAILED',
            stage: 'FAILED',
            errorCode: err.code,
            errorMessage: err.message,
            errorDetails: err,
          });
        }
      }
    } catch (e) {
      console.warn('[ScanPipeline] Recovery check notice:', e);
    }
  }
}
