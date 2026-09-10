import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileVideo,
  Youtube,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Trash2,
  XCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Terminal,
  Sparkles,
  Info,
  Check,
  AlertTriangle,
  Play,
  FileCheck2,
  HelpCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ScanService } from '../services/scan.service';
import { SupabaseDataService } from '../services/supabaseData.service';
import { StorageService } from '../services/storage.service';
import { Scan, IngestionJob } from '../types/models';
import { ScanStatus } from '../types/enums';
import { PreScanReportView } from '../components/PreScanReportView';
import { PreScanV1ReportData } from '../types/report.types';
import { ROUTES } from '../router/routes';

interface ScanDetailPageProps {
  scanId: string;
  onNavigate: (route: string) => void;
}

interface PipelineStageInfo {
  id: string;
  key: string;
  name: string;
  description: string;
  minPercent: number;
}

const PIPELINE_STAGES: PipelineStageInfo[] = [
  { id: '1', key: 'QUEUED', name: 'Queue & Entitlements', description: 'Verifying workspace scan allowance & tenant context', minPercent: 5 },
  { id: '2', key: 'VALIDATING', name: 'Input & SSRF Validation', description: 'Validating media headers, codecs, and video accessibility', minPercent: 15 },
  { id: '3', key: 'FETCHING_METADATA', name: 'Metadata Extraction', description: 'Extracting video attributes, titles, and channel context', minPercent: 25 },
  { id: '4', key: 'ACQUIRING_MEDIA', name: 'Media Storage & Partitioning', description: 'Partitioning media payload in isolated tenant storage', minPercent: 40 },
  { id: '5', key: 'EXTRACTING_AUDIO', name: 'Audio Track Extraction', description: 'Extracting clean audio stream & verifying dialogue channels', minPercent: 55 },
  { id: '6', key: 'TRANSCRIBING', name: 'Dialogue Transcription', description: 'Generating millisecond-timestamped speech transcript', minPercent: 70 },
  { id: '7', key: 'ANALYZING', name: 'Policy Risk Evaluation', description: 'Evaluating Community Guidelines, Monetization & Copyright', minPercent: 85 },
  { id: '8', key: 'VALIDATING_REPORT', name: 'Report Schema & Grounding', description: 'Synthesizing actionable findings and creator recommendations', minPercent: 95 },
];

export const ScanDetailPage: React.FC<ScanDetailPageProps> = ({ scanId, onNavigate }) => {
  const [scan, setScan] = useState<Scan | null>(null);
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [report, setReport] = useState<PreScanV1ReportData | null>(null);
  const [transcript, setTranscript] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [signedMediaUrl, setSignedMediaUrl] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Generate signed URL for private Supabase Storage app-files bucket
  useEffect(() => {
    if (scan?.mediaInfo?.storagePath) {
      StorageService.getSignedUrl(scan.mediaInfo.storagePath).then((url) => {
        if (url) setSignedMediaUrl(url);
      });
    } else if (scan?.mediaInfo?.signedUrl) {
      setSignedMediaUrl(scan.mediaInfo.signedUrl);
    }
  }, [scan?.mediaInfo?.storagePath, scan?.mediaInfo?.signedUrl]);

  // Fetch report data if scan completed
  const fetchReport = useCallback(async () => {
    try {
      const repData = await ScanService.getScanReport(scanId);
      if (repData && repData.report) {
        setReport(repData.report);
        setTranscript(repData.transcript);
        if (repData.reviews) {
          setReviews(repData.reviews);
        }
      }
    } catch (err) {
      console.warn('Report not ready yet:', err);
    }
  }, [scanId]);

  // Handle Review Update
  const handleUpdateReview = async (findingId: string, reviewStatus: any, creatorNote?: string) => {
    try {
      const res = await ScanService.updateFindingReview(scanId, findingId, reviewStatus, creatorNote);
      if (res.success && res.review) {
        setReviews((prev) => {
          const idx = prev.findIndex((r) => r.findingId === findingId);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = res.review;
            return copy;
          } else {
            return [...prev, res.review];
          }
        });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update finding review state.');
    }
  };

  // Fetch scan data
  const fetchScan = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const data = await ScanService.getScanById(scanId);
      setScan(data.scan);
      if (data.job) setJob(data.job);
      setError(null);

      if (data.scan.status === ScanStatus.COMPLETED) {
        await fetchReport();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load scan details.');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [scanId, fetchReport]);

  // Retry pipeline execution
  const handleRetryScan = async () => {
    setIsRetrying(true);
    try {
      const res = await ScanService.retryScan(scanId);
      if (res.scan) {
        setScan(res.scan);
        setReport(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to retry scan.');
    } finally {
      setIsRetrying(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Active polling while scan is running
  useEffect(() => {
    if (!scan) return;
    const isTerminal =
      scan.status === ScanStatus.COMPLETED ||
      scan.status === ScanStatus.FAILED ||
      scan.status === ScanStatus.CANCELLED;

    if (isTerminal) return;

    const interval = setInterval(async () => {
      try {
        const logsData = await ScanService.getScanLogs(scanId);
        setScan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: logsData.scanStatus as ScanStatus,
            progressPercent: logsData.progressPercent,
            currentStepMessage: logsData.currentStep,
            errorMessage: logsData.errorDetails || prev.errorMessage,
          };
        });

        if (job) {
          setJob((prevJob) => {
            if (!prevJob) return null;
            return {
              ...prevJob,
              status: logsData.jobStatus as any,
              progressPercent: logsData.progressPercent,
              currentStep: logsData.currentStep,
              logs: logsData.logs,
            };
          });
        }

        if (logsData.scanStatus === ScanStatus.COMPLETED) {
          fetchReport();
          fetchScan(true);
        } else if (
          logsData.scanStatus === ScanStatus.FAILED ||
          logsData.scanStatus === ScanStatus.CANCELLED
        ) {
          fetchScan(true);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scan?.status, scanId, fetchScan, fetchReport, job]);

  // Scroll terminal to bottom on new logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job?.logs?.length]);

  // Cancel in-progress scan
  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await ScanService.cancelScan(scanId);
      await fetchScan(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel scan.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Delete scan
  const handleDeleteScan = async () => {
    setIsDeleting(true);
    try {
      if (scan?.mediaInfo?.storagePath) {
        await StorageService.deleteFile(scan.mediaInfo.storagePath).catch(() => {});
      }
      await SupabaseDataService.deleteScan(scanId).catch(() => {});
      await ScanService.deleteScan(scanId).catch(() => {});
      onNavigate(ROUTES.SCANS);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete scan.');
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Status helper badge
  const getStatusBadge = (status: ScanStatus | string) => {
    switch (status) {
      case ScanStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Scan Complete
          </span>
        );
      case ScanStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900 border border-red-300">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Scan Failed
          </span>
        );
      case ScanStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <XCircle className="w-3.5 h-3.5 text-neutral-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-white border border-neutral-800 shadow-2xs">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            Analyzing ({scan?.progressPercent || 5}%)
          </span>
        );
    }
  };

  // Calculate active stage index
  const getActiveStageIndex = () => {
    if (!scan) return 0;
    if (scan.status === ScanStatus.COMPLETED) return PIPELINE_STAGES.length;
    if (scan.status === ScanStatus.FAILED || scan.status === ScanStatus.CANCELLED) {
      const idx = PIPELINE_STAGES.findIndex((s) => s.key === scan.stage || s.key === scan.status);
      return idx >= 0 ? idx : 0;
    }

    const idx = PIPELINE_STAGES.findIndex((s) => s.key === scan.status || s.key === scan.stage);
    if (idx >= 0) return idx;

    // Fallback based on progress percent
    const percent = scan.progressPercent || 0;
    for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
      if (percent >= PIPELINE_STAGES[i].minPercent) return i;
    }
    return 0;
  };

  const activeStageIdx = getActiveStageIndex();

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
        <p className="text-xs text-neutral-500 font-mono">Loading scan details & state machine...</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="space-y-6 py-12 max-w-xl mx-auto">
        <Alert variant="error" title="Scan Not Found">
          {error || 'The requested scan record could not be loaded or has been deleted.'}
        </Alert>
        <Button variant="outline" onClick={() => onNavigate(ROUTES.SCANS)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Scan History
        </Button>
      </div>
    );
  }

  const isTerminal =
    scan.status === ScanStatus.COMPLETED ||
    scan.status === ScanStatus.FAILED ||
    scan.status === ScanStatus.CANCELLED;

  const logs = job?.logs || [];
  const errorCode = scan.errorCode || scan.errorDetails?.code || 'PROCESSING_ERROR';
  const attempts = scan.attempts || 1;
  const canRetry = attempts < 3;

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumbs */}
      <PageHeader
        title={scan.title}
        description={`PreScan Workflow · Initiated ${new Date(scan.createdAt).toLocaleString()}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate(ROUTES.DASHBOARD) },
              { label: 'Scans', onClick: () => onNavigate(ROUTES.SCANS) },
              { label: scan.title },
            ]}
          />
        }
        badge={getStatusBadge(scan.status)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isTerminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
                leftIcon={<XCircle className="w-4 h-4 text-neutral-500" />}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Scan'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash2 className="w-4 h-4 text-red-500" />}
            >
              Delete
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate(ROUTES.NEW_SCAN)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Scan
            </Button>
          </div>
        }
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Delete Scan Record?</h3>
                <p className="text-xs text-neutral-500">This action will remove the scan and its stored media files.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>{scan.title}</strong>? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                Keep Scan
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteScan}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAILED STATE CARDS */}
      {scan.status === ScanStatus.FAILED && (
        <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-red-100">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 shrink-0 border border-red-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">
                    {scan.errorMessage || scan.errorDetails?.message || 'Scan Processing Encountered an Error'}
                  </h3>
                  <button
                    onClick={() => handleCopyCode(errorCode)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                    title="Click to copy error code"
                  >
                    <code>{errorCode}</code>
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-red-500" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {scan.errorDetails?.reason || 'The media processing pipeline was interrupted during execution.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-neutral-500 font-medium">
                Attempt {attempts} of 3
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRetryScan}
                disabled={isRetrying || !canRetry}
                className="bg-neutral-900 text-white hover:bg-neutral-800"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </Button>
            </div>
          </div>

          {/* Actionable Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                <HelpCircle className="w-4 h-4 text-neutral-600" />
                Recommended Next Step
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                {scan.errorDetails?.action ||
                  'Verify that the video is public/unlisted and contains clear audio dialogue, then click Try Again.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                <FileVideo className="w-4 h-4 text-neutral-600" />
                Alternative Source Option
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                If YouTube URL streaming is restricted, you can upload the original MP4 video or MP3 audio file directly.
              </p>
            </div>
          </div>

          {/* Collapsible Technical Error Logs */}
          <div className="border-t border-neutral-100 pt-4">
            <button
              onClick={() => setShowTechnicalLogs(!showTechnicalLogs)}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Technical Diagnostics & Event Logs</span>
              {showTechnicalLogs ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>

            {showTechnicalLogs && (
              <div className="mt-3 bg-neutral-950 text-neutral-200 font-mono text-xs rounded-xl p-4 space-y-2 max-h-56 overflow-y-auto border border-neutral-900">
                {logs.length > 0 ? (
                  logs.map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="text-neutral-500 text-[10px] shrink-0 select-none">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                          log.level === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : log.level === 'WARN'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : log.level === 'ERROR'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-neutral-300">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 text-xs py-1">No execution logs captured.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLETED REPORT VIEW */}
      {scan.status === ScanStatus.COMPLETED && report ? (
        <PreScanReportView
          report={report}
          transcript={transcript}
          reviews={reviews}
          onUpdateReview={handleUpdateReview}
          onRetryAnalysis={handleRetryScan}
          isAnalyzing={isRetrying}
        />
      ) : (
        /* IN-PROGRESS PROCESSING PIPELINE VIEW */
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    PreScan Real-Time Execution Pipeline
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500 mt-0.5">
                    Live asynchronous processing through 8 automated verification and AI evaluation stages.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-900 bg-neutral-100 px-3 py-1 rounded-md border border-neutral-200">
                    {scan.progressPercent}% Complete
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Dynamic Progress Bar */}
              <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden border border-neutral-200">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    scan.status === ScanStatus.FAILED
                      ? 'bg-red-500'
                      : scan.status === ScanStatus.COMPLETED
                      ? 'bg-emerald-500'
                      : 'bg-neutral-900'
                  }`}
                  style={{ width: `${Math.max(5, scan.progressPercent)}%` }}
                />
              </div>

              {/* 8-Stage Stepper Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isCompleted = idx < activeStageIdx;
                  const isActive = idx === activeStageIdx && !isTerminal;
                  const isFailedAtThis = idx === activeStageIdx && scan.status === ScanStatus.FAILED;

                  return (
                    <div
                      key={stage.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCompleted
                          ? 'border-emerald-200 bg-emerald-50/40 text-neutral-900'
                          : isActive
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm ring-1 ring-neutral-900'
                          : isFailedAtThis
                          ? 'border-red-300 bg-red-50 text-red-950'
                          : 'border-neutral-200 bg-white opacity-55 text-neutral-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase ${
                            isActive ? 'text-emerald-400' : 'text-neutral-400'
                          }`}
                        >
                          0{idx + 1}
                        </span>
                        {isCompleted ? (
                          <span className="w-4.5 h-4.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        ) : isActive ? (
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                        ) : isFailedAtThis ? (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-neutral-300" />
                        )}
                      </div>
                      <h4 className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-900'}`}>
                        {stage.name}
                      </h4>
                      <p
                        className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${
                          isActive ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {stage.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Current Active Execution Message */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-medium text-neutral-800">
                    <strong>Current Execution:</strong> {scan.currentStepMessage || 'Evaluating media streams...'}
                  </span>
                </div>
                {!isTerminal && (
                  <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live pipeline active
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* MEDIA DETAILS & LIVE LOG TERMINAL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Media Asset Preview Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-neutral-900">
                        Ingested Media Source
                      </CardTitle>
                      <CardDescription className="text-xs text-neutral-500">
                        Target payload characteristics and channel attribution.
                      </CardDescription>
                    </div>
                    <Badge variant={scan.sourceType === 'youtube_url' ? 'danger' : 'neutral'}>
                      {scan.sourceType === 'youtube_url' ? 'YouTube URL' : 'File Upload'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {scan.sourceType === 'youtube_url' ? (
                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                      <div className="relative w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200 shadow-2xs">
                        <img
                          src={
                            scan.mediaInfo?.thumbnailUrl ||
                            `https://img.youtube.com/vi/${scan.mediaInfo?.youtubeVideoId}/hqdefault.jpg`
                          }
                          alt={scan.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[9px] font-bold">
                          YouTube
                        </div>
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-semibold text-neutral-900">
                            {scan.mediaInfo?.channelTitle || 'YouTube Creator'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 line-clamp-2 font-medium">
                          {scan.title}
                        </p>
                        <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-mono text-neutral-500">
                          <span className="bg-white px-2 py-0.5 rounded border border-neutral-200">
                            Video ID: {scan.mediaInfo?.youtubeVideoId}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                      <div className="flex items-center gap-4 overflow-hidden flex-1">
                        <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 shadow-2xs shrink-0">
                          <FileVideo className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          <h4 className="text-xs font-bold text-neutral-900 truncate">
                            {scan.mediaInfo?.fileName || scan.title}
                          </h4>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {scan.mediaInfo?.fileSizeBytes
                              ? `${(scan.mediaInfo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB · `
                              : ''}
                            Bucket: app-files (Private)
                          </p>
                        </div>
                      </div>
                      {(signedMediaUrl || scan.mediaInfo?.signedUrl) && (
                        <a
                          href={signedMediaUrl || scan.mediaInfo?.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Access Stored File</span>
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Execution Log Terminal */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-neutral-700" />
                      <CardTitle className="text-sm font-bold text-neutral-900">
                        Pipeline Event Terminal
                      </CardTitle>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {logs.length} events logged
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="bg-neutral-950 text-neutral-200 font-mono text-xs rounded-xl p-4 space-y-2 max-h-72 overflow-y-auto border border-neutral-900 shadow-inner">
                    {logs.length > 0 ? (
                      logs.map((log: any, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="text-neutral-500 text-[10px] shrink-0 select-none">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                              log.level === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : log.level === 'WARN'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : log.level === 'ERROR'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {log.level}
                          </span>
                          <span className="text-neutral-300">{log.message}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-neutral-500 text-xs py-2">
                        Initializing pipeline execution logs...
                      </div>
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Policy Audit Checklist */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-neutral-900">
                    PreScan Audit Dimensions
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Configured rules applied to this media asset.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs">
                    <span className="font-semibold text-neutral-800">Community Guidelines</span>
                    <Badge variant={scan.config?.checkCommunityGuidelines ? 'success' : 'neutral'}>
                      {scan.config?.checkCommunityGuidelines ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs">
                    <span className="font-semibold text-neutral-800">Advertiser Suitability</span>
                    <Badge variant={scan.config?.checkAdvertiserSuitability ? 'success' : 'neutral'}>
                      {scan.config?.checkAdvertiserSuitability ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs">
                    <span className="font-semibold text-neutral-800">Copyright Signals</span>
                    <Badge variant={scan.config?.checkCopyrightSignals ? 'success' : 'neutral'}>
                      {scan.config?.checkCopyrightSignals ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs">
                    <span className="font-semibold text-neutral-800">Metadata Integrity</span>
                    <Badge variant={scan.config?.checkMetadataIntegrity ? 'success' : 'neutral'}>
                      {scan.config?.checkMetadataIntegrity ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Advisory Disclaimer Notice */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-neutral-700">
                  <Shield className="w-4 h-4 text-neutral-600" />
                  Quality Assurance Notice
                </div>
                <p className="leading-relaxed">
                  PreScan is a pre-upload advisory tool. Video dialogue and metadata are analyzed to identify risk signals before publication.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
