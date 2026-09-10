import React from 'react';
import { Shield, Lock, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { ROUTES } from '../router/routes';

interface PublicPrivacyPageProps {
  onNavigate: (route: string) => void;
}

export const PublicPrivacyPage: React.FC<PublicPrivacyPageProps> = ({ onNavigate }) => {
  return (
    <MarketingLayout
      title="Privacy Policy | PreScan"
      description="PreScan Privacy Policy: Learn how we handle your media files, draft metadata, and account information with tenant isolation and privacy safeguards."
      currentRoute={ROUTES.PRIVACY}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-14 sm:py-16 bg-neutral-50/80 border-b border-neutral-200/80 text-left">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-800">
            <Shield className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Privacy Policy
          </h1>
          <p className="text-xs text-neutral-500 font-mono">
            Last Updated: August 2026 • Version 1.0 (Phase 02 Baseline)
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 sm:py-16 bg-white text-left">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
            <strong>Summary:</strong> PreScan is engineered with creator privacy at its foundation. We process uploaded audio and draft metadata solely to deliver pre-publish risk reports. We do not sell your data, use your unreleased media to train public models, or share unpublished creative concepts with third parties.
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              1. Information We Collect
            </h2>
            <p>
              When you create an account, upload media, or interact with PreScan services, we collect:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account Information:</strong> Name, email address, password hash, and organization membership details.
              </li>
              <li>
                <strong>Creator Content & Metadata:</strong> Uploaded video/audio media files, dialogue audio transcripts, video titles, descriptions, and tag information submitted for evaluation.
              </li>
              <li>
                <strong>Usage & Diagnostic Data:</strong> Scan logs, timestamp records, heuristic outcome ratings, and session access metrics.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              2. How We Process Media & Audio
            </h2>
            <p>
              PreScan extracts the audio stream from submitted media files for speech transcription, acoustic cue extraction, and policy heuristic scoring. Media files are handled in transient, isolated worker environments. We do not aggregate creator audio or transcripts into public AI foundation training sets.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              3. Data Retention & Creator Deletion Rights
            </h2>
            <p>
              You maintain full editorial ownership over your content. You may delete individual video scans, project workspaces, or your entire account at any time. When a deletion request is initiated, all associated transcripts, heuristic findings, and temporary storage files are permanently purged from active systems.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              4. Third-Party Integrations & Google/YouTube Data
            </h2>
            <p>
              When optional third-party integrations (such as YouTube Studio channel links) are enabled in future releases, PreScan accesses draft video metadata exclusively using least-privilege OAuth scopes. PreScan complies with third-party developer policies and does not use channel credentials for unrequested background operations.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              5. Security Measures
            </h2>
            <p>
              We implement industry-standard administrative, technical, and physical safeguards designed to protect your data against unauthorized access, destruction, or disclosure. All data in transit is encrypted using TLS 1.3 standards.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-neutral-900">
              6. Contacting Privacy Support
            </h2>
            <p>
              If you have any questions or data requests regarding this Privacy Policy, please contact our team via the{' '}
              <button
                onClick={() => onNavigate(ROUTES.CONTACT)}
                className="text-neutral-900 font-semibold underline"
              >
                Contact Page
              </button>
              .
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
