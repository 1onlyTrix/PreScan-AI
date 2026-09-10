import React from 'react';
import {
  UploadCloud,
  Cpu,
  ListChecks,
  Send,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { TimelineVisualPreview } from '../components/marketing/TimelineVisualPreview';
import { ComparisonSection } from '../components/marketing/ComparisonSection';
import { FaqAccordion } from '../components/marketing/FaqAccordion';
import { MARKETING_FAQS } from '../config/constants';
import { ROUTES } from '../router/routes';

interface PublicHowItWorksPageProps {
  onNavigate: (route: string) => void;
}

export const PublicHowItWorksPage: React.FC<PublicHowItWorksPageProps> = ({ onNavigate }) => {
  const steps = [
    {
      num: '01',
      title: 'Add your video',
      subtitle: 'Start with a file, a YouTube link, or your connected channel',
      details:
        'Choose the workflow that fits your setup: upload an exported video/audio file, paste a public or unlisted YouTube video URL, or connect your channel for direct draft selection. PreScan extracts the audio stream for heuristic review.',
      points: [
        'Direct file upload (MP4, MOV, MP3, WAV)',
        'YouTube video link support (watch, youtu.be, shorts)',
        'Channel workspace integration (upcoming)',
      ],
      icon: <UploadCloud className="w-6 h-6 text-neutral-900" />,
    },
    {
      num: '02',
      title: 'PreScan evaluates audio & metadata',
      subtitle: 'Multi-category heuristic models parse content',
      details:
        'The audio dialogue is transcribed and evaluated across Community Guidelines, Advertiser Suitability, verbal Copyright References, and Metadata consistency. Signals are measured against public YouTube policy guidelines.',
      points: [
        'Opening 30-second profanity frequency check',
        'Sensitive topic & violent content indicators',
        'Verbal mentions of commercial music or brands',
        'Metadata claim-to-dialogue consistency',
      ],
      icon: <Cpu className="w-6 h-6 text-neutral-900" />,
    },
    {
      num: '03',
      title: 'Review structured findings',
      subtitle: 'Inspect timestamps, evidence quotes, and suggestions',
      details:
        'Rather than a wall of generic chatbot text, you receive an organized report with exact timestamps, evidence excerpts, severity scores (Low, Review Required, Important), and concrete remediation advice.',
      points: [
        'Timestamped cues (e.g., ~04:21 in your timeline)',
        'Evidence excerpts from spoken dialogue',
        'Actionable options: bleep, mute, edit, or keep',
      ],
      icon: <ListChecks className="w-6 h-6 text-neutral-900" />,
    },
    {
      num: '04',
      title: 'Publish with complete context',
      subtitle: 'You stay in 100% editorial control of your channel',
      details:
        'PreScan does not alter your video files or automatically publish on your behalf. You review the findings, make any necessary edits in your video editor, and publish to YouTube with peace of mind.',
      points: [
        'Full creator editorial sovereignty',
        'Historical report archive for past uploads',
        'Shareable summary for editors and sponsors',
      ],
      icon: <Send className="w-6 h-6 text-neutral-900" />,
    },
  ];

  return (
    <MarketingLayout
      title="How PreScan Works — The Pre-Publish Review Workflow"
      description="Learn how PreScan analyzes your video's audio and metadata in 4 simple steps to catch potential YouTube policy and advertiser suitability risks."
      currentRoute={ROUTES.HOW_IT_WORKS}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-16 sm:py-20 bg-linear-to-b from-neutral-50/80 via-white to-white border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>Workflow Walkthrough</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            How PreScan Works
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            A seamless pre-publish quality assurance step that turns hours of manual checking into a 2-minute automated report.
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

      {/* 4 Steps Detailed Walkthrough */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-16">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex flex-col md:flex-row items-start gap-8 p-6 sm:p-8 rounded-2xl bg-neutral-50/70 border border-neutral-200/90 shadow-2xs text-left"
            >
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {step.num}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center">
                  {step.icon}
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Step {step.num}
                  </span>
                  <h3 className="text-xl font-bold text-neutral-900">
                    {step.title}
                  </h3>
                  <p className="text-xs font-semibold text-neutral-700 mt-0.5">
                    {step.subtitle}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {step.details}
                </p>

                <div className="pt-2">
                  <ul className="space-y-2">
                    {step.points.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Timeline Visual */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 text-center">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Visualizing the Output
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              See how approximate timestamps connect directly to actionable findings.
            </p>
          </div>

          <TimelineVisualPreview />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ComparisonSection />
        </div>
      </section>

      {/* FAQ on How it Works */}
      <section className="py-16 sm:py-24 bg-neutral-50/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
              <span>Process FAQ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Workflow Questions
            </h2>
          </div>

          <FaqAccordion items={MARKETING_FAQS.slice(0, 5)} />

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
