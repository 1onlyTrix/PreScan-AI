import fs from 'fs';
import path from 'path';
import { parseGeminiJSON } from '../utils/jsonUtils';
import { generateGeminiContent } from './gemini.service';

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface TranscriptionResult {
  language: string;
  durationSeconds: number;
  segments: TranscriptSegment[];
  fullText: string;
}

export class TranscriptionService {
  /**
   * Transcribe an audio file using Gemini audio understanding.
   * NO MOCK DATA OR FALLBACK TRANSCRIPTS ARE ALLOWED.
   */
  static async transcribeAudio(
    audioFilePath: string,
    fallbackDurationSeconds: number,
    metadataHint?: { title?: string; description?: string }
  ): Promise<TranscriptionResult> {
    if (!audioFilePath || !fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found for transcription at path: ${audioFilePath || 'undefined'}`);
    }

    const fileStats = fs.statSync(audioFilePath);
    if (fileStats.size === 0) {
      throw new Error('Extracted audio file is 0 bytes. Cannot perform audio transcription.');
    }

    const ext = path.extname(audioFilePath).toLowerCase();
    let mimeType = 'audio/mp3';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.aac') mimeType = 'audio/aac';
    else if (ext === '.m4a') mimeType = 'audio/mp4';
    else if (ext === '.ogg') mimeType = 'audio/ogg';

    const fileBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = fileBuffer.toString('base64');

    const promptText = `Listen carefully to this audio track and perform precise speech-to-text transcription.
Extract timestamped segments for all spoken dialogue.

Return ONLY a valid JSON object strictly matching this schema:
{
  "language": "en",
  "segments": [
    {
      "startSeconds": 0,
      "endSeconds": 5,
      "text": "Exact spoken words in this audio segment"
    }
  ]
}

If no spoken words exist in the audio, return empty segments array.`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ];

    const responseText = await generateGeminiContent({
      contents,
      temperature: 0.1,
      responseMimeType: 'application/json',
    });

    let parsed: any;
    try {
      parsed = parseGeminiJSON(responseText);
    } catch (parseErr: any) {
      throw new Error(`Failed to parse transcription response from Gemini: ${parseErr.message}`);
    }

    if (!parsed || !Array.isArray(parsed.segments)) {
      throw new Error('Gemini audio transcription output did not contain a valid segments array.');
    }

    const segments: TranscriptSegment[] = parsed.segments.map((s: any) => ({
      startSeconds: Math.max(0, Number(s.startSeconds) || 0),
      endSeconds: Math.max(0, Number(s.endSeconds) || 0),
      text: String(s.text || '').trim(),
    })).filter((s: TranscriptSegment) => s.text.length > 0);

    const fullText = segments.map((s) => s.text).join(' ');
    const lastSegEnd = segments.length > 0 ? Math.max(...segments.map((s) => s.endSeconds)) : 0;
    const durationSeconds = Math.max(fallbackDurationSeconds || 0, lastSegEnd || 0);

    return {
      language: parsed.language || 'en',
      durationSeconds,
      segments,
      fullText,
    };
  }
}
