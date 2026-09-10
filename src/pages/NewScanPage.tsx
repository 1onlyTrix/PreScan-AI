import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Link2,
  Youtube,
  FileVideo,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  Info,
  ExternalLink,
  Check,
  X,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Film,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Switch } from '../components/ui/Switch';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ScanSourceType } from '../types/models';
import { ScanService, YouTubeValidationResponse } from '../services/scan.service';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';

interface NewScanPageProps {
  onNavigate: (route: string) => void;
}

const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac'];
const MAX_SIZE_MB = 500;

export const NewScanPage: React.FC<NewScanPageProps> = ({ onNavigate }) => {
  const { organization } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Source Selection: 'file' | 'youtube_url' | 'youtube_connection'
  const [sourceType, setSourceType] = useState<ScanSourceType>('youtube_url');

  // Real File Upload State
  const [realFile, setRealFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // YouTube URL State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);
  const [youtubeMeta, setYoutubeMeta] = useState<YouTubeValidationResponse['metadata'] | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [validatedVideoId, setValidatedVideoId] = useState<string | null>(null);

  // Video Metadata State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('entertainment');
  const [madeForKids, setMadeForKids] = useState('false');
  const [language, setLanguage] = useState('en');
  const [durationMinutes, setDurationMinutes] = useState('');

  // Scan Checklist Options
  const [checkCommunityGuidelines, setCheckCommunityGuidelines] = useState(true);
  const [checkAdvertiserSuitability, setCheckAdvertiserSuitability] = useState(true);
  const [checkCopyrightSignals, setCheckCopyrightSignals] = useState(true);
  const [checkMetadataIntegrity, setCheckMetadataIntegrity] = useState(true);
  const [sensitivity, setSensitivity] = useState<'STANDARD' | 'STRICT'>('STANDARD');

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Validate YouTube URL with server endpoint
  const validateAndFetchYouTubeInfo = async (urlToValidate: string) => {
    const trimmed = urlToValidate.trim();
    if (!trimmed) {
      setUrlError(null);
      setValidatedVideoId(null);
      setYoutubeMeta(null);
      return;
    }

    setIsValidatingUrl(true);
    setUrlError(null);

    try {
      const res = await ScanService.validateYouTubeUrl(trimmed);
      if (res.isValid && res.videoId) {
        setValidatedVideoId(res.videoId);
        setYoutubeMeta(res.metadata || null);
        setUrlError(null);

        // Auto-populate ALL metadata fields from real YouTube metadata
        if (res.metadata) {
          if (res.metadata.title) setTitle(res.metadata.title);
          if (res.metadata.description) setDescription(res.metadata.description);
          if (res.metadata.tags && Array.isArray(res.metadata.tags) && res.metadata.tags.length > 0) {
            setTags(res.metadata.tags.join(', '));
          }
          if (res.metadata.category) setCategory(res.metadata.category);
          if (res.metadata.durationSeconds) {
            const mins = (res.metadata.durationSeconds / 60).toFixed(1);
            setDurationMinutes(mins);
          }
        }
      } else {
        setUrlError(res.error || 'Invalid YouTube video URL structure.');
        setValidatedVideoId(null);
        setYoutubeMeta(null);
      }
    } catch (err: any) {
      setUrlError(err?.message || 'Failed to validate YouTube URL.');
      setValidatedVideoId(null);
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Handle URL change
  const handleYoutubeUrlChange = (value: string) => {
    setYoutubeUrl(value);
    setUrlTouched(true);
    // Debounce validation
    const timeout = setTimeout(() => {
      validateAndFetchYouTubeInfo(value);
    }, 400);
    return () => clearTimeout(timeout);
  };

  // Helper to test quick URL samples
  const handleApplySampleUrl = (sampleUrl: string) => {
    setYoutubeUrl(sampleUrl);
    setUrlTouched(true);
    validateAndFetchYouTubeInfo(sampleUrl);
  };

  // Real File Validation and Selection
  const handleProcessSelectedFile = (file: File) => {
    setSubmissionError(null);

    // Check size limit (500 MB)
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setSubmissionError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${MAX_SIZE_MB} MB.`);
      return;
    }

    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setSubmissionError(`Unsupported format "${ext}". Please upload MP4, MOV, WebM, MP3, WAV, or AAC.`);
      return;
    }

    setRealFile(file);

    // Pre-populate title from clean filename if empty
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ').trim();
      setTitle(cleanName);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessSelectedFile(e.target.files[0]);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setRealFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Determine if CTA is ready
  const isCtaReady = () => {
    if (isSubmitting) return false;
    if (sourceType === 'file') {
      return realFile !== null;
    }
    if (sourceType === 'youtube_url') {
      return validatedVideoId !== null && !urlError;
    }
    return false;
  };

  // Handle Real Scan Submission
  const handleSubmitScan = async () => {
    if (!isCtaReady()) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const metadataPayload = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      category,
      tags: tagsArray,
      madeForKids: madeForKids === 'true',
      language,
      sensitivityLevel: sensitivity,
      checkCommunityGuidelines,
      checkAdvertiserSuitability,
      checkCopyrightSignals,
      checkMetadataIntegrity,
    };

    try {
      if (sourceType === 'file' && realFile) {
        const formData = new FormData();
        formData.append('file', realFile);
        if (organization?.id) formData.append('organizationId', organization.id);
        if (title.trim()) formData.append('title', title.trim());
        if (description.trim()) formData.append('description', description.trim());
        formData.append('category', category);
        formData.append('tags', tags);
        formData.append('madeForKids', madeForKids);
        formData.append('language', language);
        formData.append('sensitivityLevel', sensitivity);
        formData.append('checkCommunityGuidelines', checkCommunityGuidelines.toString());
        formData.append('checkAdvertiserSuitability', checkAdvertiserSuitability.toString());
        formData.append('checkCopyrightSignals', checkCopyrightSignals.toString());
        formData.append('checkMetadataIntegrity', checkMetadataIntegrity.toString());

        const res = await ScanService.submitFileUploadScan(formData, (percent) => {
          setUploadProgress(percent);
        });

        // Navigate directly to scan detail / ingestion pipeline page
        onNavigate(ROUTES.SCAN_DETAIL(res.scan.id));
      } else if (sourceType === 'youtube_url') {
        const res = await ScanService.submitYouTubeScan({
          url: youtubeUrl.trim(),
          organizationId: organization?.id,
          metadata: metadataPayload,
        });

        // Navigate directly to scan detail / ingestion pipeline page
        onNavigate(ROUTES.SCAN_DETAIL(res.scan.id));
      }
    } catch (err: any) {
      console.error('Scan submission error:', err);
      setSubmissionError(err?.message || 'Failed to initiate scan. Please try again.');
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Initiate PreScan"
        description="Configure media sources, target metadata, and compliance rules for pre-upload quality assurance."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate(ROUTES.DASHBOARD) },
              { label: 'New Scan' },
            ]}
          />
        }
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
            Workflow Step 1 of 2
          </span>
        }
      />

      {/* Submission Error Banner */}
      {submissionError && (
        <Alert variant="error" title="Could Not Initiate Scan">
          <div>{submissionError}</div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Source Selection & Metadata Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: SOURCE SELECTION */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-neutral-900">
                    How would you like to scan your video?
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500 mt-0.5">
                    Choose how you want to provide the video you want PreScan to review.
                  </CardDescription>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded border border-neutral-200">
                  Step 1 of 2
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Three Source Option Cards */}
              <div
                role="radiogroup"
                aria-label="Video scan input source"
                className="grid grid-cols-1 md:grid-cols-3 gap-3.5"
              >
                {/* OPTION 1: Upload from computer */}
                <button
                  type="button"
                  id="source-option-file"
                  role="radio"
                  aria-checked={sourceType === 'file'}
                  onClick={() => setSourceType('file')}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all focus:outline-hidden focus:ring-2 focus:ring-neutral-900 ${
                    sourceType === 'file'
                      ? 'border-neutral-900 bg-neutral-50/90 ring-2 ring-neutral-900 shadow-2xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
                        <UploadCloud className="w-4.5 h-4.5" />
                      </div>
                      {sourceType === 'file' ? (
                        <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-neutral-300" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        Upload from computer
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Upload a video or audio file directly from your device.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                      Upload file
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Video · Audio
                    </span>
                  </div>
                </button>

                {/* OPTION 2: Paste YouTube link */}
                <button
                  type="button"
                  id="source-option-youtube-url"
                  role="radio"
                  aria-checked={sourceType === 'youtube_url'}
                  onClick={() => setSourceType('youtube_url')}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all focus:outline-hidden focus:ring-2 focus:ring-neutral-900 ${
                    sourceType === 'youtube_url'
                      ? 'border-neutral-900 bg-neutral-50/90 ring-2 ring-neutral-900 shadow-2xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
                        <Link2 className="w-4.5 h-4.5" />
                      </div>
                      {sourceType === 'youtube_url' ? (
                        <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-neutral-300" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        Paste YouTube link
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Have a published or unlisted YouTube video? Paste its link to start a scan.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                      Paste URL
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      URL Link
                    </span>
                  </div>
                </button>

                {/* OPTION 3: Connect YouTube */}
                <button
                  type="button"
                  id="source-option-youtube-connection"
                  role="radio"
                  aria-checked={sourceType === 'youtube_connection'}
                  onClick={() => setSourceType('youtube_connection')}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all focus:outline-hidden focus:ring-2 focus:ring-neutral-900 ${
                    sourceType === 'youtube_connection'
                      ? 'border-neutral-900 bg-neutral-50/90 ring-2 ring-neutral-900 shadow-2xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
                        <Youtube className="w-4.5 h-4.5" />
                      </div>
                      {sourceType === 'youtube_connection' ? (
                        <span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-neutral-300" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">
                        Connect YouTube
                      </h4>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Connect your YouTube account to select videos directly from your channel.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                      Connect
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Channel OAuth
                    </span>
                  </div>
                </button>
              </div>

              {/* Workflow Distinction Explainer */}
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200/80 text-[11px] text-neutral-600 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Workflow Distinction:</strong> <em>Upload from computer</em> ingests original high-bitrate media files. <em>Paste YouTube link</em> validates published or unlisted URLs. <em>Connect YouTube</em> enables multi-video channel syncing via Google OAuth (Phase 05).
                </div>
              </div>

              {/* SELECTED SOURCE CONTENT AREAS */}

              {/* 1. Direct File Upload View */}
              {sourceType === 'file' && (
                <div className="space-y-4">
                  {/* Hidden Real File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp4,.mov,.webm,.mkv,.mp3,.wav,.aac,.m4a,.ogg,.flac"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {/* Dropzone Container */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !realFile && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isDragging
                        ? 'border-neutral-900 bg-neutral-100/80 ring-2 ring-neutral-900/20'
                        : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/40 hover:bg-neutral-50/80 cursor-pointer'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-3 shadow-2xs text-neutral-700">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                      Drag and drop your video or audio file
                    </h4>
                    <p className="text-xs text-neutral-500 mb-4 max-w-md mx-auto">
                      Supported formats: MP4, MOV, WebM, MKV, MP3, WAV, AAC, M4A (up to 500 MB per scan).
                    </p>

                    {realFile ? (
                      <div
                        className="inline-flex items-center gap-3 p-3 px-4 rounded-xl bg-white border border-neutral-200 shadow-xs max-w-md text-left cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800 shrink-0">
                          {realFile.type.startsWith('audio') ? (
                            <FileAudio className="w-5 h-5 text-neutral-700" />
                          ) : (
                            <FileVideo className="w-5 h-5 text-neutral-700" />
                          )}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {realFile.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">
                            {(realFile.size / (1024 * 1024)).toFixed(2)} MB · {realFile.type || 'Media File'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-md hover:bg-neutral-100 transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          id="browse-file-btn"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Browse Files from Computer
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Upload Progress Indicator during Active Upload */}
                  {uploadProgress !== null && (
                    <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-neutral-800 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600" />
                          Uploading Media to Partition...
                        </span>
                        <span className="font-mono text-neutral-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-neutral-900 h-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Paste YouTube Link View */}
              {sourceType === 'youtube_url' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-neutral-200 bg-white space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900">
                          Paste your YouTube video URL
                        </h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Enter the link to a published, unlisted, or scheduled video.
                        </p>
                      </div>
                      <Badge variant={validatedVideoId ? 'success' : 'neutral'}>
                        {validatedVideoId ? 'Valid YouTube URL' : 'Link Verification'}
                      </Badge>
                    </div>

                    <div className="relative">
                      <Input
                        id="youtube-url-input"
                        label="YouTube Video URL"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                        error={urlTouched && urlError ? urlError : undefined}
                        helperText="Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..."
                        aria-invalid={urlTouched && Boolean(urlError)}
                        rightIcon={
                          isValidatingUrl ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                          ) : undefined
                        }
                      />
                    </div>

                    {/* Valid State Confirmation & Preview Card */}
                    {validatedVideoId && (
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>YouTube Link Structure & Video ID Verified</span>
                        </div>

                        {/* Preview Card */}
                        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                          <div className="relative w-full sm:w-36 aspect-video rounded-md overflow-hidden bg-neutral-900 shrink-0">
                            <img
                              src={
                                youtubeMeta?.thumbnailUrl ||
                                `https://img.youtube.com/vi/${validatedVideoId}/hqdefault.jpg`
                              }
                              alt="YouTube Video Thumbnail"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="space-y-1.5 overflow-hidden flex-1">
                            <p className="text-xs font-bold text-neutral-900 line-clamp-1">
                              {youtubeMeta?.title || `YouTube Video (${validatedVideoId})`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
                              <span>Channel: <strong>{youtubeMeta?.authorName || 'YouTube Creator'}</strong></span>
                              {youtubeMeta?.channelId && (
                                <span className="font-mono text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 border border-neutral-200">
                                  Channel ID: {youtubeMeta.channelId}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-500 font-mono pt-0.5">
                              <span>Video ID: {validatedVideoId}</span>
                              {youtubeMeta?.durationFormatted && <span>· Duration: {youtubeMeta.durationFormatted}</span>}
                              {youtubeMeta?.tags && youtubeMeta.tags.length > 0 ? (
                                <span className="bg-emerald-100 text-emerald-800 font-sans font-semibold px-1.5 py-0.2 rounded">
                                  {youtubeMeta.tags.length} Tags Extracted
                                </span>
                              ) : (
                                <span className="bg-neutral-100 text-neutral-600 font-sans px-1.5 py-0.2 rounded">
                                  Tags Unavailable
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sample URL Quick Chips */}
                    <div className="pt-2 border-t border-neutral-100">
                      <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-2">
                        Supported URL formats (Click to test):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          id="sample-url-watch"
                          onClick={() => handleApplySampleUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-left transition-colors"
                        >
                          youtube.com/watch?v=...
                        </button>
                        <button
                          type="button"
                          id="sample-url-shortlink"
                          onClick={() => handleApplySampleUrl('https://youtu.be/dQw4w9WgXcQ')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-left transition-colors"
                        >
                          youtu.be/...
                        </button>
                        <button
                          type="button"
                          id="sample-url-shorts"
                          onClick={() => handleApplySampleUrl('https://www.youtube.com/shorts/3jZ_K5vW8x0')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-left transition-colors"
                        >
                          youtube.com/shorts/...
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Connect YouTube View */}
              {sourceType === 'youtube_connection' && (
                <div className="p-6 rounded-xl border border-neutral-200 bg-neutral-50/50 text-center space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mx-auto shadow-2xs text-neutral-800">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">
                      YouTube Account Integration
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto leading-relaxed">
                      Connect your YouTube Studio account to automatically import unlisted video drafts directly from your channel without downloading or copying links.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-neutral-200 max-w-md mx-auto text-left text-xs text-neutral-600 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-neutral-800 text-[11px] uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Official Google OAuth Scopes</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      PreScan requests minimal readonly scopes (<code className="font-mono text-neutral-700">youtube.readonly</code>). PreScan never modifies, publishes, or deletes your channel videos.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      id="connect-youtube-btn"
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate(ROUTES.INTEGRATIONS)}
                    >
                      View Channel Integrations
                    </Button>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      (OAuth 2.0 scheduled for Phase 05)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: METADATA CONFIGURATION */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                    Step 2: Video Metadata Context
                  </CardTitle>
                  <CardDescription>
                    Provide planned title, description, category, and tags for metadata integrity and policy checks.
                  </CardDescription>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded border border-neutral-200">
                  Metadata
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                id="video-title-input"
                label="Video Title"
                placeholder="e.g., Ultimate Productivity Systems (Full Breakdown)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                helperText="Must match planned title on YouTube (max 100 characters)"
              />

              <Textarea
                id="video-description-input"
                label="Video Description & Links"
                placeholder="Paste the planned video description, timestamps, sponsor disclosures, and external links..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                helperText="PreScan evaluates description links and sponsor disclosures for policy adherence"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="video-category-select"
                  label="Video Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'entertainment', label: 'Entertainment' },
                    { value: 'gaming', label: 'Gaming' },
                    { value: 'education', label: 'Education' },
                    { value: 'howto', label: 'Howto & Style' },
                    { value: 'news', label: 'News & Politics' },
                    { value: 'people', label: 'People & Blogs' },
                    { value: 'science', label: 'Science & Technology' },
                    { value: 'film', label: 'Film & Animation' },
                  ]}
                />

                <Select
                  id="made-for-kids-select"
                  label="Made for Kids Audience"
                  value={madeForKids}
                  onChange={(e) => setMadeForKids(e.target.value)}
                  options={[
                    { value: 'false', label: "No, it's not made for kids (Standard)" },
                    { value: 'true', label: "Yes, it's made for kids (COPPA)" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    id="video-tags-input"
                    label="Tags (Comma separated)"
                    placeholder="productivity, workflow, guide"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    helperText="Checked for keyword stuffing signals"
                  />
                </div>

                <div>
                  <Select
                    id="audio-language-select"
                    label="Primary Audio Language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    options={[
                      { value: 'en', label: 'English (Global)' },
                      { value: 'es', label: 'Spanish (Español)' },
                      { value: 'fr', label: 'French (Français)' },
                      { value: 'de', label: 'German (Deutsch)' },
                      { value: 'ja', label: 'Japanese (日本語)' },
                      { value: 'hi', label: 'Hindi (हिन्दी)' },
                      { value: 'pt', label: 'Portuguese (Português)' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <Input
                    id="duration-estimate-input"
                    label="Estimated Duration (Minutes, Optional)"
                    placeholder="e.g., 14"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    helperText="Synchronized automatically during media stream analysis"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scan Rules & Execution Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Scan Rules & Scope
              </CardTitle>
              <CardDescription>
                Select which compliance dimensions to evaluate.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Switch
                label="Community Guidelines"
                description="Hate speech, harassment, violent content"
                checked={checkCommunityGuidelines}
                onCheckedChange={setCheckCommunityGuidelines}
              />

              <div className="border-t border-neutral-100 pt-3">
                <Switch
                  label="Advertiser Suitability"
                  description="Demonetization, profanity, sensitive topics"
                  checked={checkAdvertiserSuitability}
                  onCheckedChange={setCheckAdvertiserSuitability}
                />
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <Switch
                  label="Copyright References"
                  description="Verbal music & commercial media mentions"
                  checked={checkCopyrightSignals}
                  onCheckedChange={setCheckCopyrightSignals}
                />
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <Switch
                  label="Metadata Integrity"
                  description="Misleading tags & description alignment"
                  checked={checkMetadataIntegrity}
                  onCheckedChange={setCheckMetadataIntegrity}
                />
              </div>

              <div className="border-t border-neutral-100 pt-4">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Analysis Sensitivity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="sensitivity-standard-btn"
                    onClick={() => setSensitivity('STANDARD')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      sensitivity === 'STANDARD'
                        ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    id="sensitivity-strict-btn"
                    onClick={() => setSensitivity('STRICT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      sensitivity === 'STRICT'
                        ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    Strict Review
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Action Card */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                Run PreScan Ingestion
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                {sourceType === 'youtube_url'
                  ? validatedVideoId
                    ? 'YouTube link structure validated. Ready to queue ingestion.'
                    : 'Enter a valid YouTube video link to enable scan.'
                  : sourceType === 'file'
                  ? realFile
                    ? `${realFile.name} selected. Ready to upload and queue.`
                    : 'Select a video or audio file from your device.'
                  : 'Channel OAuth integration required to proceed.'}
              </p>
            </div>

            <Button
              id="execute-scan-btn"
              variant="primary"
              size="lg"
              className="w-full"
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )
              }
              disabled={!isCtaReady() || isSubmitting}
              onClick={handleSubmitScan}
            >
              {isSubmitting
                ? uploadProgress !== null
                  ? `Uploading (${uploadProgress}%)...`
                  : 'Starting Ingestion Pipeline...'
                : sourceType === 'youtube_url'
                ? validatedVideoId
                  ? 'Queue YouTube Link Scan'
                  : 'Enter YouTube Link'
                : sourceType === 'file'
                ? realFile
                  ? 'Upload & Ingest File'
                  : 'Select Media File'
                : 'Connect Channel (Phase 05)'}
            </Button>

            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                {sourceType === 'youtube_url'
                  ? 'SSRF verification and oEmbed metadata active.'
                  : 'Tenant-isolated media storage and container analysis active.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
