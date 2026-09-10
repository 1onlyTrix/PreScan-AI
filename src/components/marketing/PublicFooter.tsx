import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { ROUTES } from '../../router/routes';
import { APP_INFO } from '../../config/constants';

interface PublicFooterProps {
  onNavigate: (route: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-neutral-600 text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => onNavigate(ROUTES.HOME)}
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-bold text-base tracking-tight text-neutral-900">
                Pre<span className="text-neutral-500">Scan</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
              {APP_INFO.tagline}
            </p>
            <p className="text-[11px] text-neutral-400 max-w-xs leading-normal">
              AI-assisted pre-upload quality assurance for video dialogue and metadata. Not affiliated with or endorsed by YouTube.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.FEATURES)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.HOW_IT_WORKS)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  How it works
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.PRICING)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Company
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.ABOUT)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.CONTACT)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Resources & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.SECURITY)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Security
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.HOW_IT_WORKS)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  FAQ & Workflow
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.DASHBOARD)}
                  className="hover:text-neutral-900 transition-colors inline-flex items-center gap-1 text-neutral-700 font-medium"
                >
                  App Shell <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Legal & Account
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.PRIVACY)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.TERMS)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.LOGIN)}
                  className="hover:text-neutral-900 transition-colors"
                >
                  Log in
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate(ROUTES.SIGNUP)}
                  className="hover:text-neutral-900 transition-colors font-semibold text-neutral-900"
                >
                  Sign up
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>{APP_INFO.copyright}</p>
          <p className="text-[11px] text-neutral-400 text-center sm:text-right">
            PreScan provides assistive pre-publish evaluations. Rights determination and policy enforcement require human review.
          </p>
        </div>
      </div>
    </footer>
  );
};
