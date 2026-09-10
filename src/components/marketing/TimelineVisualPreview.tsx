import React, { useState } from 'react';
import { Play, Pause, AlertTriangle, ShieldCheck, Info, CheckCircle2, Sparkles, Volume2 } from 'lucide-react';

interface TimelineMarker {
  id: string;
  timeStr: string;
  seconds: number;
  category: string;
  severity: 'Medium' | 'Low' | 'High';
  title: string;
  evidence: string;
  whyItMatters: string;
  suggestedAction: string;
  badgeColor: string;
}

const SAMPLE_MARKERS: TimelineMarker[] = [
  {
    id: 'f1',
    timeStr: '04:21',
    seconds: 261,
    category: 'ADVERTISER SUITABILITY',
    severity: 'Medium',
    title: 'Repeated strong language in short interval',
    evidence: '"...detected 3 instances of profanity within a 17-second window (04:21–04:38)..."',
    whyItMatters: 'Repeated high-frequency profanity can limit ad categories on certain platforms or result in yellow monetization icons.',
    suggestedAction: 'Review this section and consider muting or bleeping the language if broad advertiser suitability is desired.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    id: 'f2',
    timeStr: '07:48',
    seconds: 468,
    category: 'COPYRIGHT RIGHTS',
    severity: 'Low',
    title: 'Third-party material referenced verbally',
    evidence: '"...speaker verbally mentions specific song title and commercial artist recording..."',
    whyItMatters: 'Verbal references do not trigger Content ID directly, but serve as a reminder to ensure any underlying audio track is licensed.',
    suggestedAction: 'Confirm whether third-party commercial audio is actually present in the final master and review applicable licenses. Rights determination requires human review.',
    badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300',
  },
  {
    id: 'f3',
    timeStr: '09:16',
    seconds: 556,
    category: 'METADATA INTEGRITY',
    severity: 'Medium',
    title: 'Title claims exceed content discussion',
    evidence: '"...video title indicates definitive policy change while discussion primarily reflects community speculation..."',
    whyItMatters: 'Significant mismatch between metadata expectations and actual audio topics can cause retention drops and viewer flag risks.',
    suggestedAction: 'Consider adjusting the video title or description to accurately frame the discussion context.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
];

export const TimelineVisualPreview: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('f1');
  const activeMarker = SAMPLE_MARKERS.find((m) => m.id === activeId) || SAMPLE_MARKERS[0];
  const totalSeconds = 762; // 12:42

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
            <span>Interactive Audio Timeline</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Know exactly where to look
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Don't re-listen to an entire 45-minute cut. PreScan maps potential risk points to precise audio timestamps.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto text-xs text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
          <Volume2 className="w-4 h-4 text-neutral-600" />
          <span>Audio Timeline: 12:42</span>
        </div>
      </div>

      {/* Interactive Timeline Bar */}
      <div className="relative my-8 pt-6 pb-4">
        {/* Timestamp labels */}
        <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-2">
          <span>00:00</span>
          <span>03:00</span>
          <span>06:00</span>
          <span>09:00</span>
          <span>12:42</span>
        </div>

        {/* The Track Container */}
        <div className="relative h-12 w-full bg-neutral-100 rounded-xl border border-neutral-200 flex items-center px-2 select-none overflow-hidden">
          {/* Simulated Waveform Bars */}
          <div className="absolute inset-0 flex items-center justify-between px-3 opacity-35 pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-neutral-700 rounded-full"
                style={{ height: `${20 + Math.sin(i * 0.4) * 20 + ((i % 5) * 8)}%` }}
              />
            ))}
          </div>

          {/* Marker Pills on the timeline */}
          {SAMPLE_MARKERS.map((m) => {
            const leftPercent = (m.seconds / totalSeconds) * 100;
            const isSelected = m.id === activeId;
            return (
              <button
                key={m.id}
                onClick={() => setActiveId(m.id)}
                style={{ left: `${leftPercent}%` }}
                className={`absolute -translate-x-1/2 z-10 flex flex-col items-center group transition-all ${
                  isSelected ? 'scale-110' : 'hover:scale-105 opacity-85 hover:opacity-100'
                }`}
                aria-label={`Jump to finding at ${m.timeStr}`}
              >
                <div
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold shadow-md transition-all ${
                    isSelected
                      ? 'bg-neutral-900 text-white ring-2 ring-neutral-900 ring-offset-2'
                      : 'bg-white text-neutral-800 border border-neutral-300'
                  }`}
                >
                  {m.timeStr}
                </div>
                <div
                  className={`w-2 h-2 rounded-full mt-1 ${
                    isSelected ? 'bg-amber-500 ring-4 ring-amber-200' : 'bg-neutral-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-neutral-400 text-center mt-3">
          Select a timestamp above to inspect the pre-scan finding details
        </p>
      </div>

      {/* Detailed Finding Inspection Box */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 sm:p-6 transition-all animate-in fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-neutral-900 text-white">
              ~{activeMarker.timeStr}
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {activeMarker.category}
              </span>
              <h4 className="text-sm font-bold text-neutral-900">
                {activeMarker.title}
              </h4>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border self-start sm:self-auto ${activeMarker.badgeColor}`}
          >
            {activeMarker.severity} Severity
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="space-y-1">
            <div className="font-bold text-neutral-700 uppercase tracking-wider text-[10px]">
              Audio / Metadata Evidence
            </div>
            <p className="text-neutral-600 bg-white p-2.5 rounded-lg border border-neutral-200 font-mono text-[11px] leading-relaxed">
              {activeMarker.evidence}
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-neutral-700 uppercase tracking-wider text-[10px]">
              Why It Matters
            </div>
            <p className="text-neutral-600 bg-white p-2.5 rounded-lg border border-neutral-200 leading-relaxed">
              {activeMarker.whyItMatters}
            </p>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-neutral-700 uppercase tracking-wider text-[10px]">
              Suggested Creator Action
            </div>
            <p className="text-neutral-800 font-medium bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/80 leading-relaxed">
              {activeMarker.suggestedAction}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Illustrative example findings • Not real user media</span>
          <span>Rights determination requires human review</span>
        </div>
      </div>
    </div>
  );
};
