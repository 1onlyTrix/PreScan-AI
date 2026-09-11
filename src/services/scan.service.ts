import { Scan, IngestionJob, IngestionLog } from '../types/models';
import { apiFetch, getStoredToken, getValidAuthToken, getStoredWorkspaceId, getApiUrl } from '../lib/api';

export interface ScanListResponse {
  scans: Scan[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScanDetailResponse {
  scan: Scan;
  job?: IngestionJob;
}

export interface YouTubeValidationResponse {
  isValid: boolean;
  videoId?: string;
  normalizedUrl?: string;
  error?: string;
  metadata?: {
    title?: string;
    authorName?: string;
    thumbnailUrl?: string;
    providerUrl?: string;
    videoId?: string;
    description?: string;
    tags?: string[];
    category?: string;
    channelId?: string;
    durationSeconds?: number;
    durationFormatted?: string;
    tagsUnavailable?: boolean;
  };
}

export interface ScanLogsResponse {
  scanStatus: string;
  jobStatus: string;
  progressPercent: number;
  currentStep: string;
  logs: IngestionLog[];
  errorDetails?: string;
}

export const ScanService = {
  /**
   * Validate a YouTube URL and fetch preview metadata
   */
  async validateYouTubeUrl(url: string): Promise<YouTubeValidationResponse> {
    const res = await apiFetch('/api/scans/youtube/validate', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        isValid: false,
        error: data.error || 'Failed to validate YouTube URL',
      };
    }
    return data;
  },

  /**
   * Queue a YouTube link scan
   */
  async submitYouTubeScan(params: {
    url: string;
    organizationId?: string;
    metadata: {
      title?: string;
      description?: string;
      category?: string;
      tags?: string[];
      madeForKids?: boolean;
      language?: string;
      sensitivityLevel?: 'STANDARD' | 'STRICT';
      checkCommunityGuidelines?: boolean;
      checkAdvertiserSuitability?: boolean;
      checkCopyrightSignals?: boolean;
      checkMetadataIntegrity?: boolean;
    };
  }): Promise<{ scan: Scan; job: IngestionJob }> {
    const res = await apiFetch('/api/scans/youtube', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to initiate YouTube scan.');
    }
    return data;
  },

  /**
   * Upload media file and queue scan
   */
  async submitFileUploadScan(
    formData: FormData,
    onProgress?: (progressPercent: number) => void
  ): Promise<{ scan: Scan; job: IngestionJob }> {
    const token = (await getValidAuthToken()) || getStoredToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', getApiUrl('/api/scans/upload'));
      xhr.withCredentials = true;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        if (token.startsWith('demo_')) {
          xhr.setRequestHeader('x-demo-user', token.replace('demo_', ''));
        }
      }

      const activeWsId = getStoredWorkspaceId();
      if (activeWsId) {
        xhr.setRequestHeader('x-workspace-id', activeWsId);
        xhr.setRequestHeader('x-organization-id', activeWsId);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const contentType = xhr.getResponseHeader('content-type') || '';
          if (contentType.includes('text/html')) {
            reject(new Error('PreScan backend service is unavailable or returned an HTML fallback response. Please verify VITE_API_BASE_URL points to your deployed backend.'));
            return;
          }
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Upload failed.'));
          }
        } catch {
          reject(new Error('Invalid response from PreScan backend server during file upload.'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Unable to connect to PreScan backend server during file upload. Please check network connection and backend CORS configuration.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * List scans for the active workspace
   */
  async listScans(params?: {
    organizationId?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScanListResponse> {
    const query = new URLSearchParams();
    if (params?.organizationId) query.set('organizationId', params.organizationId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const res = await apiFetch(`/api/scans?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch scans.');
    }
    return data;
  },

  /**
   * Get single scan by ID
   */
  async getScanById(id: string): Promise<ScanDetailResponse> {
    const res = await apiFetch(`/api/scans/${id}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Scan not found.');
    }
    return data;
  },

  /**
   * Fetch live logs & status for a scan
   */
  async getScanLogs(id: string): Promise<ScanLogsResponse> {
    const res = await apiFetch(`/api/scans/${id}/logs`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch ingestion logs.');
    }
    return data;
  },

  /**
   * Cancel an in-progress scan
   */
  async cancelScan(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`/api/scans/${id}/cancel`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to cancel scan.');
    }
    return data;
  },

  /**
   * Delete a scan
   */
  async deleteScan(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`/api/scans/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete scan.');
    }
    return data;
  },

  /**
   * Submit built-in test sample fixture
   */
  async submitSampleScan(sampleId: string, organizationId?: string): Promise<{ scan: Scan; job: IngestionJob }> {
    const res = await apiFetch('/api/scans/sample', {
      method: 'POST',
      body: JSON.stringify({ sampleId, organizationId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit test sample scan.');
    }
    return data;
  },

  /**
   * Retry an existing failed or incomplete scan
   */
  async retryScan(id: string): Promise<{ success: boolean; scan: Scan }> {
    const res = await apiFetch(`/api/scans/${id}/retry`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to retry scan.');
    }
    return data;
  },

  /**
   * Trigger or retry PreScan AI analysis on scan
   */
  async startScanAnalysis(id: string): Promise<any> {
    const res = await apiFetch(`/api/scans/${id}/analyze`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to initiate PreScan analysis.');
    }
    return data;
  },

  /**
   * Fetch live analysis job status and logs
   */
  async getAnalysisStatus(id: string): Promise<any> {
    const res = await apiFetch(`/api/scans/${id}/analysis`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch analysis job status.');
    }
    return data;
  },

  /**
   * Fetch persisted PreScan report, transcript and reviews
   */
  async getScanReport(id: string): Promise<{ scan: Scan; report: any; transcript: any; reviews?: any[] }> {
    const res = await apiFetch(`/api/scans/${id}/report`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch scan report.');
    }
    return data;
  },

  /**
   * Fetch finding review states and notes for a scan
   */
  async getScanReviews(id: string): Promise<{ reviews: any[] }> {
    const res = await apiFetch(`/api/scans/${id}/reviews`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch finding reviews.');
    }
    return data;
  },

  /**
   * Update finding review state / creator note
   */
  async updateFindingReview(
    scanId: string,
    findingId: string,
    reviewStatus: 'OPEN' | 'REVIEWED' | 'NEEDS_EDIT' | 'NOT_APPLICABLE',
    creatorNote?: string
  ): Promise<{ success: boolean; review: any }> {
    const res = await apiFetch(`/api/scans/${scanId}/reviews/${findingId}`, {
      method: 'PUT',
      body: JSON.stringify({ reviewStatus, creatorNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update finding review.');
    }
    return data;
  },

  /**
   * Fetch transcript only
   */
  async getTranscript(id: string): Promise<{ transcript: any }> {
    const res = await apiFetch(`/api/scans/${id}/transcript`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch transcript.');
    }
    return data;
  },
};
