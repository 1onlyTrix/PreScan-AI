import React, { useState } from 'react';
import { DollarSign, Copyright, FileText, AlertTriangle, Info, CheckCircle2, Sparkles, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const FindingCardPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'f1' | 'f2' | 'f3'>('f1');

  return (
    <div className="space-y-6">
      {/* Category selector tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setActiveTab('f1')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'f1'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>F1: Advertiser Suitability</span>
        </button>
        <button
          onClick={() => setActiveTab('f2')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'f2'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Copyright className="w-3.5 h-3.5" />
          <span>F2: Copyright References</span>
        </button>
        <button
          onClick={() => setActiveTab('f3')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'f3'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>F3: Metadata Consistency</span>
        </button>
      </div>

      {/* Selected Finding Display */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs text-left transition-all">
        {activeTab === 'f1' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs">
                  F1
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    ADVERTISER SUITABILITY
                  </span>
                  <h4 className="text-base font-bold text-neutral-900">
                    Strong language detected
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-neutral-100 text-neutral-800">
                  ~04:21–04:38
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  MEDIUM SEVERITY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Detected Evidence
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed font-mono">
                  "Repeated strong profanity was detected in this 17-second section of dialogue."
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Why It Matters
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                  Repeated high-density profanity early or throughout a video may affect advertiser suitability and trigger limited ad serving.
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Suggested Action
                </h5>
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs text-neutral-900 font-medium leading-relaxed">
                  Review this section in your editor and consider muting or censoring the language if broad monetization is a priority.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'f2' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 font-bold text-xs">
                  F2
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    COPYRIGHT RIGHTS
                  </span>
                  <h4 className="text-base font-bold text-neutral-900">
                    Third-party material referenced
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-neutral-100 text-neutral-800">
                  ~07:48
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                  LOW SEVERITY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Detected Evidence
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed font-mono">
                  "The speaker verbally references a commercially released song and artist."
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Why It Matters
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                  PreScan flags verbal mentions so creators verify whether underlying media cues actually appear in the audio track.
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                  Suggested Action
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 font-medium leading-relaxed">
                  Confirm whether third-party material is actually used and review applicable rights or licenses.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-100/80 border border-neutral-200 text-xs text-neutral-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>
                <strong>Policy Note:</strong> PreScan does not perform Content ID matching or determine legal infringement. Rights determination requires human review.
              </span>
            </div>
          </div>
        )}

        {activeTab === 'f3' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs">
                  F3
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    METADATA INTEGRITY
                  </span>
                  <h4 className="text-base font-bold text-neutral-900">
                    Title may overstate content
                  </h4>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-neutral-100 text-neutral-800">
                  Metadata Scan
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  MEDIUM SEVERITY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Detected Evidence
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed font-mono">
                  "The title suggests definitive confirmation of X while the audio primarily discusses speculative commentary on Y."
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Why It Matters
                </h5>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed">
                  Misleading or overstated titles can elevate viewer drop-off, negative sentiment, and deceptive metadata flags.
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Suggested Action
                </h5>
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs text-neutral-900 font-medium leading-relaxed">
                  Consider revising the title phrasing so it accurately reflects the nuance and scope of the video discussion.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Illustrative example findings • For demonstration purposes only</span>
          <span>PreScan heuristics are conservative by design</span>
        </div>
      </div>
    </div>
  );
};
