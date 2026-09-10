import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  DollarSign,
  Copyright,
  FileText,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Building2,
  History,
  FileVideo,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { CAPABILITIES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';
import { ScanService } from '../services/scan.service';
import { Scan } from '../types/models';
import { ScanStatus } from '../types/enums';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, organization } = useAuth();
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);

  const capabilityIcons: Record<string, React.ReactNode> = {
    'community-guidelines': <ShieldAlert className="w-5 h-5 text-neutral-800" />,
    'advertiser-suitability': <DollarSign className="w-5 h-5 text-neutral-800" />,
    'copyright-signals': <Copyright className="w-5 h-5 text-neutral-800" />,
    'metadata-integrity': <FileText className="w-5 h-5 text-neutral-800" />,
  };

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Creator';
  const wsName = organization?.name || 'Your Workspace';

  useEffect(() => {
    let isMounted = true;
    const fetchRecent = async () => {
      setIsLoadingScans(true);
      try {
        const res = await ScanService.listScans({
          organizationId: organization?.id,
          limit: 3,
        });
        if (isMounted) {
          setRecentScans(res.scans || []);
        }
      } catch (err) {
        console.error('Failed to load recent scans:', err);
      } finally {
        if (isMounted) setIsLoadingScans(false);
      }
    };

    fetchRecent();
    return () => {
      isMounted = false;
    };
  }, [organization?.id]);

  const renderStatusBadge = (status: ScanStatus) => {
    switch (status) {
      case ScanStatus.READY_FOR_ANALYSIS:
      case ScanStatus.COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ready
          </span>
        );
      case ScanStatus.INGESTING:
      case ScanStatus.VALIDATING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
            Ingesting
          </span>
        );
      case ScanStatus.QUEUED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Queued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Page Header */}
      <PageHeader
        title="Workspace Overview"
        description={`Manage pre-upload safety and review queues for ${wsName}.`}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active Session
          </span>
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

      {/* Intentional Welcome Banner */}
      <div className="rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50/80 p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 mb-4 border border-neutral-200">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>Pre-Upload Quality Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mb-2">
            Welcome back, {firstName}.
          </h2>

          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Run your PreScan to validate container streams, audio dialogue, and YouTube metadata before you publish. All scans are securely partitioned in <strong className="text-neutral-900">{wsName}</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => onNavigate(ROUTES.NEW_SCAN)}
            >
              + New Scan
            </Button>
            <Button
              variant="outline"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => onNavigate(ROUTES.SCANS)}
            >
              View Scan Repository
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Workspace Ingestion Activity */}
      {recentScans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Recent Workspace Ingestions
            </h3>
            <button
              onClick={() => onNavigate(ROUTES.SCANS)}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              <span>View all ({recentScans.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                onClick={() => onNavigate(ROUTES.SCAN_DETAIL(scan.id))}
                className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-900 bg-white hover:bg-neutral-50/60 transition-all cursor-pointer shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase">
                    {scan.sourceType === 'youtube_url' ? 'YouTube' : 'Upload'}
                  </span>
                  {renderStatusBadge(scan.status)}
                </div>

                <div className="flex items-center gap-2.5">
                  {scan.sourceType === 'youtube_url' ? (
                    <div className="relative w-14 aspect-video rounded bg-neutral-900 shrink-0 overflow-hidden border border-neutral-200">
                      <img
                        src={
                          scan.mediaInfo?.thumbnailUrl ||
                          `https://img.youtube.com/vi/${scan.mediaInfo?.youtubeVideoId}/hqdefault.jpg`
                        }
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
                      <FileVideo className="w-4 h-4" />
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {scan.title}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Four Product Capabilities Overview */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-800">
            Analysis Capabilities
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Four core dimensions evaluated during each PreScan execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPABILITIES.map((cap) => (
            <Card key={cap.id} variant="default" className="flex flex-col justify-between">
              <div>
                <CardHeader className="mb-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                      {capabilityIcons[cap.id]}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-neutral-900">
                        {cap.name}
                      </CardTitle>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {cap.shortDescription}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="mb-4">
                  <p className="text-xs text-neutral-600 leading-relaxed mb-3">
                    {cap.details}
                  </p>
                  <ul className="space-y-1.5">
                    {cap.coverageList.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span className="font-mono text-[11px]">Phase Engine Spec</span>
                <span className="text-neutral-400">Standard Rule-Set</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Tenant Isolation & Security Architecture Note */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 flex items-start gap-4 shadow-xs">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-1">
            Multi-Tenant Isolation Architecture
          </h4>
          <p className="text-xs text-neutral-500 leading-relaxed">
            All videos, scans, findings, and reports are partitioned by workspace ID (<code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono">{organization?.id || 'org_active'}</code>). Scans and data are strictly isolated.
          </p>
        </div>
      </div>
    </div>
  );
};
