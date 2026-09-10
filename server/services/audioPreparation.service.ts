import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = promisify(execFile);

export interface AudioPreparationResult {
  hasAudio: boolean;
  audioFilePath?: string;
  durationSeconds: number;
  sampleRate?: number;
  channels?: number;
  format?: string;
  errorMessage?: string;
}

export class AudioPreparationService {
  /**
   * Probe media file using ffprobe to check for audio streams and duration
   */
  static async probeMedia(filePath: string): Promise<{
    hasAudio: boolean;
    durationSeconds: number;
    hasVideo: boolean;
    audioCodec?: string;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Media file not found at path: ${filePath}`);
      }

      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      const data = JSON.parse(stdout);
      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');

      const durationStr = data.format?.duration || audioStream?.duration || videoStream?.duration || '0';
      const durationSeconds = parseFloat(durationStr) || 0;

      return {
        hasAudio: !!audioStream,
        durationSeconds: Math.round(durationSeconds),
        hasVideo: !!videoStream,
        audioCodec: audioStream?.codec_name,
      };
    } catch (error: any) {
      console.warn(`[AudioPreparationService] ffprobe error:`, error.message);
      // Fallback if ffprobe fails or file is raw audio
      return {
        hasAudio: true,
        durationSeconds: 0,
        hasVideo: false,
      };
    }
  }

  /**
   * Extract or normalize audio track to an AI-ready MP3 file (16kHz mono or stereo)
   */
  static async prepareAudio(
    inputFilePath: string,
    outputDirectory: string,
    scanId: string
  ): Promise<AudioPreparationResult> {
    try {
      if (!fs.existsSync(inputFilePath)) {
        return {
          hasAudio: false,
          durationSeconds: 0,
          errorMessage: `Input media file does not exist: ${inputFilePath}`,
        };
      }

      const probe = await this.probeMedia(inputFilePath);
      if (!probe.hasAudio) {
        return {
          hasAudio: false,
          durationSeconds: 0,
          errorMessage: 'No usable audio track was detected for analysis.',
        };
      }

      if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
      }

      const outputAudioPath = path.join(outputDirectory, `${scanId}_audio_extracted.mp3`);

      // Extract 16kHz mono audio optimized for transcription & speech reasoning
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        inputFilePath,
        '-vn', // no video
        '-acodec',
        'libmp3lame',
        '-ar',
        '16000', // 16kHz sample rate
        '-ac',
        '1', // mono
        '-b:a',
        '64k',
        outputAudioPath,
      ]);

      if (!fs.existsSync(outputAudioPath)) {
        return {
          hasAudio: false,
          durationSeconds: 0,
          errorMessage: 'Failed to generate extracted audio file.',
        };
      }

      const extractedProbe = await this.probeMedia(outputAudioPath);

      return {
        hasAudio: true,
        audioFilePath: outputAudioPath,
        durationSeconds: extractedProbe.durationSeconds || probe.durationSeconds,
        format: 'mp3',
        sampleRate: 16000,
        channels: 1,
      };
    } catch (error: any) {
      console.error('[AudioPreparationService] Extraction error:', error);
      return {
        hasAudio: false,
        durationSeconds: 0,
        errorMessage: error.message || 'Audio extraction failed.',
      };
    }
  }
}
