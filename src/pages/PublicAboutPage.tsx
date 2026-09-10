import React from 'react';
import { Sparkles, CheckCircle2, ArrowRight, Target, Shield, Compass, HeartHandshake } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { ROUTES } from '../router/routes';

interface PublicAboutPageProps {
  onNavigate: (route: string) => void;
}

export const PublicAboutPage: React.FC<PublicAboutPageProps> = ({ onNavigate }) => {
  const values = [
    {
      title: 'Creator Sovereignty',
      description: 'You stay in 100% control of what you publish. PreScan provides assistive findings with context, never automated censorship.',
      icon: <Target className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Precision over Noise',
      description: 'We believe a few high-signal, timestamped findings are infinitely more valuable than hundreds of false-positive warnings.',
      icon: <Compass className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Intellectual Honesty',
      description: 'We clearly state what our models can and cannot do. We never make exaggerated compliance or monetization guarantees.',
      icon: <Shield className="w-5 h-5 text-neutral-900" />,
    },
    {
      title: 'Product Craftsmanship',
      description: 'We build fast, restrained, reliable software that respects creator time and seamlessly fits existing editing workflows.',
      icon: <HeartHandshake className="w-5 h-5 text-neutral-900" />,
    },
  ];

  return (
    <MarketingLayout
      title="About PreScan — Why We Built the Pre-Publish Review Layer"
      description="PreScan exists to give YouTube creators, video editors, and production teams a dedicated pre-upload quality assurance layer before publishing."
      currentRoute={ROUTES.ABOUT}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-16 sm:py-20 bg-linear-to-b from-neutral-50/80 via-white to-white border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>Our Mission</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            Filling the missing QA step in the creator stack
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            PreScan exists to give creators a quality-assurance layer before publishing.
          </p>
        </div>
      </section>

      {/* Story & Problem Gap */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 text-left">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              The Creator Tooling Gap
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              The modern creator economy has developed world-class tools for every stage of production: non-linear video editors, color grading suites, AI thumbnail generators, SEO analyzers, and distribution schedulers.
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Yet despite having all of this tooling, <strong>pre-publish quality assurance has remained entirely manual</strong>. Creators and editors are forced to rely on memory, manual checklists, or discover policy issues only after a video has already been published to millions of subscribers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">
              Why PreScan Exists
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              PreScan was founded to build that missing pre-publish layer: an automated, intelligent review engine that parses video audio and metadata, highlights potential risk points with approximate timestamps, and gives creators the exact context they need to make confident editorial decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Our Core Principles
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              The engineering and editorial values that guide PreScan development.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            {values.map((val, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                  {val.icon}
                </div>
                <h3 className="text-base font-bold text-neutral-900">{val.title}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Experience the PreScan review workflow
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto">
            Try 3 free video scans every month. No credit card required.
          </p>
          <div className="pt-2">
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
