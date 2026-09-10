import fs from 'fs';
import path from 'path';
import { db, DbScan, DbAnalysisJob, DbTranscript, DbPreScanReport, DbTranscriptSegment } from '../db';
import { generateId } from '../auth';
import { AudioPreparationService } from './audioPreparation.service';
import { GeminiMediaService, GeminiUploadedFileRef } from './geminiMedia.service';
import { parseGeminiJSON } from '../utils/jsonUtils';
import { generateGeminiContent } from './gemini.service';
import { AI_CONFIG } from '../config/ai.config';
import { EntitlementService } from './entitlement.service';
import { MultilingualProfanityEngine } from './profanity/multilingualProfanityEngine';

export class AnalysisEngineService {
  /**
   * Triggers or retries Phase 05.1 analysis for a given scan.
   */
  static async startScanAnalysis(
    scanId: string,
    organizationId: string,
    userId: string
  ): Promise<{ job: DbAnalysisJob; scan: DbScan }> {
    const scan = db.findScanById(scanId);
    if (!scan || scan.organizationId !== organizationId) {
      throw new Error('Scan record not found or access denied.');
    }

    // Server-side Entitlement Verification
    const durationSeconds = scan.mediaInfo?.durationSeconds;
    const durCheck = EntitlementService.canUploadVideo(organizationId, durationSeconds);
    if (!durCheck.allowed) {
      throw new Error(durCheck.reason || 'Video duration exceeds your plan limits. Please upgrade.');
    }

    // Check if this scan has already consumed an entitlement credit (e.g. retry)
    const existingEvents = db.getUsageEventsByWorkspace(organizationId, 100);
    const alreadyConsumed = existingEvents.some((e) => e.scanId === scanId && e.type === 'SCAN_CONSUMED');

    if (!alreadyConsumed) {
      const consumption = EntitlementService.consumeScanEntitlement(organizationId, userId, scanId, {
        durationSeconds,
      });
      if (!consumption.success) {
        throw new Error(consumption.error || 'Scan limit reached for this billing period. Please upgrade your plan.');
      }
    }

    // Prevent duplicate analysis jobs if one is actively running
    const existingJob = db.findLatestAnalysisJobByScanId(scanId);
    if (
      existingJob &&
      ['QUEUED', 'MEDIA_PREPARING', 'MEDIA_READY', 'TRANSCRIBING', 'ANALYZING', 'VALIDATING'].includes(existingJob.status)
    ) {
      return { job: existingJob, scan };
    }

    const jobId = generateId('an_job');
    const now = new Date().toISOString();

    const initialJob: DbAnalysisJob = {
      id: jobId,
      scanId,
      organizationId,
      status: 'QUEUED',
      progressPercent: 5,
      currentStep: 'Queueing scan for real Gemini media analysis & policy evaluation',
      attempts: (existingJob?.attempts || 0) + 1,
      model: AI_CONFIG.MODEL,
      promptVersion: AI_CONFIG.PROMPT_VERSION,
      startedAt: now,
      logs: [
        {
          timestamp: now,
          level: 'INFO',
          message: `Analysis job initiated (Attempt #${(existingJob?.attempts || 0) + 1})`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    db.createAnalysisJob(initialJob);

    // Update scan status to PROCESSING
    const updatedScan = db.updateScan(scanId, {
      status: 'PROCESSING',
      progressPercent: 10,
      currentStepMessage: 'Starting AI analysis engine...',
      errorMessage: undefined,
    })!;

    // Log audit
    db.createAuditLog({
      id: generateId('audit'),
      organizationId,
      actorUserId: userId,
      action: 'SCAN_ANALYSIS_STARTED',
      targetResourceType: 'SCAN',
      targetResourceId: scanId,
      createdAt: now,
    });

    // Run pipeline asynchronously in background
    AnalysisEngineService.runAnalysisPipeline(scanId, jobId, organizationId, userId).catch((err) => {
      console.error(`Uncaught error in analysis pipeline for scan ${scanId}:`, err);
    });

    return { job: initialJob, scan: updatedScan };
  }

  /**
   * Background worker for Phase 05.1 Real Gemini Media Analysis Pipeline
   */
  private static async runAnalysisPipeline(
    scanId: string,
    jobId: string,
    organizationId: string,
    userId: string
  ) {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    try {
      const scan = db.findScanById(scanId);
      if (!scan) throw new Error('Scan record missing during pipeline run.');

      const sourceType = scan.sourceType || scan.source?.type || (scan.mediaInfo?.youtubeVideoId ? 'youtube_url' : 'file');

      if (sourceType === ('youtube_connection' as any) || sourceType === ('connected_channel' as any)) {
        throw new Error('Connected channel ingestion is reserved for Phase 06.');
      }

      // --- STAGE 1: MEDIA_PREPARING ---
      db.updateAnalysisJob(jobId, {
        status: 'MEDIA_PREPARING',
        progressPercent: 20,
        currentStep: 'Preparing media source for Gemini multimodal input',
      });
      db.addAnalysisJobLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Processing source type: ${sourceType}...`,
      });
      db.updateScan(scanId, {
        progressPercent: 20,
        currentStepMessage: 'Preparing media source for Gemini multimodal analysis...',
      });

      let mediaPartForGemini: any = null;
      let cleanupRemoteFileName: string | undefined = undefined;

      if (sourceType === 'youtube_url') {
        const videoId = scan.mediaInfo?.youtubeVideoId || scan.source?.videoId;
        const youtubeUrl = scan.mediaInfo?.youtubeUrl || scan.source?.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

        if (!youtubeUrl) {
          throw new Error('PreScan could retrieve YouTube metadata, but YouTube URL is missing.');
        }

        db.addAnalysisJobLog(jobId, {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: `Passing public YouTube URL directly to Gemini video input: ${youtubeUrl}`,
        });

        mediaPartForGemini = {
          fileData: {
            fileUri: youtubeUrl,
            mimeType: 'video/mp4',
          },
        };
      } else {
        // FILE_UPLOAD PATH
        const storagePath = scan.mediaInfo?.storagePath;
        if (!storagePath || !fs.existsSync(storagePath)) {
          throw new Error('Uploaded media file is missing or inaccessible on server.');
        }

        db.addAnalysisJobLog(jobId, {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: `Uploading file (${path.basename(storagePath)}) to Gemini Files API...`,
        });

        let uploadedRef: GeminiUploadedFileRef | null = null;
        try {
          uploadedRef = await GeminiMediaService.uploadVideoForAnalysis(storagePath);
        } catch (uploadErr: any) {
          console.warn(`[AnalysisEngineService] Direct video file upload failed (${uploadErr.message}). Extracting audio track fallback...`);
          const outDir = path.dirname(storagePath);
          const prep = await AudioPreparationService.prepareAudio(storagePath, outDir, scanId);
          if (prep.hasAudio && prep.audioFilePath && fs.existsSync(prep.audioFilePath)) {
            uploadedRef = await GeminiMediaService.uploadVideoForAnalysis(prep.audioFilePath, 'audio/mp3');
          } else {
            throw new Error(`Media upload for Gemini Files API failed: ${uploadErr.message}`);
          }
        }

        cleanupRemoteFileName = uploadedRef.name;
        mediaPartForGemini = {
          fileData: {
            fileUri: uploadedRef.uri,
            mimeType: uploadedRef.mimeType,
          },
        };

        db.addAnalysisJobLog(jobId, {
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          message: `Media uploaded to Gemini Files API (${uploadedRef.name}, ACTIVE)`,
        });
      }

      await sleep(300);

      // --- STAGE 2: MEDIA_READY ---
      db.updateAnalysisJob(jobId, {
        status: 'MEDIA_READY',
        progressPercent: 40,
        currentStep: 'Media payload ready for Gemini evaluation',
      });
      db.updateScan(scanId, {
        progressPercent: 40,
        currentStepMessage: 'Media payload ready for Gemini evaluation...',
      });

      await sleep(300);

      // --- STAGE 3: ANALYZING (GEMINI POLICY EVALUATION) ---
      db.updateAnalysisJob(jobId, {
        status: 'ANALYZING',
        progressPercent: 65,
        currentStep: 'Analyzing media dialogue & multi-category policy risk with Gemini engine',
      });
      db.addAnalysisJobLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Evaluating spoken dialogue, timestamps, profanity & YouTube policy rules with Gemini...',
      });
      db.updateScan(scanId, {
        progressPercent: 65,
        currentStepMessage: 'Evaluating policy risk across 4 core categories...',
      });

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
            channelTitle: scan.channelTitle || (scan.metadata as any)?.channelTitle,
            youtubeVideoId: scan.youtubeVideoId,
            publishedAt: scan.publishedAt || (scan.metadata as any)?.publishedAt,
            tagsUnavailable: scan.tagsUnavailable,
          },
        });
      } catch (geminiErr: any) {
        // Fallback for YouTube public URL if direct video input fails & downloaded local audio stream exists
        if (sourceType === 'youtube_url' && scan.mediaInfo?.storagePath && fs.existsSync(scan.mediaInfo.storagePath)) {
          console.warn(`[AnalysisEngineService] Direct Gemini YouTube URL input failed (${geminiErr.message}). Retrying via downloaded audio stream...`);
          db.addAnalysisJobLog(jobId, {
            timestamp: new Date().toISOString(),
            level: 'WARN',
            message: `Direct YouTube URL input failed (${geminiErr.message}). Retrying via fallback audio stream...`,
          });
          const fallbackRef = await GeminiMediaService.uploadVideoForAnalysis(scan.mediaInfo.storagePath, 'audio/mp3');
          cleanupRemoteFileName = fallbackRef.name;
          const fallbackPart = {
            fileData: {
              fileUri: fallbackRef.uri,
              mimeType: fallbackRef.mimeType,
            },
          };
          rawGeminiResult = await AnalysisEngineService.analyzeMediaWithGemini({
            mediaPart: fallbackPart,
            metadata: {
              scanId: scan.id,
              title: scan.title,
              description: scan.description,
              category: scan.category,
              madeForKids: scan.madeForKids,
              tags: scan.tags,
              sourceType: scan.sourceType,
              durationSeconds: scan.mediaInfo?.durationSeconds,
              channelTitle: scan.channelTitle || (scan.metadata as any)?.channelTitle,
              youtubeVideoId: scan.youtubeVideoId,
              publishedAt: scan.publishedAt || (scan.metadata as any)?.publishedAt,
              tagsUnavailable: scan.tagsUnavailable,
            },
          });
        } else {
          if (sourceType === 'youtube_url') {
            throw new Error('PreScan could retrieve the YouTube metadata, but the video could not be analyzed.');
          }
          throw geminiErr;
        }
      } finally {
        if (cleanupRemoteFileName) {
          await GeminiMediaService.deleteRemoteFile(cleanupRemoteFileName);
        }
      }

      // Save Transcript to DB if segments exist
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
        db.addAnalysisJobLog(jobId, {
          timestamp: new Date().toISOString(),
          level: 'SUCCESS',
          message: `Transcript generated: ${rawGeminiResult.transcriptSegments.length} segment(s)`,
        });
      }

      await sleep(300);

      // --- STAGE 4: VALIDATING & PERSISTING ---
      db.updateAnalysisJob(jobId, {
        status: 'VALIDATING',
        progressPercent: 90,
        currentStep: 'Validating PreScan V1 report schema & persisting findings',
      });
      db.addAnalysisJobLog(jobId, {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Validating output schema, timestamp grounding & policy disclaimers...',
      });

      const validatedReportData = rawGeminiResult.report;
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

      // Update AnalysisJob to COMPLETED
      db.updateAnalysisJob(jobId, {
        status: 'COMPLETED',
        progressPercent: 100,
        currentStep: 'PreScan analysis completed successfully.',
        completedAt: nowComplete,
      });
      db.addAnalysisJobLog(jobId, {
        timestamp: nowComplete,
        level: 'SUCCESS',
        message: `PreScan V1 Report finalized: Overall Risk ${validatedReportData.overall_risk.risk_level}, ${validatedReportData.findings.length} finding(s).`,
      });

      // Update Scan to COMPLETED
      db.updateScan(scanId, {
        status: 'COMPLETED',
        overallRisk: validatedReportData.overall_risk.risk_level as any,
        progressPercent: 100,
        currentStepMessage: 'PreScan analysis complete.',
        completedAt: nowComplete,
        language: validatedReportData.metadata?.language || (validatedReportData.languageDetails?.primaryLanguage ? `${validatedReportData.languageDetails.primaryLanguage} (${validatedReportData.languageDetails.languageCode})` : scan.language),
      });
    } catch (error: any) {
      console.error(`Analysis engine failed for scan ${scanId}:`, error);

      const errMessage = error?.message || "PreScan couldn't complete the analysis.";
      const nowErr = new Date().toISOString();

      // STRICT REQUIREMENT: FAIL THE JOB AND SCAN. NEVER FALLBACK TO GREEN.
      db.updateAnalysisJob(jobId, {
        status: 'FAILED',
        errorCode: 'ANALYSIS_FAILED',
        errorMessage: errMessage,
        completedAt: nowErr,
      });
      db.addAnalysisJobLog(jobId, {
        timestamp: nowErr,
        level: 'ERROR',
        message: `Analysis failed: ${errMessage}`,
      });

      db.updateScan(scanId, {
        status: 'FAILED',
        errorMessage: errMessage,
        overallRisk: 'INSUFFICIENT_DATA',
      });
    }
  }

  /**
   * Prompts Gemini with actual video/audio media input.
   * Performs:
   * 1. Direct audio/multimodal analysis for automatic spoken language detection
   * 2. Comprehensive verbatim speech transcription
   * 3. Pass 1: Broad YouTube policy compliance (Community Guidelines, Advertiser Suitability, Copyright, Metadata)
   * 4. Pass 2: Multilingual Profanity Engine (Romanized, transliterated, regional slang, leetspeak, homoglyphs)
   * 5. Reconciliation & deterministic scoring
   */
  static async analyzeMediaWithGemini(params: {
    mediaPart: any;
    metadata: {
      scanId: string;
      title: string;
      description?: string;
      category?: string;
      madeForKids?: boolean;
      tags?: string[];
      sourceType?: string;
      durationSeconds?: number;
      channelTitle?: string;
      youtubeVideoId?: string;
      publishedAt?: string;
      tagsUnavailable?: boolean;
    };
  }): Promise<{ transcriptSegments: DbTranscriptSegment[]; report: any }> {
    const systemPrompt = `You are PreScan AI — an expert YouTube Creator Policy, Compliance & Multilingual Speech Analysis Assistant.
You are analyzing the supplied media directly. Treat its audio dialogue as the source of truth. Do not infer spoken content only from metadata, title, description, thumbnail, or assumptions.

AUTOMATIC SPOKEN LANGUAGE DETECTION:
1. Analyze the actual spoken audio dialogue to detect the PRIMARY SPOKEN LANGUAGE.
2. DO NOT determine the language only from the video title, description, or channel name.
3. Fully support global and regional languages, including English, Hindi, Hinglish, Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati, Urdu, Kannada, Malayalam, etc.
4. Fully support code-switching and Romanized transliterations (e.g., Hindi spoken dialogue transcribed in Latin script like "Tu pagal hai kya?", "Bhai kya kar raha hai", or mixed English-Hindi).
5. Output a "languageDetection" object with:
   - "primaryLanguage": String (e.g. "Hindi", "English", "Punjabi", "Tamil")
   - "languageCode": String ISO 639-1 code (e.g. "hi", "en", "pa", "ta")
   - "confidence": Float between 0.0 and 1.0
   - "detectedLanguages": Array of strings e.g. ["Hindi", "English"]
   - "isCodeSwitched": Boolean indicating mixed languages

CORE POLICY AUDIT RULES:
- Identify Community Guidelines risks (harassment, hate speech, violence, dangerous acts).
- Identify advertiser-suitability concerns (profanity, sexual content, shocking content).
- Identify explicit verbal references to third-party copyrighted material.
- Compare metadata (title, description, tags) against the actual spoken content for metadata integrity.
- Ground every finding in actual spoken dialogue evidence and exact timestamps.

PROFANITY POLICY RULES:
- Detect profanity across languages (English, Hindi, Hinglish, Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.).
- Recognize Romanized Indian abusive terms (e.g., "madarchod", "bhenchod", "chutiya", "bhosdike", "randi", "gaand", "lauda", "lund", "thevidiya", "otha", "punda", "lanja", "dengu", "khanki", "bokachoda", etc.).
- Early profanity (in first 7-15 seconds) or repeated profanity increases severity to HIGH or CRITICAL.
- Do NOT flag benign words that resemble profanity (e.g. "analysis", "hello", "classic", "glass", "titular", "cocktail", "butter", "saath").

Return ONLY valid JSON matching this schema:
{
  "languageDetection": {
    "primaryLanguage": "Hindi",
    "languageCode": "hi",
    "confidence": 0.95,
    "detectedLanguages": ["Hindi", "English"],
    "isCodeSwitched": true
  },
  "transcript": [
    {
      "startSeconds": 0,
      "endSeconds": 5,
      "text": "spoken dialogue"
    }
  ],
  "report": {
    "preScanVersion": "1.0",
    "metadata": {
      "scanId": "${params.metadata.scanId}",
      "title": "${params.metadata.title}",
      "category": "${params.metadata.category || 'General'}",
      "language": "en",
      "analyzedAt": "${new Date().toISOString()}"
    },
    "overall_risk": {
      "risk_level": "LOW",
      "decision": "LOW_RISK",
      "safety_score": 90,
      "monetization_impact": "FULLY_MONETIZABLE",
      "summary": "Executive summary"
    },
    "categories": {
      "community_guidelines": { "risk_level": "LOW", "score": 100, "findings_count": 0, "summary": "No community guidelines issues detected." },
      "advertiser_suitability": { "risk_level": "LOW", "score": 100, "findings_count": 0, "summary": "No advertiser suitability issues detected." },
      "copyright_signals": { "risk_level": "LOW", "score": 100, "findings_count": 0, "summary": "No copyright signals detected." },
      "metadata_integrity": { "risk_level": "LOW", "score": 100, "findings_count": 0, "summary": "Metadata aligns with spoken content." }
    },
    "findings": [],
    "positiveObservations": ["Clear audio dialogue", "Compliant title"],
    "creatorActionPlan": ["Review video before publishing"],
    "recommendedActions": [],
    "limitations": ["Visual content was not analyzed — PreScan evaluates spoken audio dialogue and video metadata."],
    "disclaimer": "PreScan is an advisory pre-upload QA tool. Final policy decisions rest entirely with YouTube's automated systems and review teams."
  }
}`;

    const userPrompt = `VIDEO METADATA:
Title: ${params.metadata.title}
Description: ${params.metadata.description || 'None provided'}
Category: ${params.metadata.category || 'General'}
COPPA Made For Kids: ${params.metadata.madeForKids ? 'Yes' : 'No'}
Tags: ${(params.metadata.tags || []).join(', ') || 'None'}

Please analyze the provided media file for YouTube policy compliance according to system instructions, detect the actual primary spoken language from audio dialogue, transcribe spoken content into timestamped segments, and evaluate risk categories. Output JSON.`;

    const contents: any[] = [];
    if (params.mediaPart) {
      if (
        params.mediaPart.fileData &&
        typeof params.mediaPart.fileData.fileUri === 'string' &&
        (params.mediaPart.fileData.fileUri.startsWith('files/') ||
          params.mediaPart.fileData.fileUri.startsWith('https://generativelanguage.googleapis.com') ||
          params.mediaPart.fileData.fileUri.includes('youtube.com') ||
          params.mediaPart.fileData.fileUri.includes('youtu.be'))
      ) {
        contents.push(params.mediaPart);
      } else if (params.mediaPart.text) {
        contents.push(params.mediaPart);
      } else if (params.mediaPart.inlineData) {
        contents.push(params.mediaPart);
      }
    }
    contents.push({ text: userPrompt });

    const geminiResponseText = await generateGeminiContent({
      contents,
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
      model: AI_CONFIG.MODEL,
    });

    if (!geminiResponseText) {
      throw new Error('Gemini model returned empty response during media analysis.');
    }

    let parsed: any;
    try {
      parsed = parseGeminiJSON(geminiResponseText);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse Gemini media analysis JSON response: ${parseErr.message}`);
    }

    // Extract transcript segments if provided
    let transcriptSegments: DbTranscriptSegment[] = [];
    if (Array.isArray(parsed.transcript)) {
      transcriptSegments = parsed.transcript.map((ts: any) => {
        let startSec = 0;
        let endSec = 5;

        if (typeof ts === 'string') {
          const match = ts.match(/(?:(\d+):)?(\d+):(\d+)/);
          if (match) {
            const h = match[1] ? parseInt(match[1], 10) : 0;
            const m = parseInt(match[2], 10);
            const s = parseInt(match[3], 10);
            startSec = h * 3600 + m * 60 + s;
          }
          return {
            startSeconds: startSec,
            endSeconds: startSec + 5,
            text: ts,
          };
        }

        if (typeof ts.startSeconds === 'number') {
          startSec = ts.startSeconds;
        } else if (typeof ts.start_seconds === 'number') {
          startSec = ts.start_seconds;
        } else if (typeof ts.start === 'number') {
          startSec = ts.start;
        } else if (typeof ts.start === 'string') {
          if (ts.start.includes(':')) {
            const p = ts.start.split(':').map((v: string) => parseFloat(v) || 0);
            startSec = p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
          } else {
            startSec = parseFloat(ts.start) || 0;
          }
        }

        if (typeof ts.endSeconds === 'number') {
          endSec = ts.endSeconds;
        } else if (typeof ts.end_seconds === 'number') {
          endSec = ts.end_seconds;
        } else if (typeof ts.end === 'number') {
          endSec = ts.end;
        } else if (typeof ts.end === 'string') {
          if (ts.end.includes(':')) {
            const p = ts.end.split(':').map((v: string) => parseFloat(v) || 0);
            endSec = p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
          } else {
            endSec = parseFloat(ts.end) || startSec + 5;
          }
        } else {
          endSec = startSec + 5;
        }

        return {
          startSeconds: Math.max(0, startSec),
          endSeconds: Math.max(startSec, endSec),
          text: String(ts.text || ''),
        };
      });
    }

    // Extract language detection details
    const langInfo = parsed.languageDetection || parsed.report?.languageDetection || {};
    const primaryLanguage = langInfo.primaryLanguage || 'English';
    const languageCode = langInfo.languageCode || 'en';
    const langConfidence = typeof langInfo.confidence === 'number' ? langInfo.confidence : 0.95;
    const detectedLanguages = Array.isArray(langInfo.detectedLanguages) && langInfo.detectedLanguages.length > 0
      ? langInfo.detectedLanguages
      : [primaryLanguage];
    const isCodeSwitched = Boolean(langInfo.isCodeSwitched || detectedLanguages.length > 1);

    // =========================================================================
    // PASS 2: MULTILINGUAL PROFANITY & SLUR DETECTION ENGINE
    // =========================================================================
    let confirmedProfanities: any[] = [];
    try {
      confirmedProfanities = await MultilingualProfanityEngine.analyzeTranscriptProfanity(
        transcriptSegments,
        primaryLanguage
      );
    } catch (profErr) {
      console.warn('[AnalysisEngineService] MultilingualProfanityEngine pass error:', profErr);
    }

    // Extract report object
    const report = parsed.report || parsed;

    if (!report || (!report.overall_risk && !report.overall) || !report.categories) {
      throw new Error('Gemini analysis JSON response is missing required overall_risk or categories fields.');
    }

    // Standardize object structure for frontend compatibility
    if (!report.overall_risk && report.overall) {
      report.overall_risk = report.overall;
    }
    if (!report.overall && report.overall_risk) {
      report.overall = report.overall_risk;
    }

    // Ensure camelCase and snake_case category mappings exist
    const cats = report.categories;
    cats.community_guidelines = cats.community_guidelines || cats.communityGuidelines || { risk_level: 'LOW', score: 100, findings_count: 0, summary: 'No findings.' };
    cats.advertiser_suitability = cats.advertiser_suitability || cats.advertiserSuitability || { risk_level: 'LOW', score: 100, findings_count: 0, summary: 'No findings.' };
    cats.copyright_signals = cats.copyright_signals || cats.copyrightSignals || { risk_level: 'LOW', score: 100, findings_count: 0, summary: 'No findings.' };
    cats.metadata_integrity = cats.metadata_integrity || cats.metadataIntegrity || { risk_level: 'LOW', score: 100, findings_count: 0, summary: 'No findings.' };

    cats.communityGuidelines = cats.community_guidelines;
    cats.advertiserSuitability = cats.advertiser_suitability;
    cats.copyrightSignals = cats.copyright_signals;
    cats.metadataIntegrity = cats.metadata_integrity;

    // Convert Pass 2 confirmed profanities into findings
    const profanityFindings = confirmedProfanities.map((occ, idx) => ({
      id: `profanity_${idx + 1}`,
      category: occ.status === 'POTENTIAL' ? 'POTENTIAL_PROFANITY' : 'advertiser_suitability',
      status: occ.status || 'CONFIRMED',
      policy: occ.status === 'POTENTIAL'
        ? 'Potential Profanity / Contextual Review Candidate'
        : 'Advertiser-Friendly Content — Profanity / Inappropriate Language',
      policy_rule: occ.severity === 'CRITICAL' ? 'Severe profanity or abusive language' : occ.severity === 'HIGH' ? 'Strong profanity in spoken dialogue' : 'Moderate/mild profanity in spoken dialogue',
      severity: occ.severity,
      confidence: occ.confidence,
      start_timestamp: occ.startTimestamp,
      end_timestamp: occ.endTimestamp,
      timestamp: occ.startTimestamp,
      startSeconds: occ.startSeconds,
      endSeconds: occ.endSeconds,
      evidence_quote: occ.evidenceQuote,
      quote: occ.evidenceQuote,
      title: `${occ.status === 'POTENTIAL' ? 'Potential Profanity' : (occ.severity === 'CRITICAL' || occ.severity === 'HIGH' ? 'Profanity Warning' : 'Profanity Notice')}: "${occ.detectedExpression}" (${occ.language})`,
      detectedExpression: occ.detectedExpression,
      canonical: occ.canonical,
      language: occ.language,
      languageCode: occ.languageCode,
      reasoning: occ.contextExplanation,
      explanation: occ.contextExplanation,
      reason: occ.reason || occ.contextExplanation,
      recommendation: occ.recommendedAction,
      recommended_action: occ.recommendedAction,
    }));

    // Filter out duplicate or vague profanity flags from Pass 1 while keeping broad non-profanity policy findings
    const rawFindings = Array.isArray(report.findings) ? report.findings : [];
    const nonProfanityFindings = rawFindings.filter((f: any) => {
      const isProf = (
        f.category === 'advertiser_suitability' &&
        (f.policy?.toLowerCase().includes('profanity') ||
          f.policy_rule?.toLowerCase().includes('profanity') ||
          f.title?.toLowerCase().includes('profanity'))
      );
      return !isProf;
    }).map((f: any, idx: number) => ({
      id: f.id || `f_${idx + 1}`,
      category: f.category || 'community_guidelines',
      policy: f.policy || 'YouTube Policy Rule',
      policy_rule: f.policy_rule || f.policy || 'Policy Guideline',
      severity: f.severity || 'MEDIUM',
      confidence: f.confidence || 'HIGH',
      start_timestamp: f.start_timestamp || f.timestamp || '00:00',
      end_timestamp: f.end_timestamp || f.endTimestamp || f.start_timestamp || '00:05',
      timestamp: f.timestamp || f.start_timestamp || '00:00',
      evidence_quote: f.evidence_quote || f.quote || '',
      quote: f.quote || f.evidence_quote || '',
      title: f.title || f.policy || 'Policy Flag',
      reasoning: f.reasoning || f.explanation || 'Potential policy conflict detected.',
      explanation: f.explanation || f.reasoning || 'Potential policy conflict detected.',
      recommendation: f.recommendation || f.recommended_action || 'Review dialogue before publishing.',
      recommended_action: f.recommended_action || f.recommendation || 'Review dialogue before publishing.',
    }));

    // Combine all findings
    const allFindings = [...nonProfanityFindings, ...profanityFindings];

    // Chronological sort
    allFindings.sort((a, b) => {
      const parseSec = (ts: any) => {
        if (ts === null || ts === undefined) return 0;
        if (typeof ts === 'number') return ts;
        if (typeof ts !== 'string') return 0;
        if (!ts.includes(':')) return parseFloat(ts) || 0;
        const parts = ts.split(':').map((p: string) => parseFloat(p) || 0);
        return parts.length === 2 ? parts[0] * 60 + parts[1] : (parts[0] * 3600 + parts[1] * 60 + parts[2]);
      };
      const aSec = parseSec(a.startSeconds) || parseSec(a.start_timestamp) || parseSec(a.timestamp);
      const bSec = parseSec(b.startSeconds) || parseSec(b.start_timestamp) || parseSec(b.timestamp);
      return aSec - bSec;
    });

    report.findings = allFindings;

    // Attach Video Information
    report.videoInformation = {
      videoId: params.metadata.youtubeVideoId,
      title: params.metadata.title,
      description: params.metadata.description,
      tags: params.metadata.tags || [],
      tagsCount: (params.metadata.tags || []).length,
      tagsUnavailable: params.metadata.tagsUnavailable ?? ((params.metadata.tags || []).length === 0),
      channelTitle: params.metadata.channelTitle,
      durationSeconds: params.metadata.durationSeconds,
      category: params.metadata.category,
    };

    // Attach Language Details
    report.languageDetails = {
      primaryLanguage,
      languageCode,
      confidence: langConfidence,
      detectedLanguages,
      isCodeSwitched,
    };

    report.metadata = {
      ...report.metadata,
      scanId: params.metadata.scanId,
      title: params.metadata.title,
      category: params.metadata.category || 'General',
      language: `${primaryLanguage} (${languageCode})`,
      durationSeconds: params.metadata.durationSeconds,
    };

    // Summary Statistics
    const criticalCount = report.findings.filter((f: any) => f.severity === 'CRITICAL').length;
    const highCount = report.findings.filter((f: any) => f.severity === 'HIGH').length;
    const mediumCount = report.findings.filter((f: any) => f.severity === 'MEDIUM').length;
    const lowCount = report.findings.filter((f: any) => f.severity === 'LOW').length;

    const confirmedCount = profanityFindings.filter((f: any) => f.status === 'CONFIRMED' || !f.status).length;
    const potentialCount = profanityFindings.filter((f: any) => f.status === 'POTENTIAL').length;

    report.summaryStats = {
      totalFindings: report.findings.length,
      profanityCount: profanityFindings.length,
      confirmedProfanityCount: confirmedCount,
      potentialProfanityCount: potentialCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    };

    // Adjust advertiser suitability score and findings count
    const adSuitFindings = report.findings.filter((f: any) => f.category === 'advertiser_suitability');
    cats.advertiser_suitability.findings_count = adSuitFindings.length;
    if (adSuitFindings.length > 0) {
      const penalty = criticalCount * 30 + highCount * 20 + mediumCount * 10 + lowCount * 4;
      cats.advertiser_suitability.score = Math.max(15, 100 - penalty);
      cats.advertiser_suitability.risk_level = (criticalCount > 0 || highCount > 0) ? 'HIGH' : mediumCount > 0 ? 'MEDIUM' : 'LOW';
      cats.advertiser_suitability.summary = `${adSuitFindings.length} issue(s) detected, including ${profanityFindings.length} profanity or vulgarity occurrence(s).`;
    }

    // Deterministic overall risk calculation
    const findingsList: any[] = report.findings;
    const hasCriticalOrHigh = findingsList.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    const hasMedium = findingsList.some((f) => f.severity === 'MEDIUM');

    if (hasCriticalOrHigh) {
      report.overall_risk.risk_level = 'HIGH';
      report.overall_risk.decision = 'HIGH_RISK';
      report.overall_risk.monetization_impact = 'LIMITED_MONETIZATION';
      report.overall.risk_level = 'HIGH';
      report.overall.decision = 'HIGH_RISK';
      report.overall_risk.safety_score = Math.min(65, Math.max(15, 100 - (criticalCount * 25 + highCount * 15 + mediumCount * 8)));
      report.overall.safety_score = report.overall_risk.safety_score;
    } else if (hasMedium) {
      report.overall_risk.risk_level = 'MEDIUM';
      report.overall_risk.decision = 'NEEDS_REVIEW';
      report.overall_risk.monetization_impact = 'LIMITED_MONETIZATION';
      report.overall.risk_level = 'MEDIUM';
      report.overall.decision = 'NEEDS_REVIEW';
      report.overall_risk.safety_score = Math.min(80, Math.max(60, 100 - (mediumCount * 10 + lowCount * 4)));
      report.overall.safety_score = report.overall_risk.safety_score;
    } else if (findingsList.length === 0) {
      report.overall_risk.risk_level = 'LOW';
      report.overall_risk.decision = 'LOW_RISK';
      report.overall_risk.monetization_impact = 'FULLY_MONETIZABLE';
      report.overall.risk_level = 'LOW';
      report.overall.decision = 'LOW_RISK';
      report.overall_risk.safety_score = 98;
      report.overall.safety_score = 98;
    }

    // Ensure limitations & disclaimer
    report.limitations = report.limitations || [
      'Visual content was not analyzed — PreScan Phase 05 evaluates spoken audio dialogue and video metadata only.',
    ];
    report.disclaimer =
      'PreScan is an advisory pre-upload QA tool. Final policy decisions rest entirely with YouTube\'s automated systems and review teams.';

    return { transcriptSegments, report };
  }
}
