import React from 'react';
import {
  ShieldAlert,
  DollarSign,
  Copyright,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export const ReportHeroPreview: React.FC = () => {
  return (
    <div className="relative rounded-2xl border border-neutral-200/90 bg-white shadow-2xl overflow-hidden text-left transition-all">
      {/* Mock Window Topbar */}
      <div className="bg-neutral-100/90 border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neutral-300"></div>
          <div className="w-3 h-3 rounded-full bg-neutral-300"></div>
          <div className="w-3 h-3 rounded-full bg-neutral-300"></div>
          <span className="text-xs font-mono text-neutral-500 ml-2 hidden sm:inline">
            app.prescan.io/reports/rep_89x204
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-200/80 text-neutral-700">
            <Sparkles className="w-3 h-3 text-neutral-600" />
            Illustrative Example Report
          </span>
        </div>
      </div>

      {/* Main Report Container */}
      <div className="p-5 sm:p-7 space-y-6 bg-neutral-50/50">
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium mb-1">
              <span>Project: Tech Deep Dive</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> 12m 42s audio scanned
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
              "How Next-Gen AI Really Works (Episode_42_Final.mp4)"
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Overall Risk
                </div>
                <div className="text-xs font-bold text-amber-800">
                  Review Recommended
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Dimension Category Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Community Guidelines */}
          <div className="p-3.5 rounded-xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-600 truncate">
                Community Guidelines
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Low Risk
              </span>
              <span className="text-[10px] text-neutral-400">0 items</span>
            </div>
          </div>

          {/* Advertiser Suitability */}
          <div className="p-3.5 rounded-xl bg-white border border-amber-300 shadow-xs ring-1 ring-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-900 truncate">
                Advertiser Suitability
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Review Required
              </span>
              <span className="text-[10px] font-semibold text-amber-700">1 finding</span>
            </div>
          </div>

          {/* Copyright References */}
          <div className="p-3.5 rounded-xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-600 truncate">
                Copyright References
              </span>
              <Info className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                Manual Review
              </span>
              <span className="text-[10px] font-semibold text-neutral-500">1 reference</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="p-3.5 rounded-xl bg-white border border-neutral-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-600 truncate">
                Metadata Integrity
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Review Note
              </span>
              <span className="text-[10px] text-neutral-500">1 finding</span>
            </div>
          </div>
        </div>

        {/* Highlighted Findings Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
              <span>3 Findings Worth Creator Review</span>
              <span className="text-[10px] font-normal text-neutral-400">
                (Click to inspect timestamp)
              </span>
            </h4>
            <span className="text-[11px] text-neutral-500 font-mono">12:42 timeline</span>
          </div>

          <div className="space-y-2.5">
            {/* Finding 1 */}
            <div className="p-3.5 rounded-xl bg-white border border-amber-200/90 hover:border-amber-400 transition-colors shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-neutral-900 text-white">
                    ~04:21
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    Strong language detected
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 self-start sm:self-auto">
                  Advertiser Suitability • Medium
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed pl-1">
                "Repeated profanity detected in rapid succession between 04:21 and 04:38. Consider muting or bleeping if aiming for broad ad suitability."
              </p>
            </div>

            {/* Finding 2 */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 transition-colors shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-300">
                    ~07:48
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    Third-party material referenced
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 self-start sm:self-auto">
                  Copyright References • Low
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed pl-1">
                "Speaker verbally references a commercial pop track title. Verify whether audio sample is actually present in final mix. Rights determination requires human review."
              </p>
            </div>

            {/* Finding 3 */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 transition-colors shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-300">
                    ~09:16
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    Title may overstate content
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 self-start sm:self-auto">
                  Metadata • Medium
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed pl-1">
                "The title suggests an official partnership release while dialogue frames this as speculative research. Consider clarifying title phrasing."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
