import React from 'react';
import { ShieldCheck, Scale, CheckSquare, EyeOff, Radio, AlertCircle } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const principles = [
    {
      icon: <Scale className="w-4 h-4 text-neutral-900" />,
      title: 'Accuracy over finding volume',
      description: 'We prioritize precision over generating dozens of frivolous warnings. A clean, actionable list saves you editing time.',
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-neutral-900" />,
      title: 'Context matters',
      description: 'Heuristics take topical context into account. Passionate gaming reactions or historical discussions are not automatically marked as violations.',
    },
    {
      icon: <CheckSquare className="w-4 h-4 text-neutral-900" />,
      title: 'Zero findings is valid',
      description: 'When your content has no flagged risks, PreScan confirms a clean pass rather than manufacturing synthetic issues.',
    },
    {
      icon: <AlertCircle className="w-4 h-4 text-neutral-900" />,
      title: 'Confidence ≠ Enforcement',
      description: 'An AI confidence score indicates model signal strength, not a guarantee of YouTube’s internal policy enforcement or monetization decisions.',
    },
    {
      icon: <Radio className="w-4 h-4 text-neutral-900" />,
      title: 'Copyright analysis is limited',
      description: 'PreScan identifies spoken references to third-party media. It does not perform Content ID waveform matching or determine legal infringement.',
    },
    {
      icon: <EyeOff className="w-4 h-4 text-neutral-900" />,
      title: 'Visual content not analyzed',
      description: 'Our analysis is strictly focused on audio dialogue and metadata. Visual frames are not evaluated, ensuring transparency in our scope.',
    },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-10 text-left">
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-200/70 text-neutral-800 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
          <span>Core Philosophy</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Designed to be conservative.
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
          PreScan is built on engineering rigor and transparency. We believe creators deserve realistic signal detection rather than exaggerated AI claims.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {principles.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center">
              {item.icon}
            </div>
            <h3 className="text-xs font-bold text-neutral-900">{item.title}</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-neutral-100 border border-neutral-200/90 text-xs text-neutral-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span>
          <strong>Human Review Essential:</strong> PreScan provides assistive quality-assurance cues. You remain in complete editorial control of what you publish.
        </span>
        <span className="text-[11px] text-neutral-500 shrink-0">
          Independent Creator Tool
        </span>
      </div>
    </div>
  );
};
