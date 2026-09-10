import path from 'path';
import fs from 'fs';
import { getGeminiClient } from './gemini.service';

export interface GeminiUploadedFileRef {
  name: string;
  uri: string;
  mimeType: string;
}

export class GeminiMediaService {
  /**
   * Detect mime type based on file extension
   */
  private static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.mp4':
        return 'video/mp4';
      case '.mov':
        return 'video/quicktime';
      case '.webm':
        return 'video/webm';
      case '.avi':
        return 'video/x-msvideo';
      case '.mkv':
        return 'video/x-matroska';
      case '.mp3':
        return 'audio/mp3';
      case '.wav':
        return 'audio/wav';
      case '.m4a':
      case '.aac':
        return 'audio/mp4';
      case '.ogg':
        return 'audio/ogg';
      default:
        return 'video/mp4';
    }
  }

  /**
   * Uploads local video/audio file to Gemini Files API and waits for state to become ACTIVE.
   */
  static async uploadVideoForAnalysis(
    filePath: string,
    mimeTypeOverride?: string
  ): Promise<GeminiUploadedFileRef> {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Local media file not found for Gemini upload: ${filePath || 'undefined'}`);
    }

    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      throw new Error('Local media file is empty (0 bytes). Cannot upload to Gemini.');
    }

    const mimeType = mimeTypeOverride || this.getMimeType(filePath);
    const ai = getGeminiClient();

    console.log(`[GeminiMediaService] Uploading file to Gemini Files API: ${filePath} (${mimeType}, ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)`);

    const uploaded = await ai.files.upload({
      file: filePath,
      mimeType,
      config: {
        mimeType,
      },
    } as any);

    if (!uploaded || !uploaded.name || !uploaded.uri) {
      throw new Error('Gemini Files API upload failed to return valid file reference.');
    }

    let fileState = uploaded.state;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s max wait

    while (fileState === 'PROCESSING' && attempts < maxAttempts) {
      attempts++;
      console.log(`[GeminiMediaService] File ${uploaded.name} is PROCESSING. Waiting 2s (attempt ${attempts}/${maxAttempts})...`);
      await new Promise((res) => setTimeout(res, 2000));

      try {
        const fileCheck = await ai.files.get({ name: uploaded.name });
        fileState = fileCheck.state;
        if (fileState === 'FAILED') {
          throw new Error(`Gemini processing for file ${uploaded.name} failed with state FAILED.`);
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('FAILED')) throw checkErr;
        console.warn(`[GeminiMediaService] Error checking file state:`, checkErr.message);
      }
    }

    if (fileState === 'PROCESSING') {
      throw new Error(`Gemini file processing timed out after ${maxAttempts * 2} seconds for file ${uploaded.name}.`);
    }

    console.log(`[GeminiMediaService] File ${uploaded.name} is ready with state ${fileState}. URI: ${uploaded.uri}`);

    return {
      name: uploaded.name,
      uri: uploaded.uri,
      mimeType: uploaded.mimeType || mimeType,
    };
  }

  /**
   * Deletes a file from Gemini Files API after analysis finishes.
   */
  static async deleteRemoteFile(fileName: string): Promise<void> {
    if (!fileName) return;
    try {
      const ai = getGeminiClient();
      await ai.files.delete({ name: fileName });
      console.log(`[GeminiMediaService] Deleted remote file ${fileName} from Gemini Files API.`);
    } catch (err: any) {
      console.warn(`[GeminiMediaService] Failed to delete remote Gemini file ${fileName}:`, err?.message);
    }
  }
}
