import React from 'react';
import {
  ShieldCheck,
  Lock,
  Server,
  Key,
  Trash2,
  EyeOff,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  Database,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { ROUTES } from '../router/routes';

interface PublicSecurityPageProps {
  onNavigate: (route: string) => void;
}

export const PublicSecurityPage: React.FC<PublicSecurityPageProps> = ({ onNavigate }) => {
  const securityPillars = [
    {
      title: 'Tenant Isolation & Partitioning',
      description: 'Every creator workspace and production organization operates with isolated database scopes and strict role-based access boundaries.',
      icon: <Database className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Transient Media Processing',
      description: 'Uploaded video and audio streams are processed solely for the duration of the scan transcription and evaluation pipeline, with strict data lifecycle retention controls.',
      icon: <Server className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Zero Public Model Training',
      description: 'Your unreleased video concepts, creative transcripts, and metadata are never used to train public foundation models or shared with third parties.',
      icon: <EyeOff className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Secure Authentication & Sessions',
      description: 'Authentication architecture is built on cryptographically signed tokens, encrypted session cookies, and standard industry protocol standards.',
      icon: <Lock className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Least-Privilege Integrations',
      description: 'When connecting external platforms like YouTube Studio in future phases, PreScan requests strictly the minimal necessary scopes required to fetch draft metadata.',
      icon: <Key className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Data Retention & Creator Deletion Rights',
      description: 'You maintain 100% control over your scans and project history. Deleting a report or project permanently purges associated metadata from our systems.',
      icon: <Trash2 className="w-5 h-5 text-neutral-900" />,
    },
  ];

  return (
    <MarketingLayout
      title="Security, Privacy & Data Handling Architecture | PreScan"
      description="PreScan is designed with security and privacy as foundational requirements. Learn about our tenant isolation, transient media processing, and data policies."
      currentRoute={ROUTES.SECURITY}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-16 sm:py-20 bg-linear-to-b from-neutral-50/80 via-white to-white border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
            <span>Trust & Infrastructure</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            Security & Privacy Architecture
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            PreScan is being designed with security and privacy as foundational requirements. We protect your unreleased drafts, video scripts, and creator credentials.
          </p>
        </div>
      </section>

      {/* Pillars Grid */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Core Security Principles
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              How we safeguard unpublished creator intellectual property at every stage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {securityPillars.map((p, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200/90 shadow-2xs space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center">
                  {p.icon}
                </div>
                <h3 className="text-sm font-bold text-neutral-900">{p.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Technical Standards */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10 text-left">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Data Handling & Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              A transparent breakdown of how your files move through PreScan.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                1. Upload & Ingestion Encryption
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                All network communication between your browser and PreScan endpoints is encrypted in transit using modern TLS 1.3 encryption. Media uploads are temporarily transferred via pre-signed, expiring storage handles.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                2. Processing Isolation
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Audio extraction occurs in isolated worker containers. Transcription and policy evaluation modules operate within containerized execution boundaries with no cross-tenant memory sharing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <h3 className="text-sm font-bold text-neutral-900">
                3. Permanent Data Deletion
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                When you delete a video scan, report, or account, PreScan initiates a cascade deletion removing all associated transcripts, heuristic findings, and metadata records from active storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Honest Compliance & Responsible Claims Statement */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 text-left space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-700" />
              <span>Responsible Security Disclosures</span>
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              PreScan is built on security-first engineering practices. We do not claim third-party certifications (such as SOC 2 or ISO) until formal audits are completed and verified. We are committed to complete transparency regarding our infrastructure, data retention, and security posture.
            </p>
          </div>

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate(ROUTES.SIGNUP)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start scanning free
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
