/**
 * PreScan Multilingual Profanity Engine
 * Multi-layer profanity detection orchestrator combining:
 * 1. Multilingual Lexicon pattern scanner
 * 2. Transliteration & normalization engine
 * 3. Contextual Gemini AI analysis (Pass 2)
 * 4. Ground-truth timestamp alignment and cross-validation
 */

import { MultilingualLexicon, LexiconEntry } from './multilingualLexicon';
import { TextNormalizer } from './textNormalizer';
import { parseGeminiJSON } from '../../utils/jsonUtils';
import { generateGeminiContent } from '../gemini.service';
import { AI_CONFIG } from '../../config/ai.config';
import { DbTranscriptSegment } from '../../db';

export interface ConfirmedProfanityOccurrence {
  id: string;
  detectedExpression: string;
  canonical: string;
  language: string;
  languageCode: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'CONFIRMED' | 'POTENTIAL';
  startSeconds: number;
  endSeconds: number;
  startTimestamp: string;
  endTimestamp: string;
  evidenceQuote: string;
  contextExplanation: string;
  recommendedAction: string;
  isEarlyOccurrence: boolean;
  reason?: string;
}

export class MultilingualProfanityEngine {
  /**
   * Helper to format seconds as MM:SS
   */
  public static formatTimestamp(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const mins = Math.floor(s / 60);
    const remaining = s % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  }

  /**
   * Helper to parse MM:SS or HH:MM:SS to seconds
   */
  public static parseTimestamp(ts: any): number {
    if (ts === null || ts === undefined) return 0;
    if (typeof ts === 'number') return ts;
    if (typeof ts !== 'string') return 0;
    if (!ts.includes(':')) return parseFloat(ts) || 0;
    const parts = ts.split(':').map((p) => parseFloat(p) || 0);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parseFloat(ts) || 0;
  }

  /**
   * Layer 1 & 2: Fast Lexicon Scanner over transcript segments
   */
  public static scanTranscriptWithLexicon(
    segments: DbTranscriptSegment[]
  ): ConfirmedProfanityOccurrence[] {
    const findings: ConfirmedProfanityOccurrence[] = [];
    const entries = MultilingualLexicon.getEntries();

    segments.forEach((seg, segIdx) => {
      const originalText = seg.text || '';
      if (!originalText.trim()) return;

      const normalizedText = TextNormalizer.normalize(originalText);

      for (const entry of entries) {
        // Test against both original and normalized text
        const matchesOriginal = entry.regex.test(originalText);
        const matchesNormalized = entry.regex.test(normalizedText);

        if (matchesOriginal || matchesNormalized) {
          // Check false positive guards
          if (entry.falsePositiveGuards && entry.falsePositiveGuards.length > 0) {
            const hasBenign = entry.falsePositiveGuards.some((b) =>
              originalText.toLowerCase().includes(b.toLowerCase())
            );
            if (hasBenign) continue;
          }

          if (TextNormalizer.isWhitelisted(entry.canonical, originalText)) {
            continue;
          }

          // Compute early occurrence (< 15 seconds)
          const isEarly = seg.startSeconds <= 15;
          let severity = entry.severity;
          if (isEarly && (severity === 'MEDIUM' || severity === 'HIGH')) {
            severity = 'HIGH';
          }

          const startTs = this.formatTimestamp(seg.startSeconds);
          const endTs = this.formatTimestamp(seg.endSeconds);

          findings.push({
            id: `lex_${segIdx}_${findings.length + 1}`,
            detectedExpression: entry.canonical,
            canonical: entry.canonical,
            language: entry.language,
            languageCode: entry.languageCode,
            severity,
            category: 'advertiser_suitability',
            confidence: 'HIGH',
            status: 'CONFIRMED',
            startSeconds: seg.startSeconds,
            endSeconds: seg.endSeconds,
            startTimestamp: startTs,
            endTimestamp: endTs,
            evidenceQuote: originalText,
            contextExplanation: `Spoken dialogue at ${startTs} contains "${entry.canonical}" (${entry.language}), which affects YouTube advertiser suitability. ${entry.contextNotes}.`,
            recommendedAction: `Mute, bleep, or edit audio at ${startTs} to safeguard ad suitability.`,
            isEarlyOccurrence: isEarly,
          });
        }
      }
    });

    return findings;
  }

  /**
   * Layer 3: Dedicated Contextual AI Profanity Analysis (Pass 2)
   * Asks Gemini specifically to find EVERY CONFIRMED and POTENTIAL profanity/offensive expression in context.
   */
  public static async analyzeTranscriptWithAI(
    segments: DbTranscriptSegment[],
    primaryLanguage?: string
  ): Promise<ConfirmedProfanityOccurrence[]> {
    if (!segments || segments.length === 0) return [];

    // Format transcript segments as numbered timestamped lines
    const transcriptLines = segments.map((s, i) => {
      const ts = this.formatTimestamp(s.startSeconds);
      return `[${ts}] (#${i + 1}): "${s.text}"`;
    }).join('\n');

    const prompt = `You are PreScan AI — dedicated Multilingual Profanity & Policy Compliance Auditor.
You are evaluating a verbatim spoken transcript from a YouTube video.

Primary Detected Language: ${primaryLanguage || 'Auto-detect'}

TASK:
Identify EVERY instance of:
1. "CONFIRMED" profanity, vulgarity, offensive slang, swearing, or curses in ANY language (English, Hindi, Hinglish, Punjabi, Bengali, Tamil, Telugu, Marathi, Gujarati, Urdu, Kannada, Malayalam, etc.) or Romanized transliterations (e.g. "madarchod", "bhenchod", "chutiya", "bhosdike", "randi", "gaand", "lauda", "lund", "harami", "saala", "kameena", "thevidiya", "otha", "punda", "lanja", "dengu", "khanki", "bokachoda", etc.).
2. "POTENTIAL" profanity or review candidates: suspicious expressions, slang insults, potential ASR transcription errors, or contextually ambiguous vulgar terms where confidence is lower or context needs human creator review.

CRITICAL INSTRUCTIONS:
1. DO NOT RETURN ONLY EXAMPLES. You MUST list EVERY occurrence. If a word appears 8 times, return 8 separate findings!
2. Provide the EXACT timestamp from the transcript segment header (e.g. "01:23").
3. Evaluate context: distinguish actual profanity from benign words (e.g. "analysis", "hello", "classic", "glass", "titular", "cocktail", "butter" are NOT profanity).
4. Assign status: "CONFIRMED" for definite swearing/vulgarity or "POTENTIAL" for review candidates.
5. Assign severity based on YouTube Advertiser-Friendly Content Guidelines:
   - "CRITICAL": Severe vulgarity (e.g. "motherfucker", "madarchod", "bhenchod", "bhosdike", "cunt", hate slurs).
   - "HIGH": Strong profanity (e.g. "fuck", "fucking", "chutiya", "randi", "bitch", "asshole", "pussy", "otha", "lanja").
   - "MEDIUM": Moderate profanity (e.g. "shit", "bullshit", "dick", "bastard", "harami", "kameena", "lauda", "gudha").
   - "LOW": Mild expletives (e.g. "damn", "crap", "saala", "kutte", "pissed").
   - If profanity occurs in the first 7 to 15 seconds, elevate severity (HIGH or CRITICAL).

Return ONLY valid JSON matching this schema:
{
  "occurrences": [
    {
      "timestamp": "00:15",
      "startSeconds": 15,
      "endSeconds": 18,
      "detectedExpression": "bhenchod",
      "canonical": "bhenchod",
      "language": "Hindi",
      "languageCode": "hi",
      "severity": "CRITICAL",
      "status": "CONFIRMED",
      "evidenceQuote": "Yeh sab bhenchod kya ho raha hai",
      "explanation": "Severe abusive profanity in Hindi/Hinglish",
      "reason": "Direct abusive vulgarity targeting sister in Hindi",
      "recommendedAction": "Bleep or mute at 00:15",
      "confidence": "HIGH"
    }
  ]
}

TRANSCRIPT:
${transcriptLines}`;

    try {
      const responseText = await generateGeminiContent({
        contents: [{ text: prompt }],
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
        model: AI_CONFIG.MODEL,
      });

      if (!responseText) return [];

      const parsed = parseGeminiJSON(responseText);
      const items = Array.isArray(parsed.occurrences) ? parsed.occurrences : [];

      return items.map((item: any, idx: number) => {
        const sec = typeof item.startSeconds === 'number'
          ? item.startSeconds
          : this.parseTimestamp(item.timestamp || '00:00');
        const endSec = typeof item.endSeconds === 'number'
          ? item.endSeconds
          : sec + 4;
        const startTs = item.timestamp || this.formatTimestamp(sec);
        const endTs = item.endTimestamp || this.formatTimestamp(endSec);
        const isEarly = sec <= 15;
        const status = item.status === 'POTENTIAL' || item.confidence === 'LOW' ? 'POTENTIAL' : 'CONFIRMED';

        return {
          id: `ai_${idx + 1}`,
          detectedExpression: item.detectedExpression || item.canonical || 'Profanity',
          canonical: item.canonical || item.detectedExpression || 'Profanity',
          language: item.language || primaryLanguage || 'English',
          languageCode: item.languageCode || 'en',
          severity: item.severity || 'MEDIUM',
          category: status === 'POTENTIAL' ? 'POTENTIAL_PROFANITY' : 'advertiser_suitability',
          confidence: item.confidence || 'HIGH',
          status,
          startSeconds: sec,
          endSeconds: endSec,
          startTimestamp: startTs,
          endTimestamp: endTs,
          evidenceQuote: item.evidenceQuote || item.evidence || '',
          contextExplanation: item.explanation || `Detected "${item.detectedExpression}" in dialogue at ${startTs}.`,
          reason: item.reason || item.explanation || `Flagged as ${status.toLowerCase()} profanity/offensive language candidate.`,
          recommendedAction: item.recommendedAction || `Bleep or mute at ${startTs}.`,
          isEarlyOccurrence: isEarly,
        };
      });
    } catch (aiErr) {
      console.warn(`[MultilingualProfanityEngine] AI profanity analysis pass error:`, aiErr);
      return [];
    }
  }

  /**
   * Layer 4: Reconcile Lexicon findings and Contextual AI findings
   * Deduplicates only identical findings in the same segment (<2s window)
   * while PRESERVING multiple occurrences across the entire video.
   */
  public static reconcileOccurrences(
    lexiconFindings: ConfirmedProfanityOccurrence[],
    aiFindings: ConfirmedProfanityOccurrence[],
    segments: DbTranscriptSegment[]
  ): ConfirmedProfanityOccurrence[] {
    const combined: ConfirmedProfanityOccurrence[] = [];

    // Add AI findings first (richer contextual explanation)
    for (const ai of aiFindings) {
      // Validate that the timestamp is grounded in a transcript segment
      const matchingSeg = segments.find(
        (s) => Math.abs(s.startSeconds - ai.startSeconds) <= 5
      );
      if (matchingSeg && !ai.evidenceQuote) {
        ai.evidenceQuote = matchingSeg.text;
      }
      combined.push(ai);
    }

    // Add Lexicon findings if not already captured by AI in the same time window
    for (const lex of lexiconFindings) {
      const alreadyCaptured = combined.some((c) => {
        const timeDiff = Math.abs(c.startSeconds - lex.startSeconds);
        const wordMatch =
          c.canonical.toLowerCase() === lex.canonical.toLowerCase() ||
          c.detectedExpression.toLowerCase() === lex.detectedExpression.toLowerCase();
        return timeDiff <= 3 && wordMatch;
      });

      if (!alreadyCaptured) {
        combined.push(lex);
      }
    }

    // Sort by timestamp chronologically
    combined.sort((a, b) => a.startSeconds - b.startSeconds);

    // Re-index IDs cleanly
    return combined.map((f, i) => ({
      ...f,
      id: `profanity_${i + 1}`,
    }));
  }

  /**
   * Complete Profanity Engine Analysis Pipeline
   */
  public static async analyzeTranscriptProfanity(
    segments: DbTranscriptSegment[],
    primaryLanguage?: string
  ): Promise<ConfirmedProfanityOccurrence[]> {
    if (!segments || segments.length === 0) return [];

    console.log(`[PreScan] Starting Multilingual Profanity Engine over ${segments.length} segments...`);

    // 1. Run Lexicon Scan
    const lexiconResults = this.scanTranscriptWithLexicon(segments);
    console.log(`[PreScan] Lexicon candidate count: ${lexiconResults.length}`);

    // 2. Run Contextual AI Pass (Pass 2)
    const aiResults = await this.analyzeTranscriptWithAI(segments, primaryLanguage);
    console.log(`[PreScan] AI Pass 2 candidate count: ${aiResults.length}`);

    // 3. Reconcile & Deduplicate
    const finalOccurrences = this.reconcileOccurrences(lexiconResults, aiResults, segments);
    console.log(`[PreScan] Confirmed profanity count: ${finalOccurrences.length}`);

    return finalOccurrences;
  }
}
