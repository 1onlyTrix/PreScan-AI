import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Copyright,
  FileText,
  CheckCircle2,
  Lock,
  UploadCloud,
  Cpu,
  ListChecks,
  Send,
  Users,
  Video,
  Layers,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { ReportHeroPreview } from '../components/marketing/ReportHeroPreview';
import { TimelineVisualPreview } from '../components/marketing/TimelineVisualPreview';
import { FindingCardPreview } from '../components/marketing/FindingCardPreview';
import { ComparisonSection } from '../components/marketing/ComparisonSection';
import { TrustSection } from '../components/marketing/TrustSection';
import { FaqAccordion } from '../components/marketing/FaqAccordion';
import { APP_INFO, CAPABILITIES, MARKETING_FAQS, USE_CASES } from '../config/constants';
import { ROUTES } from '../router/routes';

interface PublicLandingPageProps {
  onNavigate: (route: string) => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onNavigate }) => {
  const howItWorksSteps = [
    {
      step: '01',
      title: 'Add your video',
      description: 'Start with a file, a YouTube link, or your connected channel. Choose the workflow that fits your setup.',
      icon: <UploadCloud className="w-5 h-5 text-neutral-900" />,
    },
    {
      step: '02',
      title: 'PreScan analyzes it',
      description: 'Dialogue, audio cues, and video metadata are parsed through multi-category policy models.',
      icon: <Cpu className="w-5 h-5 text-neutral-900" />,
    },
    {
      step: '03',
      title: 'Review what matters',
      description: 'Inspect timestamped findings with evidence quotes, severity ratings, and actionable guidance.',
      icon: <ListChecks className="w-5 h-5 text-neutral-900" />,
    },
    {
      step: '04',
      title: 'Publish with context',
      description: 'Make informed edits or adjustments, knowing exactly what was reviewed before going live.',
      icon: <Send className="w-5 h-5 text-neutral-900" />,
    },
  ];

  const targetAudiences = [
    {
      title: 'Creators',
      tagline: 'Publish consistently without adding another manual checklist.',
      description: 'Run automatic pre-checks while you prepare thumbnails and descriptions, catching accidental slip-ups before publishing.',
      icon: <Video className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Editors',
      tagline: 'Catch issues before the final export reaches the creator.',
      description: 'Provide clients and channels with timestamped QA summaries during final delivery, preventing last-minute re-exports.',
      icon: <Layers className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Agencies',
      tagline: 'Standardize pre-publish review across client channels.',
      description: 'Maintain uniform quality benchmarks and review standards across diverse talent rosters and multi-creator networks.',
      icon: <Users className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Content Teams',
      tagline: 'Create a repeatable quality-assurance workflow.',
      description: 'Collaborate with shared workspaces, review queues, and audit histories for podcast and video studio productions.',
      icon: <CheckCircle2 className="w-5 h-5 text-neutral-900" />,
    },
  ];

  const capabilityIcons: Record<string, React.ReactNode> = {
    'community-guidelines': <ShieldAlert className="w-5 h-5 text-neutral-900" />,
    'advertiser-suitability': <DollarSign className="w-5 h-5 text-neutral-900" />,
    'copyright-signals': <Copyright className="w-5 h-5 text-neutral-900" />,
    'metadata-integrity': <FileText className="w-5 h-5 text-neutral-900" />,
  };

  return (
    <MarketingLayout
      title="PreScan — Know What to Review Before You Publish"
      description="PreScan analyzes your video's audio and metadata for potential YouTube policy, advertiser-suitability, copyright-reference, and metadata risks before you publish."
      currentRoute={ROUTES.HOME}
      onNavigate={onNavigate}
    >
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-neutral-200/80 bg-linear-to-b from-neutral-50/70 via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Subtle trust badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>AI-Powered Pre-Upload Quality Assurance</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 max-w-4xl mx-auto leading-[1.15]">
            Know what to review before you publish.
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            PreScan analyzes your video's audio and metadata for potential YouTube policy, advertiser-suitability, copyright-reference, and metadata risks before you publish.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate(ROUTES.SIGNUP)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start scanning free
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate(ROUTES.HOW_IT_WORKS)}
            >
              See how it works
            </Button>
          </div>

          <div className="pt-2 text-xs text-neutral-500 font-medium">
            Built for creators, editors, and content teams.
          </div>

          {/* 2. HERO PRODUCT VISUAL MOCKUP */}
          <div className="pt-8 sm:pt-12 max-w-4xl mx-auto">
            <ReportHeroPreview />
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">
            <span>The Publishing Reality</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Publishing shouldn't be the first time you discover a problem.
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto">
            Creators spend hours refining cuts, color grading, and designing thumbnails. But crucial content signals can remain buried inside long stretches of spoken audio.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-6">
            <div className="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Buried Spoken Risks
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Opening profanity density, sensitive topic discussions, or unscripted comments can trigger yellow monetization icons without warning.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Third-Party Media Cues
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Verbal references to commercial music or brand assets that require rights verification before publishing to public feeds.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Metadata Disconnects
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Titles and descriptions that overstate claims or omit required disclosures can harm viewer retention and policy trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <span>Step-by-Step QA</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              How PreScan works
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              PreScan adds an intelligent review step before publication. It helps you identify what deserves another look.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {howItWorksSteps.map((s, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-neutral-50/60 border border-neutral-200/90 shadow-2xs flex flex-col justify-between space-y-4 text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      STEP {s.step}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                      {s.icon}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-1.5">
                    {s.title}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-200 text-center text-xs text-neutral-600 max-w-2xl mx-auto">
            <strong>Important Notice:</strong> PreScan does not guarantee monetization or policy clearance. It gives creators context to make confident editorial choices.
          </div>
        </div>
      </section>

      {/* 5. FOUR CORE CAPABILITIES */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40" id="capabilities">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <span>Inspection Dimensions</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Four focused analysis categories
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              Targeted models trained specifically on creator guidelines and content risk signals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {CAPABILITIES.map((cap) => (
              <Card key={cap.id} className="bg-white">
                <CardHeader className="mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
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
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                      Key Signals Evaluated
                    </div>
                    <ul className="space-y-1.5">
                      {cap.coverageList.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate(ROUTES.FEATURES)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Explore detailed feature specifications
            </Button>
          </div>
        </div>
      </section>

      {/* 6. FINDINGS DEMONSTRATION & TIMELINE */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <span>Report Sample</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Actionable findings with timestamps
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              PreScan findings include detected evidence quotes, policy reasoning, and concrete creator recommendations.
            </p>
          </div>

          {/* Interactive Findings Preview */}
          <FindingCardPreview />

          {/* Timeline Visual */}
          <TimelineVisualPreview />
        </div>
      </section>

      {/* 7. DIFFERENTIATOR: NOT ANOTHER CHATBOT */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ComparisonSection />
        </div>
      </section>

      {/* 8. WHO IT'S FOR */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <span>Target Audiences</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Who PreScan is built for
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              Designed for anyone responsible for channel quality, monetization health, and editorial consistency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {targetAudiences.map((aud, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-neutral-50/60 border border-neutral-200/90 shadow-2xs space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center">
                    {aud.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">{aud.title}</h3>
                    <p className="text-xs text-neutral-500 font-medium">{aud.tagline}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed pt-1">
                  {aud.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. USE CASES (CONTEXT AWARENESS) */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <span>Content Niches</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Tuned for your content format
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              Risk guidelines vary significantly across genres. PreScan evaluates signals in the proper content context.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {USE_CASES.map((uc, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900">{uc.title}</h3>
                  <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200">
                    {uc.badge}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {uc.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. TRUST SECTION: DESIGNED TO BE CONSERVATIVE */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <TrustSection />
        </div>
      </section>

      {/* 11. SECURITY & PRIVACY POSITIONING TEASER */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
            <Lock className="w-3.5 h-3.5 text-neutral-700" />
            <span>Privacy & Isolation Foundation</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            Engineered with privacy and isolation at the core
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Your unpublished video drafts and creative scripts are confidential. PreScan is built with strict tenant isolation, encrypted sessions, and transient media processing.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate(ROUTES.SECURITY)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Read our security architecture overview
            </Button>
          </div>
        </div>
      </section>

      {/* 13. FAQ SECTION */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Questions creators frequently ask
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Clear answers about analysis scope, limitations, and how PreScan fits into your workflow.
            </p>
          </div>

          <FaqAccordion items={MARKETING_FAQS} />
        </div>
      </section>

      {/* 14. FINAL CALL TO ACTION */}
      <section className="py-16 sm:py-24 bg-neutral-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 text-white flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Know what to review before you publish.
          </h2>
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Join the pre-upload quality assurance workflow designed specifically for YouTube creators, editors, and content studios.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              className="bg-white text-neutral-900 hover:bg-neutral-100"
              onClick={() => onNavigate(ROUTES.SIGNUP)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start scanning free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-neutral-700 text-white hover:bg-neutral-800"
              onClick={() => onNavigate(ROUTES.HOW_IT_WORKS)}
            >
              Explore how it works
            </Button>
          </div>
          <p className="text-xs text-neutral-400 pt-2">
            No credit card required • 3 free scans included
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
};
