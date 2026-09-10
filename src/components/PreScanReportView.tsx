import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  Filter,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  MessageSquare,
  ListChecks,
  Layers,
  HelpCircle,
  Tag,
  Radio,
  FileVideo,
  User,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  PreScanV1ReportData,
  PreScanFinding,
  FindingSeverity,
  ReviewStatus,
  FindingReviewRecord,
} from '../types/report.types';

interface PreScanReportViewProps {
  report: PreScanV1ReportData;
  transcript?: {
    segments: Array<{ startSeconds: number; endSeconds: number; text: string }>;
    fullText: string;
    language?: string;
  } | null;
  reviews?: FindingReviewRecord[];
  onUpdateReview?: (findingId: string, reviewStatus: ReviewStatus, creatorNote?: string) => Promise<void>;
  onRetryAnalysis?: () => void;
  isAnalyzing?: boolean;
}

export const PreScanReportView: React.FC<PreScanReportViewProps> = ({
  report,
  transcript,
  reviews = [],
  onUpdateReview,
  onRetryAnalysis,
  isAnalyzing = false,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'risk_summary' | 'findings' | 'action_center' | 'timeline' | 'transcript' | 'metadata' | 'limitations'
  >('overview');

  // Finding Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>('ALL');
  const [findingSearchQuery, setFindingSearchQuery] = useState<string>('');

  // Finding Detail Modal / Focus State
  const [focusedFindingId, setFocusedFindingId] = useState<string | null>(null);

  // Transcript Search & Navigation
  const [transcriptSearchQuery, setTranscriptSearchQuery] = useState<string>('');
  const [highlightedTime, setHighlightedTime] = useState<number | null>(null);

  // Copy States
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Creator Note Inline Editing State { [findingId]: noteText }
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [isSavingNote, setIsSavingNote] = useState<Record<string, boolean>>({});

  // Pre-Publish Checklist State
  const [checklist, setChecklist] = useState({
    community: false,
    advertiser: false,
    copyright: false,
    metadata: false,
    actionPlan: false,
  });

  // Map reviews by findingId
  const reviewMap = useMemo(() => {
    const map = new Map<string, FindingReviewRecord>();
    reviews.forEach((r) => map.set(r.findingId, r));
    return map;
  }, [reviews]);

  // Priority sorting helper
  const severityRank = (s: FindingSeverity): number => {
    switch (s) {
      case 'CRITICAL':
        return 4;
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
      default:
        return 0;
    }
  };

  const confidenceRank = (c?: string): number => {
    switch (c) {
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
      default:
        return 0;
    }
  };

  // Prioritized Findings (High -> Medium -> Low, then High Confidence -> Low)
  const sortedFindings = useMemo(() => {
    const findingsCopy = [...(report.findings || [])];
    return findingsCopy.sort((a, b) => {
      const sDiff = severityRank(b.severity) - severityRank(a.severity);
      if (sDiff !== 0) return sDiff;
      return confidenceRank(b.confidence) - confidenceRank(a.confidence);
    });
  }, [report.findings]);

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return sortedFindings.filter((finding) => {
      // Category filter
      if (selectedCategory !== 'ALL' && finding.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'ALL' && finding.severity !== selectedSeverity) {
        return false;
      }
      // Review status filter
      const review = reviewMap.get(finding.id);
      const status = review?.reviewStatus || 'OPEN';
      if (selectedReviewStatus !== 'ALL' && status !== selectedReviewStatus) {
        return false;
      }
      // Search query
      if (findingSearchQuery.trim()) {
        const q = findingSearchQuery.toLowerCase();
        const title = (finding.title || '').toLowerCase();
        const quote = (finding.evidence_quote || finding.quote || '').toLowerCase();
        const expl = (finding.explanation || finding.reasoning || '').toLowerCase();
        const cat = (finding.category || '').toLowerCase();
        const policy = (finding.policy || '').toLowerCase();
        const ts = (finding.start_timestamp || finding.timestamp || '').toLowerCase();
        if (!title.includes(q) && !quote.includes(q) && !expl.includes(q) && !cat.includes(q) && !policy.includes(q) && !ts.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [sortedFindings, selectedCategory, selectedSeverity, selectedReviewStatus, findingSearchQuery, reviewMap]);

  // Action Center Review Stats
  const totalFindings = report.findings?.length || 0;
  const reviewedFindingsCount = useMemo(() => {
    return (report.findings || []).filter((f) => {
      const rev = reviewMap.get(f.id);
      return rev && rev.reviewStatus !== 'OPEN';
    }).length;
  }, [report.findings, reviewMap]);

  const reviewProgressPercent = totalFindings > 0 ? Math.round((reviewedFindingsCount / totalFindings) * 100) : 100;

  // Handle Review Status Update
  const handleReviewStatusChange = async (findingId: string, status: ReviewStatus) => {
    if (!onUpdateReview) return;
    const existingNote = noteDrafts[findingId] ?? reviewMap.get(findingId)?.creatorNote ?? '';
    await onUpdateReview(findingId, status, existingNote);
  };

  // Handle Save Creator Note
  const handleSaveNote = async (findingId: string) => {
    if (!onUpdateReview) return;
    setIsSavingNote((prev) => ({ ...prev, [findingId]: true }));
    try {
      const currentReview = reviewMap.get(findingId);
      const status = currentReview?.reviewStatus || 'REVIEWED';
      const note = noteDrafts[findingId] ?? currentReview?.creatorNote ?? '';
      await onUpdateReview(findingId, status, note);
    } catch (err) {
      console.error('Failed to save creator note:', err);
    } finally {
      setIsSavingNote((prev) => ({ ...prev, [findingId]: false }));
    }
  };

  // Format category names cleanly
  const formatCategoryName = (catKey: string) => {
    switch (catKey) {
      case 'community_guidelines':
      case 'communityGuidelines':
        return 'Community Guidelines';
      case 'advertiser_suitability':
      case 'advertiserSuitability':
        return 'Advertiser Suitability';
      case 'copyright_signals':
      case 'copyrightSignals':
        return 'Copyright Signals';
      case 'metadata_integrity':
      case 'metadataIntegrity':
        return 'Metadata Integrity';
      default:
        return catKey.replace(/_/g, ' ');
    }
  };

  // Helper overall risk badge styling
  const getOverallRiskBadge = (level?: string) => {
    switch (level) {
      case 'LOW':
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wide">Low Policy Risk</span>
          </div>
        );
      case 'MEDIUM':
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold uppercase tracking-wide">Moderate Risk — Review Advised</span>
          </div>
        );
      case 'HIGH':
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 shadow-2xs">
            <ShieldAlert className="w-4 h-4 text-orange-700" />
            <span className="text-xs font-bold uppercase tracking-wide">High Risk Detected</span>
          </div>
        );
      case 'CRITICAL':
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100 text-red-900 border border-red-300 shadow-2xs">
            <ShieldAlert className="w-4 h-4 text-red-700" />
            <span className="text-xs font-bold uppercase tracking-wide">Critical Policy Flag</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300">
            <Info className="w-4 h-4 text-neutral-500" />
            <span className="text-xs font-bold uppercase tracking-wide">{level || 'ASSESSED'}</span>
          </div>
        );
    }
  };

  // Severity Badge Component
  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="danger">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>;
      case 'LOW':
        return <Badge variant="success">Low</Badge>;
      default:
        return <Badge variant="neutral">{severity}</Badge>;
    }
  };

  // Review status badge component
  const getReviewStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Reviewed
          </span>
        );
      case 'NEEDS_EDIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Edit3 className="w-3 h-3 text-amber-700" />
            Needs Edit
          </span>
        );
      case 'NOT_APPLICABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
            <XCircle className="w-3 h-3 text-neutral-500" />
            N/A
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Open
          </span>
        );
    }
  };

  // Copy helper
  const handleCopyQuote = (quote: string, id: string) => {
    navigator.clipboard.writeText(quote);
    setCopiedQuoteId(id);
    setTimeout(() => setCopiedQuoteId(null), 2000);
  };

  // Parse time helper (HH:MM:SS or MM:SS to seconds)
  const parseTimestampSeconds = (ts?: string): number => {
    if (!ts) return 0;
    const parts = ts.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(ts) || 0;
  };

  const overallLevel = report.overall_risk?.risk_level || (report.overall as any)?.risk_level || 'LOW';

  return (
    <div className="space-y-8">
      {/* 1. REPORT HEADER & TOP ACTIONS */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100 print:pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                {report.metadata?.title || 'PreScan Policy Compliance Report'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 font-medium">
              <span>Source: <strong className="text-neutral-800">{report.metadata?.sourceType || 'Media Stream'}</strong></span>
              <span>•</span>
              <span>Language: <strong className="text-neutral-800">{transcript?.language || report.metadata?.language || 'English (en)'}</strong></span>
              <span>•</span>
              <span>Analyzed: <strong className="text-neutral-800">{new Date(report.metadata?.analyzedAt || Date.now()).toLocaleDateString()}</strong></span>
              <span>•</span>
              <span>Engine: <strong className="text-neutral-800">PreScan {report.preScanVersion || 'v1.0'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 print:hidden">
            {getOverallRiskBadge(overallLevel)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer className="w-3.5 h-3.5 text-neutral-600" />}
            >
              Print Report
            </Button>
            {onRetryAnalysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetryAnalysis}
                disabled={isAnalyzing}
                leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />}
              >
                {isAnalyzing ? 'Re-analyzing...' : 'Re-run Scan'}
              </Button>
            )}
          </div>
        </div>

        {/* Executive Policy Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2 bg-neutral-50/80 p-4.5 rounded-xl border border-neutral-200/90">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-600" />
                Executive Policy Posture
              </h4>
              <span className="text-[11px] font-mono font-semibold text-neutral-500">
                Score: {report.overall_risk?.safety_score ?? report.overall?.safety_score ?? 100} / 100
              </span>
            </div>
            <p className="text-xs text-neutral-800 leading-relaxed font-sans">
              {report.overall_risk?.summary ||
                report.overall?.summary ||
                (totalFindings === 0
                  ? 'No significant risks were detected in the analyzed audio dialogue and metadata.'
                  : `PreScan evaluated the media stream and identified ${totalFindings} finding(s) requiring creator review.`)}
            </p>
          </div>

          <div className="space-y-2.5 bg-neutral-50/80 p-4.5 rounded-xl border border-neutral-200/90 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-neutral-600" />
              Context & Profanity Signals
            </h4>
            <div className="space-y-1.5 text-neutral-600 font-sans">
              <div className="flex justify-between">
                <span>Inferred Genre:</span>
                <span className="font-bold text-neutral-900">{report.metadata?.inferredGenre || 'General Content'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Findings:</span>
                <span className="font-mono font-bold text-neutral-900">{totalFindings} flagged</span>
              </div>
              <div className="flex justify-between">
                <span>Confirmed Profanity:</span>
                <span className="font-mono font-bold text-red-700">
                  {report.summaryStats?.confirmedProfanityCount ?? report.summaryStats?.profanityCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Potential Candidates:</span>
                <span className="font-mono font-bold text-amber-700">
                  {report.summaryStats?.potentialProfanityCount ?? 0}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-neutral-200">
                <span>Creator Reviews:</span>
                <span className="font-mono font-bold text-emerald-700">{reviewedFindingsCount} / {totalFindings} completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            leftIcon={<Layers className="w-3.5 h-3.5" />}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === 'findings' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('findings')}
            leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
          >
            Findings ({totalFindings})
          </Button>
          <Button
            variant={activeTab === 'action_center' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('action_center')}
            leftIcon={<ListChecks className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Creator Action Center
            {totalFindings - reviewedFindingsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                {totalFindings - reviewedFindingsCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'risk_summary' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('risk_summary')}
            leftIcon={<Activity className="w-3.5 h-3.5" />}
          >
            Risk Categories
          </Button>
          <Button
            variant={activeTab === 'timeline' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('timeline')}
            leftIcon={<Clock className="w-3.5 h-3.5" />}
          >
            Interactive Timeline
          </Button>
          {transcript && (
            <Button
              variant={activeTab === 'transcript' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('transcript')}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
            >
              Speech Transcript ({transcript.segments?.length || 0})
            </Button>
          )}
          <Button
            variant={activeTab === 'metadata' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('metadata')}
            leftIcon={<Tag className="w-3.5 h-3.5" />}
          >
            Metadata
          </Button>
          <Button
            variant={activeTab === 'limitations' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('limitations')}
            leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            Limitations
          </Button>
        </div>
      </div>

      {/* 3. TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Category Audits Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(report.categories || {}).map(([catKey, catData]: [string, any]) => {
              if (['communityGuidelines', 'advertiserSuitability', 'copyrightSignals', 'metadataIntegrity'].includes(catKey)) {
                return null;
              }
              const riskLevel = catData.risk_level;
              const isHigh = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
              const isMedium = riskLevel === 'MEDIUM';

              return (
                <div
                  key={catKey}
                  onClick={() => {
                    setSelectedCategory(catKey);
                    setActiveTab('findings');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-xs ${
                    isHigh
                      ? 'border-red-200 bg-red-50/50 hover:bg-red-50'
                      : isMedium
                      ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      {formatCategoryName(catKey)}
                    </span>
                    <Badge variant={isHigh ? 'danger' : isMedium ? 'warning' : 'success'}>
                      {riskLevel}
                    </Badge>
                  </div>
                  <div
                    className={`text-sm font-bold font-sans ${
                      isHigh ? 'text-red-700' : isMedium ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {riskLevel} Risk Signal
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                    {catData.summary || `${catData.findings_count || 0} finding(s) identified.`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Key High-Priority Findings Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Prioritized Policy Findings ({sortedFindings.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-500">
                    Sorted by severity and AI evidence confidence.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('findings')}>
                  View All Findings
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedFindings.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-800">No Policy Flags Detected</p>
                  <p className="text-[11px] text-neutral-500">No risk signals were found in the analyzed audio or metadata.</p>
                </div>
              ) : (
                sortedFindings.slice(0, 3).map((finding) => {
                  const rev = reviewMap.get(finding.id);
                  return (
                    <div
                      key={finding.id}
                      onClick={() => {
                        setFocusedFindingId(finding.id);
                        setActiveTab('findings');
                      }}
                      className="p-3.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(finding.severity)}
                          <span className="text-xs font-bold text-neutral-900">{finding.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getReviewStatusBadge(rev?.reviewStatus || 'OPEN')}
                          {finding.start_timestamp && (
                            <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                              [{finding.start_timestamp}]
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed font-sans">
                        {finding.explanation || finding.reasoning}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Pre-Publish Workflow Checklist */}
          <Card className="border-neutral-900 bg-neutral-900 text-neutral-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-emerald-400" />
                Pre-Publish Verification Checklist
              </CardTitle>
              <CardDescription className="text-xs text-neutral-300">
                Interactive creator workflow checklist prior to uploading content to YouTube.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-800/80 cursor-pointer hover:bg-neutral-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.community}
                    onChange={(e) => setChecklist({ ...checklist, community: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Reviewed Community Guidelines signals</span>
                </label>
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-800/80 cursor-pointer hover:bg-neutral-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.advertiser}
                    onChange={(e) => setChecklist({ ...checklist, advertiser: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Verified Advertiser Suitability flags</span>
                </label>
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-800/80 cursor-pointer hover:bg-neutral-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.copyright}
                    onChange={(e) => setChecklist({ ...checklist, copyright: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Checked Copyright & Attribution references</span>
                </label>
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-800/80 cursor-pointer hover:bg-neutral-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={checklist.metadata}
                    onChange={(e) => setChecklist({ ...checklist, metadata: e.target.checked })}
                    className="rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Cross-checked Title, Description & Metadata</span>
                </label>
              </div>

              <div className="pt-2 text-[11px] text-neutral-400 leading-relaxed italic border-t border-neutral-800">
                Disclaimer: Completing this workflow checklist confirms team review. It does not guarantee YouTube algorithm approval or policy immunity.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. TAB CONTENT: FINDINGS EXPLORER */}
      {activeTab === 'findings' && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Filters */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search findings by keyword, evidence quote, policy, or timestamp..."
                  value={findingSearchQuery}
                  onChange={(e) => setFindingSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Reset button */}
              {(selectedCategory !== 'ALL' || selectedSeverity !== 'ALL' || selectedReviewStatus !== 'ALL' || findingSearchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSelectedSeverity('ALL');
                    setSelectedReviewStatus('ALL');
                    setFindingSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Filter Selectors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="ALL">All Categories</option>
                  <option value="community_guidelines">Community Guidelines</option>
                  <option value="advertiser_suitability">Advertiser Suitability</option>
                  <option value="copyright_signals">Copyright Signals</option>
                  <option value="metadata_integrity">Metadata Integrity</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Severity Level:</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Creator Review Status:</label>
                <select
                  value={selectedReviewStatus}
                  onChange={(e) => setSelectedReviewStatus(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="ALL">All Review States</option>
                  <option value="OPEN">Open (Unreviewed)</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="NEEDS_EDIT">Needs Edit</option>
                  <option value="NOT_APPLICABLE">Not Applicable (N/A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results List */}
          {filteredFindings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-neutral-900">No Findings Match Active Filters</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Try adjusting your category, severity, review status, or search query.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFindings.map((finding) => {
                const rev = reviewMap.get(finding.id);
                const currentStatus: ReviewStatus = rev?.reviewStatus || 'OPEN';

                return (
                  <Card key={finding.id} className="overflow-hidden border-neutral-200">
                    <CardHeader className="bg-neutral-50/60 pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {finding.status === 'CONFIRMED' || finding.category === 'advertiser_suitability' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-700" />
                              CONFIRMED PROFANITY
                            </span>
                          ) : finding.status === 'POTENTIAL' || finding.category === 'POTENTIAL_PROFANITY' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-amber-700" />
                              POTENTIAL PROFANITY (REVIEW CANDIDATE)
                            </span>
                          ) : null}
                          {getSeverityBadge(finding.severity)}
                          <span className="text-xs font-bold font-mono uppercase text-neutral-600">
                            {formatCategoryName(finding.category)}
                          </span>
                          {finding.confidence && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-neutral-200/80 text-neutral-700">
                              Confidence: {finding.confidence}
                            </span>
                          )}
                          {finding.start_timestamp && (
                            <button
                              onClick={() => {
                                if (transcript) {
                                  setHighlightedTime(parseTimestampSeconds(finding.start_timestamp));
                                  setActiveTab('transcript');
                                }
                              }}
                              className="text-xs font-mono font-semibold text-neutral-800 hover:text-emerald-700 inline-flex items-center gap-1 bg-white border border-neutral-300 px-2 py-0.5 rounded hover:border-emerald-500 transition-colors"
                              title="Click to view in Speech Transcript"
                            >
                              <Clock className="w-3 h-3 text-neutral-500" />
                              {finding.start_timestamp} {finding.end_timestamp ? `→ ${finding.end_timestamp}` : ''}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {getReviewStatusBadge(currentStatus)}
                        </div>
                      </div>

                      <CardTitle className="text-sm font-bold text-neutral-900 mt-2">
                        {finding.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                      {/* Evidence Quote Box */}
                      {(finding.evidence_quote || finding.quote) && (
                        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1">
                              <Radio className="w-3 h-3 text-amber-700" />
                              Detected Audio Evidence Quote
                            </span>
                            <button
                              onClick={() => handleCopyQuote(finding.evidence_quote || finding.quote || '', finding.id)}
                              className="text-amber-800 hover:text-amber-950 text-[11px] flex items-center gap-1 font-mono"
                            >
                              {copiedQuoteId === finding.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-amber-950 italic font-serif leading-relaxed">
                            "{finding.evidence_quote || finding.quote}"
                          </p>
                        </div>
                      )}

                      {/* Profanity Term & Multilingual Badges */}
                      {finding.detectedExpression && (
                        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
                          <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Detected Term:</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-200/80 text-rose-950">
                            "{finding.detectedExpression}"
                          </span>
                          {finding.canonical && (
                            <span className="text-[11px] font-mono text-neutral-600">
                              (Base: <span className="font-semibold text-neutral-800">{finding.canonical}</span>)
                            </span>
                          )}
                          {finding.language && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 ml-auto">
                              Language: {finding.language}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Policy Reasoning */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                          Policy Analysis & Risk Context
                        </span>
                        <p className="text-xs text-neutral-700 leading-relaxed font-sans">
                          {finding.explanation || finding.reasoning}
                        </p>
                      </div>

                      {/* Recommended Action */}
                      <div className="p-3 rounded-lg bg-neutral-900 text-neutral-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                          Suggested Creator Action
                        </span>
                        <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                          {finding.recommended_action || finding.recommendation}
                        </p>
                      </div>

                      {/* Creator Review Workflow Actions */}
                      <div className="pt-3 border-t border-neutral-100 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-neutral-700">Set Creator Review Status:</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              variant={currentStatus === 'OPEN' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(finding.id, 'OPEN')}
                            >
                              Open
                            </Button>
                            <Button
                              variant={currentStatus === 'REVIEWED' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(finding.id, 'REVIEWED')}
                            >
                              Reviewed
                            </Button>
                            <Button
                              variant={currentStatus === 'NEEDS_EDIT' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(finding.id, 'NEEDS_EDIT')}
                            >
                              Needs Edit
                            </Button>
                            <Button
                              variant={currentStatus === 'NOT_APPLICABLE' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(finding.id, 'NOT_APPLICABLE')}
                            >
                              N/A
                            </Button>
                          </div>
                        </div>

                        {/* Creator Note Editor */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-neutral-600">
                            Creator / Team Note:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add an internal note (e.g., 'Will trim 0:15-0:22 in final edit')..."
                              value={noteDrafts[finding.id] ?? rev?.creatorNote ?? ''}
                              onChange={(e) => setNoteDrafts({ ...noteDrafts, [finding.id]: e.target.value })}
                              className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveNote(finding.id)}
                              disabled={isSavingNote[finding.id]}
                            >
                              {isSavingNote[finding.id] ? 'Saving...' : 'Save Note'}
                            </Button>
                          </div>
                          {rev?.reviewerName && (
                            <p className="text-[10px] text-neutral-400 font-mono">
                              Last reviewed by {rev.reviewerName} on {new Date(rev.updatedAt || rev.reviewedAt || Date.now()).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT: CREATOR ACTION CENTER */}
      {activeTab === 'action_center' && (
        <div className="space-y-6">
          {/* Progress Banner */}
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-700" />
                    Creator Action & Resolution Hub
                  </CardTitle>
                  <CardDescription className="text-xs text-neutral-600 mt-0.5">
                    Track internal team resolutions and creator notes for each flagged item prior to publication.
                  </CardDescription>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-mono font-bold text-emerald-900">
                    {reviewedFindingsCount} / {totalFindings} Reviewed ({reviewProgressPercent}%)
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden border border-emerald-200">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${reviewProgressPercent}%` }}
                />
              </div>

              {reviewedFindingsCount === totalFindings && totalFindings > 0 ? (
                <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>All detected findings have been reviewed by your team.</span>
                </div>
              ) : (
                <p className="text-xs text-neutral-600">
                  {totalFindings - reviewedFindingsCount} finding(s) remaining for creator verification.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Grouped Actions List */}
          {['HIGH', 'MEDIUM', 'LOW'].map((sevKey) => {
            const items = sortedFindings.filter((f) => {
              if (sevKey === 'HIGH') return f.severity === 'HIGH' || f.severity === 'CRITICAL';
              return f.severity === sevKey;
            });

            if (items.length === 0) return null;

            return (
              <div key={sevKey} className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                  {sevKey === 'HIGH' ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      Priority Items — Review Required ({items.length})
                    </>
                  ) : sevKey === 'MEDIUM' ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Recommended Items — Creator Attention ({items.length})
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-neutral-600" />
                      Optional Items — Minor Signals ({items.length})
                    </>
                  )}
                </h4>

                <div className="space-y-3">
                  {items.map((item) => {
                    const rev = reviewMap.get(item.id);
                    const currentStatus = rev?.reviewStatus || 'OPEN';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          currentStatus === 'REVIEWED'
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : currentStatus === 'NEEDS_EDIT'
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getSeverityBadge(item.severity)}
                              <h5 className="text-xs font-bold text-neutral-900">{item.title}</h5>
                            </div>
                            <p className="text-[11px] text-neutral-500 font-mono">
                              Category: {formatCategoryName(item.category)} {item.start_timestamp ? `• [${item.start_timestamp}]` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant={currentStatus === 'OPEN' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(item.id, 'OPEN')}
                            >
                              Open
                            </Button>
                            <Button
                              variant={currentStatus === 'REVIEWED' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(item.id, 'REVIEWED')}
                            >
                              Mark Reviewed
                            </Button>
                            <Button
                              variant={currentStatus === 'NEEDS_EDIT' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(item.id, 'NEEDS_EDIT')}
                            >
                              Needs Edit
                            </Button>
                            <Button
                              variant={currentStatus === 'NOT_APPLICABLE' ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleReviewStatusChange(item.id, 'NOT_APPLICABLE')}
                            >
                              N/A
                            </Button>
                          </div>
                        </div>

                        <div className="pt-3 space-y-2 text-xs">
                          <p className="text-neutral-700 leading-relaxed font-sans">
                            <strong className="text-neutral-900">Suggested Action:</strong> {item.recommended_action || item.recommendation}
                          </p>

                          <div className="flex gap-2 pt-1">
                            <input
                              type="text"
                              placeholder="Add creator resolution note..."
                              value={noteDrafts[item.id] ?? rev?.creatorNote ?? ''}
                              onChange={(e) => setNoteDrafts({ ...noteDrafts, [item.id]: e.target.value })}
                              className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveNote(item.id)}
                              disabled={isSavingNote[item.id]}
                            >
                              {isSavingNote[item.id] ? 'Saving...' : 'Save'}
                            </Button>
                          </div>

                          {rev?.reviewerName && (
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Last updated by {rev.reviewerName} on {new Date(rev.updatedAt || rev.reviewedAt || Date.now()).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. TAB CONTENT: INTERACTIVE TIMELINE */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Timestamped Finding Map
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Interactive temporal mapping of findings throughout the media stream duration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timeline track */}
            <div className="relative py-6 px-4 bg-neutral-900 text-white rounded-xl border border-neutral-800 space-y-4">
              <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                <span>00:00</span>
                <span>Media Duration Axis</span>
                <span>{report.metadata?.durationSeconds ? `${Math.floor(report.metadata.durationSeconds / 60)}:${Math.floor(report.metadata.durationSeconds % 60)}` : 'End'}</span>
              </div>

              {/* Axis line */}
              <div className="w-full h-2 bg-neutral-800 rounded-full relative">
                {sortedFindings.map((finding) => {
                  if (!finding.start_timestamp) return null;
                  const sec = parseTimestampSeconds(finding.start_timestamp);
                  const totalSec = report.metadata?.durationSeconds || 600;
                  const pct = Math.min(100, Math.max(0, (sec / totalSec) * 100));

                  const isConfirmed = finding.status === 'CONFIRMED' || finding.severity === 'CRITICAL' || finding.severity === 'HIGH';
                  const isPotential = finding.status === 'POTENTIAL';

                  return (
                    <button
                      key={finding.id}
                      onClick={() => {
                        setHighlightedTime(sec);
                        if (transcript) {
                          setActiveTab('transcript');
                        }
                      }}
                      style={{ left: `${pct}%` }}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-neutral-900 cursor-pointer transition-transform hover:scale-125 ${
                        isConfirmed
                          ? 'bg-red-500 ring-2 ring-red-400/50'
                          : isPotential
                          ? 'bg-amber-400 ring-2 ring-amber-300/50'
                          : 'bg-emerald-500'
                      }`}
                      title={`[${finding.status || 'FINDING'}] ${finding.title} at [${finding.start_timestamp}] - Click to jump to speech transcript`}
                    />
                  );
                })}
              </div>

              {/* Timeline Legend */}
              <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-1 ring-red-400" />
                    Confirmed Profanity / High Policy Risk (Red)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-amber-300" />
                    Potential Profanity / Review Candidate (Amber)
                  </span>
                </div>
                <span>Click marker to jump to timecode</span>
              </div>
            </div>

            {/* List of Timestamped Findings */}
            <div className="space-y-3">
              {sortedFindings.map((finding) => (
                <div
                  key={finding.id}
                  onClick={() => {
                    if (transcript && finding.start_timestamp) {
                      setHighlightedTime(parseTimestampSeconds(finding.start_timestamp));
                      setActiveTab('transcript');
                    }
                  }}
                  className="p-3.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-900 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
                      [{finding.start_timestamp || '00:00'}]
                    </span>
                    <div>
                      <h5 className="font-bold text-neutral-900">{finding.title}</h5>
                      <p className="text-neutral-500 text-[11px] line-clamp-1 font-sans">{finding.explanation || finding.reasoning}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getSeverityBadge(finding.severity)}
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. TAB CONTENT: SPEECH TRANSCRIPT */}
      {activeTab === 'transcript' && transcript && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-neutral-700" />
                  Timestamped Dialogue Speech Transcript
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Full transcript with line-by-line timecode anchors. Click segment to inspect.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search dialogue text..."
                    value={transcriptSearchQuery}
                    onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                    className="pl-8 pr-2 py-1 bg-white border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
                <Badge variant="neutral">Lang: {transcript.language || 'en'}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-112 overflow-y-auto pr-2">
              {transcript.segments.map((seg, idx) => {
                const matchesQuery = transcriptSearchQuery.trim()
                  ? seg.text.toLowerCase().includes(transcriptSearchQuery.toLowerCase())
                  : true;

                if (!matchesQuery) return null;

                const isSelected =
                  highlightedTime !== null &&
                  highlightedTime >= seg.startSeconds &&
                  highlightedTime <= seg.endSeconds + 2;

                const minutes = Math.floor(seg.startSeconds / 60);
                const seconds = Math.floor(seg.startSeconds % 60);
                const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

                // Check if any finding matches this segment's timestamp window
                const matchingFinding = report.findings.find((f) => {
                  const fSec = parseTimestampSeconds(f.start_timestamp);
                  return Math.abs(fSec - seg.startSeconds) <= 10;
                });

                return (
                  <div
                    key={idx}
                    onClick={() => setHighlightedTime(seg.startSeconds)}
                    className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                        : matchingFinding
                        ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/80 text-neutral-900'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}
                        >
                          [{timeStr}]
                        </span>
                        {matchingFinding && (
                          <Badge variant={matchingFinding.severity === 'HIGH' ? 'danger' : 'warning'}>
                            {matchingFinding.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="leading-relaxed font-sans">{seg.text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. TAB CONTENT: RISK CATEGORIES */}
      {activeTab === 'risk_summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(report.categories || {}).map(([catKey, catData]: [string, any]) => {
            if (['communityGuidelines', 'advertiserSuitability', 'copyrightSignals', 'metadataIntegrity'].includes(catKey)) {
              return null;
            }
            return (
              <Card key={catKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-neutral-900">
                      {formatCategoryName(catKey)}
                    </CardTitle>
                    <Badge variant={catData.risk_level === 'HIGH' ? 'danger' : catData.risk_level === 'MEDIUM' ? 'warning' : 'success'}>
                      {catData.risk_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-neutral-100 pb-2">
                    <span className="text-neutral-500 font-medium">Policy Compliance Score</span>
                    <span className="font-mono font-bold text-neutral-900">{catData.score} / 100</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Category Evaluation Summary
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed font-sans">
                      {catData.summary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 9. TAB CONTENT: METADATA */}
      {activeTab === 'metadata' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-neutral-700" />
                Video Metadata & Spoken Language Analysis
              </CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Extracted YouTube specifications, spoken dialogue language detection, and metadata consistency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Video Title</span>
                  <p className="font-bold text-neutral-900 text-sm leading-snug">
                    {report.videoInformation?.title || report.metadata?.title || 'Untitled'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Channel / Creator</span>
                  <p className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    {report.videoInformation?.channelTitle || 'Channel Information Available'}
                  </p>
                  {report.videoInformation?.videoId && (
                    <p className="text-[11px] font-mono text-neutral-500">ID: {report.videoInformation.videoId}</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Source & Duration</span>
                  <p className="font-semibold text-neutral-900">
                    {report.metadata?.sourceType || 'YouTube URL'} • {report.videoInformation?.durationSeconds || report.metadata?.durationSeconds ? `${Math.round(report.videoInformation?.durationSeconds || report.metadata?.durationSeconds || 0)}s` : 'Unknown duration'}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Category: <span className="font-medium text-neutral-700">{report.videoInformation?.category || report.metadata?.category || 'General'}</span>
                  </p>
                </div>
              </div>

              {/* Automatic Language Detection Card */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      Spoken Dialogue Language Detection (From Audio)
                    </span>
                  </div>
                  {report.languageDetails?.isCodeSwitched && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900 border border-blue-300">
                      Code-Switched / Multilingual Speech
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Primary Spoken Language</span>
                    <p className="text-sm font-bold text-neutral-900 mt-0.5">
                      {report.languageDetails?.primaryLanguage || transcript?.language || report.metadata?.language || 'English'}
                    </p>
                    <p className="text-[10px] font-mono text-neutral-500">
                      Code: {report.languageDetails?.languageCode || 'en'}
                    </p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Detection Confidence</span>
                    <p className="text-sm font-mono font-bold text-blue-900 mt-0.5">
                      {report.languageDetails?.confidence ? `${Math.round(report.languageDetails.confidence * 100)}%` : '95%'}
                    </p>
                    <p className="text-[10px] text-neutral-500">Audio Dialogue Grounded</p>
                  </div>

                  <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">Detected Languages / Dialects</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(report.languageDetails?.detectedLanguages || [report.languageDetails?.primaryLanguage || 'English']).map((lang, idx) => (
                        <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* YouTube Tags Section */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                    YouTube Video Tags {report.videoInformation?.tags?.length ? `(${report.videoInformation.tags.length})` : ''}
                  </span>
                  {report.videoInformation?.tagsUnavailable && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                      Tags Unavailable or None Specified
                    </span>
                  )}
                </div>

                {report.videoInformation?.tags && report.videoInformation.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {report.videoInformation.tags.map((tag, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-neutral-300 text-neutral-800 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic">
                    No public video tags found on this YouTube video or tags were omitted by the creator.
                  </p>
                )}
              </div>

              {/* Video Description */}
              {report.videoInformation?.description && (
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                    YouTube Video Description
                  </span>
                  <div className="max-h-36 overflow-y-auto pr-2">
                    <p className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed font-sans">
                      {report.videoInformation.description}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 10. TAB CONTENT: LIMITATIONS */}
      {activeTab === 'limitations' && (
        <div className="space-y-4">
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                PreScan Technical Evaluation Scope & Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-amber-950">
              <ul className="space-y-2 list-disc pl-5 leading-relaxed font-sans">
                <li>Visual computer vision frame analysis was not performed — PreScan Phase 05-10 evaluates spoken audio dialogue and metadata text attributes.</li>
                <li>Background audio tracks were analyzed for transcript dialogue; acoustic music fingerprinting is subject to third-party Content ID databases.</li>
                <li>PreScan provides automated policy advisory signals; YouTube enforcement mechanisms are dynamic and server-side.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MANDATORY PRESCAN DISCLAIMER FOOTER */}
      <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-600 space-y-1.5 print:mt-8">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-neutral-700" />
          <h5 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
            PreScan Policy Advisory Disclaimer
          </h5>
        </div>
        <p className="text-[11px] text-neutral-600 leading-relaxed font-sans">
          {report.disclaimer ||
            'PreScan is an advisory pre-upload QA tool. Final policy decisions rest entirely with YouTube\'s automated systems and review teams. PreScan does not guarantee monetization, policy compliance, or freedom from content strikes.'}
        </p>
      </div>
    </div>
  );
};
