import React from 'react';
import {
  ShieldAlert,
  DollarSign,
  Copyright,
  FileText,
  Clock,
  Share2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Sliders,
  FileCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { FindingCardPreview } from '../components/marketing/FindingCardPreview';
import { CAPABILITIES } from '../config/constants';
import { ROUTES } from '../router/routes';

interface PublicFeaturesPageProps {
  onNavigate: (route: string) => void;
}

export const PublicFeaturesPage: React.FC<PublicFeaturesPageProps> = ({ onNavigate }) => {
  const capabilityIcons: Record<string, React.ReactNode> = {
    'community-guidelines': <ShieldAlert className="w-5 h-5 text-neutral-900" />,
    'advertiser-suitability': <DollarSign className="w-5 h-5 text-neutral-900" />,
    'copyright-signals': <Copyright className="w-5 h-5 text-neutral-900" />,
    'metadata-integrity': <FileText className="w-5 h-5 text-neutral-900" />,
  };

  const platformFeatures = [
    {
      title: 'Approximate Audio Timestamping',
      description: 'Pinpoints detected signals to precise seconds in your timeline (e.g., ~04:21), eliminating the need to re-scrub long video files.',
      icon: <Clock className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Multi-Category Risk Scoring',
      description: 'Four independent assessment models grade Community Guidelines, Advertiser Suitability, Copyright References, and Metadata consistency.',
      icon: <Sliders className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Actionable Remediation Guidance',
      description: 'Every finding pairs evidence quotes with a clear rationale and suggested creator actions (such as muting, bleeping, or title rewording).',
      icon: <FileCheck className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Shareable Review Reports',
      description: 'Generate clean, read-only report links for video editors, sponsors, talent managers, or legal advisors without granting workspace edit rights.',
      icon: <Share2 className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Multi-Channel Project Workspaces',
      description: 'Group video scans by YouTube channel, series, podcast season, or client account with organized audit history.',
      icon: <Users className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Transparent Heuristic Boundaries',
      description: 'Clear indicators distinguish between low-risk passes, creator review items, and areas where visual or manual inspection is required.',
      icon: <Search className="w-5 h-5 text-neutral-900" />,
    },
  ];

  return (
    <MarketingLayout
      title="Features & Analysis Capabilities | PreScan"
      description="Explore PreScan's pre-upload quality assurance features: Community Guidelines checks, Advertiser Suitability, Copyright References, and Metadata integrity."
      currentRoute={ROUTES.FEATURES}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-16 sm:py-20 bg-linear-to-b from-neutral-50/80 via-white to-white border-b border-neutral-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>Platform Capabilities</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            Engineered for pre-publish precision
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            PreScan provides YouTube creators, editors, and production teams with a structured review layer across spoken dialogue and metadata.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate(ROUTES.SIGNUP)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start scanning free
            </Button>
          </div>
        </div>
      </section>

      {/* 4 Deep Dive Categories */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              The Four Inspection Dimensions
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Each scan evaluates four distinct policy and quality dimensions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {CAPABILITIES.map((cap) => (
              <Card key={cap.id} className="bg-white flex flex-col justify-between">
                <div>
                  <CardHeader className="mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                        {capabilityIcons[cap.id]}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-neutral-900">
                          {cap.name}
                        </CardTitle>
                        <p className="text-xs text-neutral-500">{cap.shortDescription}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {cap.details}
                    </p>
                    <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                        Coverage Scope
                      </div>
                      <ul className="space-y-2">
                        {cap.coverageList.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Illustrative Findings Section */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10 text-center">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Interactive Findings Anatomy
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              PreScan findings provide clear context, evidence quotes, and recommendations.
            </p>
          </div>

          <FindingCardPreview />
        </div>
      </section>

      {/* Platform & Collaboration Features Grid */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Built for production post-production
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Tools designed to integrate smoothly into solo creator schedules and multi-editor studio queues.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {platformFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-neutral-50/60 border border-neutral-200/90 shadow-2xs space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-bold text-neutral-900">{feat.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scope and Boundaries */}
      <section className="py-16 sm:py-24 bg-neutral-50/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Clear Analysis Scope & Boundaries
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto leading-relaxed">
            We are explicit about what PreScan does and does not do.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-4">
            <div className="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>What PreScan Does</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Evaluates spoken dialogue transcripts, opening profanity density, verbal copyright mentions, and title/description alignment, surfacing timestamped suggestions for creator review.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
                <Info className="w-4 h-4 text-neutral-600" />
                <span>What PreScan Does Not Do</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                PreScan does not analyze visual video frames, perform official YouTube Content ID waveform matching, guarantee monetization status, or substitute for creator human judgment.
              </p>
            </div>
          </div>

          <div className="pt-6">
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
