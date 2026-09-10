import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  Info,
  Layers,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { FaqAccordion } from '../components/marketing/FaqAccordion';
import { FOUNDATION_PLANS, MARKETING_FAQS } from '../config/constants';
import { formatCentsToCurrency } from '../utils/formatters';
import { ROUTES } from '../router/routes';

interface PublicPricingPageProps {
  onNavigate: (route: string) => void;
}

export const PublicPricingPage: React.FC<PublicPricingPageProps> = ({ onNavigate }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const comparisonFeatures = [
    {
      feature: 'Monthly Pre-Scans Included',
      free: '5 scans / mo',
      pro: '100 scans / mo',
      business: '500 scans / mo',
    },
    {
      feature: 'Maximum Video Duration',
      free: 'Up to 10 min',
      pro: 'Up to 60 min (1 hr)',
      business: 'Up to 180 min (3 hrs)',
    },
    {
      feature: 'Community Guidelines Analysis',
      free: true,
      pro: true,
      business: true,
    },
    {
      feature: 'Advertiser Suitability Analysis',
      free: true,
      pro: true,
      business: true,
    },
    {
      feature: 'Verbal Copyright Reference Signals',
      free: true,
      pro: true,
      business: true,
    },
    {
      feature: 'Metadata & Title Alignment Check',
      free: true,
      pro: true,
      business: true,
    },
    {
      feature: 'Timestamped Evidence Quotes',
      free: true,
      pro: true,
      business: true,
    },
    {
      feature: 'Workspace Seats Included',
      free: '3 Team Seats',
      pro: '10 Team Seats',
      business: '25 Team Seats',
    },
    {
      feature: 'Role-Based Access Control (RBAC)',
      free: true,
      pro: true,
      business: true,
    },
    {
      feature: 'Priority Processing Queue',
      free: 'Standard',
      pro: 'High Priority',
      business: 'Dedicated Priority',
    },
  ];

  return (
    <MarketingLayout
      title="Transparent Pricing & Capacity Plans | PreScan"
      description="Compare PreScan plans for solo YouTube creators, editors, and production teams. 3 free scans every month with no credit card required."
      currentRoute={ROUTES.PRICING}
      onNavigate={onNavigate}
    >
      {/* Header */}
      <section className="py-16 sm:py-20 bg-linear-to-b from-neutral-50/80 via-white to-white border-b border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
            <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
            <span>Configurable Capacity Plans</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            Predictable plans for every publishing cadence
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto leading-relaxed">
            Scan your videos before you publish. No hidden fees or arbitrary AI tokens.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <div className="bg-neutral-100 p-1 rounded-xl border border-neutral-200 inline-flex items-center">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Monthly billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>Annual billing</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pricing Cards Grid */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FOUNDATION_PLANS.map((plan) => {
              const isAnnual = billingCycle === 'annual';
              const priceCents = isAnnual
                ? Math.round(plan.annualPriceCents / 12)
                : plan.monthlyPriceCents;

              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col justify-between relative transition-all ${
                    plan.isPopular
                      ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-lg bg-white -translate-y-1'
                      : 'border-neutral-200 bg-white shadow-2xs hover:border-neutral-300'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-sm">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-bold text-neutral-900">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-neutral-500 min-h-[36px]">
                        {plan.description}
                      </CardDescription>

                      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-neutral-900">
                          {formatCentsToCurrency(priceCents)}
                        </span>
                        <span className="text-xs text-neutral-500">/ mo</span>
                      </div>
                      {isAnnual && plan.monthlyPriceCents > 0 && (
                        <span className="text-[10px] text-neutral-400 block mt-0.5">
                          Billed annually ({formatCentsToCurrency(plan.annualPriceCents)}/yr)
                        </span>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Included Features
                      </div>
                      <ul className="space-y-2.5 text-xs text-neutral-700">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>

                  <CardFooter className="pt-6">
                    <Button
                      variant={plan.isPopular ? 'primary' : 'outline'}
                      size="md"
                      className="w-full justify-center"
                      onClick={() => onNavigate(ROUTES.SIGNUP)}
                    >
                      {plan.monthlyPriceCents === 0 ? 'Start scanning free' : `Choose ${plan.name}`}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* Pricing Notice */}
          <div className="mt-8 p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-center text-xs text-neutral-500 max-w-2xl mx-auto flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              <strong>Predictable Capacity:</strong> Monthly quotas reset each billing cycle. Seamless workspace seat allocation and RBAC included on all plans.
            </span>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="py-16 sm:py-24 border-b border-neutral-200/80 bg-neutral-50/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Detailed Plan Comparison
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Compare scan quotas, video duration allowances, and collaborative tools.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-900 font-bold">
                <tr>
                  <th className="p-4 sm:w-2/5">Capability</th>
                  <th className="p-4 text-center">Free ($0/mo)</th>
                  <th className="p-4 text-center bg-neutral-200/40">Pro ($19/mo)</th>
                  <th className="p-4 text-center">Business ($49/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {comparisonFeatures.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-4 font-medium text-neutral-900">{row.feature}</td>
                    <td className="p-4 text-center">
                      {typeof row.free === 'boolean' ? (
                        row.free ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300">—</span>
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="p-4 text-center bg-neutral-50/40 font-medium">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300">—</span>
                      ) : (
                        row.pro
                      )}
                    </td>
                    <td className="p-4 text-center font-medium">
                      {typeof row.business === 'boolean' ? (
                        row.business ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-neutral-300">—</span>
                      ) : (
                        row.business
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing FAQ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
              <span>Billing FAQ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Frequently Asked Pricing Questions
            </h2>
          </div>

          <FaqAccordion items={MARKETING_FAQS} />
        </div>
      </section>
    </MarketingLayout>
  );
};
