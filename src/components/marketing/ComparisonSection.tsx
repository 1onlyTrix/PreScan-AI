import React from 'react';
import { MessageSquareOff, Workflow, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const ComparisonSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 mb-3">
          <span>Workflow Differentiation</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          Not another chatbot.
        </h2>
        <p className="text-sm sm:text-base text-neutral-600 mt-2">
          PreScan is built around a structured creator review workflow, not an open-ended conversational prompt.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Generic AI Chat Box */}
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-200 text-neutral-600 flex items-center justify-center">
                <MessageSquareOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Generic AI / Chatbots
                </h3>
                <p className="text-xs text-neutral-500">
                  Open-ended conversational prompts
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-neutral-600">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <span>You have to paste or prompt with unstructured text transcripts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <span>Returns walls of text that you have to manually interpret.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <span>Lacks precise media timestamps to locate issues in your timeline.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <span>Prone to hallucinating policy rules or generating arbitrary advice.</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-neutral-200/50 rounded-xl text-[11px] text-neutral-500 font-mono">
            Prompt → Raw Text Response → Manual Guesswork
          </div>
        </div>

        {/* PreScan Structured Workflow Box */}
        <div className="rounded-2xl border border-neutral-900 bg-white p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-md ring-1 ring-neutral-900/10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                <Workflow className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  PreScan Review Layer
                </h3>
                <p className="text-xs text-neutral-500">
                  Automated, timestamped creator QA
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-neutral-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Direct audio extraction and metadata evaluation pipeline.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Surfaces structured findings across 4 distinct compliance dimensions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Maps issues directly to video timestamps (e.g. ~04:21, ~07:48).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Provides clear rationale, severity rating, and suggested editor action.</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-neutral-100 rounded-xl text-[11px] text-neutral-800 font-semibold flex items-center justify-between">
            <span>Add Media → Analyze → Timestamped Findings → Publish</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
