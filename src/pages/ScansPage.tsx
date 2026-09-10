import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Plus,
  Filter,
  Search,
  FileVideo,
  Youtube,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Badge } from '../components/ui/Badge';
import { ScanService } from '../services/scan.service';
import { SupabaseDataService } from '../services/supabaseData.service';
import { StorageService } from '../services/storage.service';
import { Scan } from '../types/models';
import { ScanStatus } from '../types/enums';
import { ROUTES } from '../router/routes';
import { useAuth } from '../context/AuthContext';

interface ScansPageProps {
  onNavigate: (route: string) => void;
}

export const ScansPage: React.FC<ScansPageProps> = ({ onNavigate }) => {
  const { organization } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabaseScans = await SupabaseDataService.getScans();
      let apiScans: Scan[] = [];
      try {
        const res = await ScanService.listScans({
          organizationId: organization?.id,
          search: searchQuery || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        });
        apiScans = res.scans || [];
      } catch {
        // Fallback to Supabase scans
      }

      const combinedMap = new Map<string, Scan>();
      [...supabaseScans, ...apiScans].forEach((s) => {
        if (!combinedMap.has(s.id)) {
          combinedMap.set(s.id, s);
        }
      });

      let allList = Array.from(combinedMap.values());
      if (searchQuery) {
        allList = allList.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      if (statusFilter && statusFilter !== 'ALL') {
        allList = allList.filter((s) => s.status === statusFilter);
      }

      setScans(allList);
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, searchQuery, statusFilter]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Periodic refresh if any scan is actively ingesting
  useEffect(() => {
    const hasActiveIngestion = scans.some(
      (s) =>
        s.status === ScanStatus.QUEUED ||
        s.status === ScanStatus.VALIDATING ||
        s.status === ScanStatus.INGESTING
    );

    if (!hasActiveIngestion) return;

    const interval = setInterval(() => {
      fetchScans();
    }, 2500);

    return () => clearInterval(interval);
  }, [scans, fetchScans]);

  const handleDeleteScan = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this scan record?')) return;
    setDeletingId(scanId);
    try {
      const targetScan = scans.find((s) => s.id === scanId);
      if (targetScan?.mediaInfo?.storagePath) {
        await StorageService.deleteFile(targetScan.mediaInfo.storagePath).catch(() => {});
      }
      await SupabaseDataService.deleteScan(scanId).catch(() => {});
      await ScanService.deleteScan(scanId).catch(() => {});
      setScans((prev) => prev.filter((s) => s.id !== scanId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete scan.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: ScanStatus, progress?: number) => {
    switch (status) {
      case ScanStatus.READY_FOR_ANALYSIS:
      case ScanStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ready for Analysis
          </span>
        );
      case ScanStatus.VALIDATING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            Validating
          </span>
        );
      case ScanStatus.INGESTING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
            Ingesting {progress ? `(${progress}%)` : ''}
          </span>
        );
      case ScanStatus.QUEUED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Queued
          </span>
        );
      case ScanStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            Failed
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Repository"
        description="Historical log of pre-upload scans, ingested media payloads, and workspace evidence records."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate(ROUTES.DASHBOARD) },
              { label: 'Scan Repository' },
            ]}
          />
        }
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate(ROUTES.NEW_SCAN)}
          >
            New Scan
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search scans by title, video ID, or filename..."
            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
          {[
            { id: 'ALL', label: 'All Scans' },
            { id: 'READY_FOR_ANALYSIS', label: 'Ready' },
            { id: 'INGESTING', label: 'Processing' },
            { id: 'FAILED', label: 'Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scans List / Loading / Empty States */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 text-neutral-400 animate-spin" />
          <p className="text-xs text-neutral-500 font-mono">Loading workspace scans...</p>
        </div>
      ) : scans.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={<History className="w-6 h-6" />}
            badgeText="Scan Repository"
            title={
              searchQuery || statusFilter !== 'ALL'
                ? 'No matching scans found'
                : 'No scans executed yet'
            }
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter to locate existing scan records.'
                : 'Your workspace repository will record ingested media files, YouTube URLs, and compliance records as you create scans.'
            }
            primaryAction={{
              label: '+ Run First PreScan',
              onClick: () => onNavigate(ROUTES.NEW_SCAN),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {scans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => onNavigate(ROUTES.SCAN_DETAIL(scan.id))}
              className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50/50 transition-all cursor-pointer shadow-2xs"
            >
              {/* Media Thumbnail / Icon & Details */}
              <div className="flex items-center gap-3.5 overflow-hidden flex-1">
                {scan.sourceType === 'youtube_url' ? (
                  <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-200 shadow-2xs">
                    <img
                      src={
                        scan.mediaInfo?.thumbnailUrl ||
                        `https://img.youtube.com/vi/${scan.mediaInfo?.youtubeVideoId}/hqdefault.jpg`
                      }
                      alt={scan.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-white font-mono text-[8px] font-bold">
                      YT
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800 shrink-0 shadow-2xs">
                    <FileVideo className="w-6 h-6" />
                  </div>
                )}

                <div className="overflow-hidden space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-neutral-900 truncate group-hover:text-neutral-950">
                      {scan.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="font-medium text-neutral-700 capitalize">
                      {scan.category || 'Entertainment'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">
                      {new Date(scan.createdAt).toLocaleDateString()} at{' '}
                      {new Date(scan.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {scan.mediaInfo?.fileSizeBytes && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px]">
                          {(scan.mediaInfo.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                <div className="flex items-center gap-2">
                  {getStatusBadge(scan.status, scan.progressPercent)}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteScan(scan.id, e)}
                    disabled={deletingId === scan.id}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete Scan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="group-hover:border-neutral-900"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
