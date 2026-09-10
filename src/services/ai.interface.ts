import { Finding, Report, ScanConfig } from '../types';

export interface VideoMetadataPayload {
  title: string;
  description: string;
  tags: string[];
  category?: string;
  language?: string;
}

export interface AudioAnalysisRequest {
  scanId: string;
  audioStorageKey: string;
  config: ScanConfig;
}

export interface MetadataAnalysisRequest {
  scanId: string;
  metadata: VideoMetadataPayload;
  config: ScanConfig;
}

/**
 * PreScan AI Engine Service Contract Boundary
 * Provides architectural interface for future AI analysis engine.
 */
export interface IPreScanAnalysisService {
  analyzeAudio(request: AudioAnalysisRequest): Promise<Finding[]>;
  analyzeMetadata(request: MetadataAnalysisRequest): Promise<Finding[]>;
  generateReport(scanId: string, findings: Finding[], videoMetadata: VideoMetadataPayload): Promise<Report>;
}
