import React, { useState, useEffect } from 'react';
import { FileCheck2, Plus, Search, ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ScanService } from '../services/scan.service';
import { Scan } from '../types/models';
import { ScanStatus } from '../types/enums';

interface ReportsPageProps {
  onNavigate: (route: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadReports() {
      try {
        setIsLoading(true);
        const res = await ScanService.listScans({ limit: 50 });
        setScans(res.scans);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  // Filter completed or analysed scans
  const reportScans = scans.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getRiskBadge = (risk?: string) => {
    switch (risk) {
      case 'LOW':
        return <Badge variant="success">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge variant="danger">High Risk</Badge>;
      case 'CRITICAL':
        return <Badge variant="danger">Critical Risk</Badge>;
      default:
        return <Badge variant="neutral">{risk || 'Pending'}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Risk Reports"
        description="Comprehensive audit reports detailing Community Guidelines, Advertiser Suitability, and Copyright signals."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate('/app/dashboard') },
              { label: 'Reports' },
            ]}
          />
        }
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate('/app/new-scan')}
          >
            New Scan
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-neutral-200 shadow-xs">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
          <p className="text-xs text-neutral-500 font-mono">Loading reports...</p>
        </div>
      ) : reportScans.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={<FileCheck2 className="w-6 h-6" />}
            badgeText="Audit Documents"
            title="No compliance reports generated yet"
            description="Reports are generated automatically upon completion of a PreScan. They summarize overall risk, evidence quotes, and recommended creator actions."
            primaryAction={{
              label: '+ Run PreScan to Generate Report',
              onClick: () => onNavigate('/app/new-scan'),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportScans.map((scan) => (
            <Card
              key={scan.id}
              className="hover:border-neutral-900 transition-all cursor-pointer group"
              onClick={() => onNavigate(`/app/scans/${scan.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  {getRiskBadge(scan.overallRisk)}
                  <span className="text-[10px] font-mono text-neutral-400">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-neutral-900 group-hover:text-neutral-900 line-clamp-2">
                  {scan.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100">
                  <span className="text-neutral-500 capitalize">{scan.sourceType.replace('_', ' ')}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-neutral-800 group-hover:translate-x-0.5 transition-transform">
                    <span>View Audit</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
