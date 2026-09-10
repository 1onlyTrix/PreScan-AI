export interface PresignedUploadUrlResult {
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

/**
 * Media Storage Service Boundary
 * Prepares presigned URL generation and media storage isolation for video/audio processing.
 */
export interface IStorageService {
  getPresignedUploadUrl(
    organizationId: string,
    fileName: string,
    mimeType: string,
    fileSizeBytes: number
  ): Promise<PresignedUploadUrlResult>;
  getDownloadUrl(storageKey: string): Promise<string>;
  deleteFile(storageKey: string): Promise<void>;
}
