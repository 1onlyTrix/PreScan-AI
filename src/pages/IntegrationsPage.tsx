import React from 'react';
import { Youtube, Shield, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';

interface IntegrationsPageProps {
  onNavigate: (route: string) => void;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Channel Integrations"
        description="Connect YouTube Studio channels to automate pre-upload checks and draft imports."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate('/app/dashboard') },
              { label: 'Integrations' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* YouTube Channel Integration Card */}
        <Card variant="default" className="flex flex-col justify-between">
          <div>
            <CardHeader className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 shadow-xs">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">YouTube Studio</CardTitle>
                    <span className="text-xs text-neutral-500">Google YouTube Data & Partner API</span>
                  </div>
                </div>
                <Badge variant="neutral">Not Connected</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                Allows PreScan to ingest unlisted drafts, extract uploaded captions/audio, and verify thumbnail & metadata alignment prior to public release.
              </p>

              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200/80 space-y-2">
                <p className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
                  Required Scopes:
                </p>
                <ul className="space-y-1.5 text-xs text-neutral-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span><code className="text-[11px] bg-white px-1 py-0.5 rounded border border-neutral-200">youtube.readonly</code> (View video details & drafts)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span><code className="text-[11px] bg-white px-1 py-0.5 rounded border border-neutral-200">yt-analytics.readonly</code> (Audit history metrics)</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-4">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Youtube className="w-4 h-4" />}
              disabled
            >
              Connect YouTube Channel
            </Button>
            <span className="text-xs text-neutral-400 font-mono">
              OAuth 2.0 (Phase 05)
            </span>
          </CardFooter>
        </Card>

        {/* Security & Token Storage Card */}
        <Card variant="subtle">
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-neutral-800" />
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Token & Privacy Security
              </CardTitle>
            </div>
            <CardDescription>
              Security specifications for channel integration tokens.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-xs text-neutral-600 leading-relaxed">
            <p>
              • <strong>Minimal Scopes:</strong> PreScan requests read-only draft verification access. It will never request or require permission to delete or publish videos without explicit creator confirmation.
            </p>
            <p>
              • <strong>Encryption at Rest:</strong> OAuth refresh tokens are encrypted using AES-256 before persistence in the multi-tenant database.
            </p>
            <p>
              • <strong>Revocation:</strong> Channel access can be revoked instantly at any time from this dashboard or Google Account Security.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
