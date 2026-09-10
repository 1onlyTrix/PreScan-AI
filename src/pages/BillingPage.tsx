import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  CreditCard,
  Layers,
  ArrowRight,
  Clock,
  Users,
  Film,
  AlertCircle,
  FileText,
  Activity,
  History,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ExternalLink,
  Download,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { BillingService } from '../services/billing.service';
import { BillingSummary, UsageRecord, UsageEvent, Plan, PlanKey, Invoice } from '../types/billing';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { UpgradeModal } from '../components/billing/UpgradeModal';

interface BillingPageProps {
  onNavigate: (route: string) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigate }) => {
  const { organization, membership } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isUpgradingKey, setIsUpgradingKey] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const canManageBilling = membership?.role === 'OWNER' || membership?.role === 'ADMIN';

  const loadBillingData = async (showLoadingSpinner = true) => {
    if (!organization?.id) return;
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [sum, plns, history, invs] = await Promise.all([
        BillingService.getBillingSummary(organization.id),
        BillingService.getPlans(),
        BillingService.getUsageHistory(organization.id).catch(() => ({ usageRecords: [], events: [] })),
        BillingService.getInvoices(organization.id).catch(() => []),
      ]);
      setSummary(sum);
      setPlans(plns);
      setUsageRecords(history.usageRecords || []);
      setEvents(history.events || []);
      setInvoices(invs);
    } catch (err: any) {
      console.error('Failed to load billing data:', err);
      showToast({
        type: 'error',
        title: 'Billing Error',
        message: err?.message || 'Failed to load workspace billing data.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBillingData();

    // Check URL parameters for Stripe Checkout returns
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const upgradedPlan = urlParams.get('plan');

    if (checkoutStatus === 'success') {
      showToast({
        type: 'success',
        title: 'Checkout Successful!',
        message: `Your workspace subscription ${upgradedPlan ? `(${upgradedPlan})` : ''} is now active. Quotas and limits have been updated.`,
      });
      // Clean up URL query parameters without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (checkoutStatus === 'canceled') {
      showToast({
        type: 'info',
        title: 'Checkout Cancelled',
        message: 'No changes were made to your subscription.',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [organization?.id]);

  const handleCheckoutOrUpgrade = async (planKey: PlanKey) => {
    if (!organization?.id || !canManageBilling) return;
    setIsUpgradingKey(planKey);

    try {
      if (planKey === 'FREE') {
        await BillingService.upgradePlan(organization.id, 'FREE');
        showToast({
          type: 'success',
          title: 'Plan Updated',
          message: 'Workspace successfully reverted to Free tier.',
        });
        await loadBillingData(false);
        return;
      }

      // Initiate Stripe Checkout session
      const session = await BillingService.createCheckoutSession(organization.id, planKey as 'PRO' | 'BUSINESS');

      if (session.mode === 'stripe' && session.url) {
        window.location.href = session.url;
      } else {
        // Simulated checkout for preview/development mode
        await BillingService.simulateCheckout(organization.id, planKey as 'PRO' | 'BUSINESS');
        showToast({
          type: 'success',
          title: 'Plan Upgraded',
          message: `Workspace successfully upgraded to ${planKey} plan (Simulated).`,
        });
        await loadBillingData(false);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Checkout Error',
        message: err?.message || 'Could not initiate checkout.',
      });
    } finally {
      setIsUpgradingKey(null);
    }
  };

  const handleOpenStripePortal = async () => {
    if (!organization?.id || !canManageBilling) return;
    setIsPortalLoading(true);

    try {
      const portal = await BillingService.createCustomerPortalSession(organization.id);
      if (portal.url) {
        window.location.href = portal.url;
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Stripe Portal Error',
        message: err?.message || 'Could not open Stripe customer portal.',
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!organization?.id || !canManageBilling) return;
    setIsCanceling(true);

    try {
      await BillingService.cancelSubscription(organization.id, false);
      showToast({
        type: 'success',
        title: 'Subscription Scheduled for Cancellation',
        message: 'Your plan will remain active until the end of the current billing cycle.',
      });
      setShowCancelModal(false);
      await loadBillingData(false);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err?.message || 'Could not cancel subscription.',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const isPaidPlan = summary?.plan.key === 'PRO' || summary?.plan.key === 'BUSINESS';

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      <PageHeader
        title="Subscription & Billing"
        description="Manage workspace plans, Stripe subscription checkout, automated invoicing, and pre-upload quota metering."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate('/app/dashboard') },
              { label: 'Billing & Plans' },
            ]}
          />
        }
      />

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-500 bg-white rounded-2xl border border-neutral-200 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
          <p className="text-sm font-medium text-neutral-600">Retrieving workspace subscription & usage metrics...</p>
        </div>
      ) : (
        <>
          {/* Active Workspace Subscription Overview Card */}
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h2 className="text-xl font-bold text-neutral-900">
                    {summary?.plan.name} Plan
                  </h2>
                  <Badge
                    variant={summary?.subscription.status === 'ACTIVE' ? 'neutral' : 'warning'}
                    size="sm"
                    className="font-semibold"
                  >
                    {summary?.subscription.status === 'ACTIVE'
                      ? 'Active Subscription'
                      : summary?.subscription.status === 'PAST_DUE'
                      ? 'Payment Past Due'
                      : summary?.subscription.status === 'CANCELED'
                      ? 'Canceled'
                      : summary?.subscription.status}
                  </Badge>
                  {summary?.subscription.cancelAtPeriodEnd && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                      Cancels on {formatDate(summary.subscription.currentPeriodEnd)}
                    </span>
                  )}
                  {summary?.plan.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-neutral-900 text-white">
                      {summary.plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
                  {summary?.plan.description}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadBillingData(false)}
                  disabled={isRefreshing}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
                >
                  Sync
                </Button>

                {canManageBilling && isPaidPlan && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenStripePortal}
                    isLoading={isPortalLoading}
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                    rightIcon={<ExternalLink className="w-3 h-3" />}
                  >
                    Stripe Customer Portal
                  </Button>
                )}

                {canManageBilling && summary?.plan.key !== 'BUSINESS' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-1">
                  <Film className="w-4 h-4 text-neutral-600" />
                  <span>Monthly Scans</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-neutral-900">
                    {summary?.usage.scansUsed ?? 0}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    / {summary?.usage.scanLimit ?? 5}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 block mt-1">
                  {summary?.usage.remainingScans} scans remaining
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-1">
                  <Clock className="w-4 h-4 text-neutral-600" />
                  <span>Video Duration Cap</span>
                </div>
                <div className="text-2xl font-black text-neutral-900">
                  {summary?.limits.maxVideoDurationMinutes} min
                </div>
                <span className="text-[11px] text-neutral-500 block mt-1">
                  Max length per scanned video
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-1">
                  <Users className="w-4 h-4 text-neutral-600" />
                  <span>Team Seats</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-neutral-900">
                    {summary?.team.currentCount ?? 1}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    / {summary?.team.maxMembers ?? 3}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 block mt-1">
                  {summary?.team.canAddMember ? 'Seats available' : 'Seat limit reached'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-1">
                  <Activity className="w-4 h-4 text-neutral-600" />
                  <span>Cycle Reset</span>
                </div>
                <div className="text-2xl font-black text-neutral-900">
                  {summary?.usage.daysRemaining} days
                </div>
                <span className="text-[11px] text-neutral-500 block mt-1">
                  Resets {formatDate(summary?.usage.periodEnd)}
                </span>
              </div>
            </div>

            {/* Scan Meter Progress Bar */}
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-neutral-700">Billing Cycle Scan Consumption</span>
                <span className="text-neutral-900">{summary?.usage.usagePercentage}% utilized</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (summary?.usage.usagePercentage ?? 0) >= 100
                      ? 'bg-rose-500'
                      : (summary?.usage.usagePercentage ?? 0) >= 80
                      ? 'bg-amber-500'
                      : 'bg-neutral-900'
                  }`}
                  style={{ width: `${Math.min(100, summary?.usage.usagePercentage ?? 0)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2">
                <span>Period started: {formatDate(summary?.usage.periodStart)}</span>
                <span>Next quota rollover: {formatDate(summary?.usage.periodEnd)}</span>
              </div>
            </div>

            {/* Subscription Actions (Cancel / Downgrade for Paid Plans) */}
            {canManageBilling && isPaidPlan && !summary?.subscription.cancelAtPeriodEnd && (
              <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span>Need to adjust or cancel your active subscription?</span>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="text-rose-600 hover:text-rose-700 font-semibold hover:underline"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>

          {/* Plan Tiers Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Available Workspace Plans
                </h3>
                <p className="text-xs text-neutral-500">
                  Select a tier tailored to your publishing cadence and production volume.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrent = summary?.plan.key === plan.key;
                const isUpgrading = isUpgradingKey === plan.key;

                return (
                  <Card
                    key={plan.id}
                    className={`flex flex-col justify-between relative transition-all ${
                      plan.isPopular
                        ? 'border-neutral-900 ring-2 ring-neutral-900 shadow-md bg-white'
                        : isCurrent
                        ? 'border-neutral-300 bg-neutral-50/50'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-xs">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-bold text-neutral-900">
                            {plan.name}
                          </CardTitle>
                          {isCurrent && (
                            <Badge variant="neutral" size="sm">
                              Current Plan
                            </Badge>
                          )}
                        </div>

                        <CardDescription className="text-xs text-neutral-500 min-h-[36px] mt-1">
                          {plan.description}
                        </CardDescription>

                        <div className="mt-4 pt-4 border-t border-neutral-100 flex items-baseline gap-1">
                          <span className="text-3xl font-black text-neutral-900">
                            ${plan.monthlyPrice}
                          </span>
                          <span className="text-xs text-neutral-500 font-medium">/ month</span>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                          <div className="flex items-center justify-between text-xs text-neutral-700">
                            <span className="flex items-center gap-1.5">
                              <Film className="w-3.5 h-3.5 text-neutral-500" /> Scans:
                            </span>
                            <span className="font-bold text-neutral-900">{plan.scanLimit} / month</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-neutral-700">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" /> Max Length:
                            </span>
                            <span className="font-bold text-neutral-900">{Math.round(plan.maxVideoDurationSeconds / 60)} min</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-neutral-700">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-neutral-500" /> Team Seats:
                            </span>
                            <span className="font-bold text-neutral-900">{plan.maxMembers} members</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
                            Features Included:
                          </span>
                          <ul className="space-y-2">
                            {plan.features.map((feat, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-neutral-700">
                                <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </div>

                    <CardFooter className="pt-6 border-t border-neutral-100">
                      {isCurrent ? (
                        <Button variant="outline" size="md" className="w-full" disabled>
                          Current Active Plan
                        </Button>
                      ) : canManageBilling ? (
                        <Button
                          variant={plan.isPopular ? 'primary' : 'outline'}
                          size="md"
                          className="w-full"
                          isLoading={isUpgrading}
                          onClick={() => handleCheckoutOrUpgrade(plan.key)}
                        >
                          {plan.monthlyPrice === 0 ? 'Switch to Free' : `Upgrade to ${plan.name}`}
                        </Button>
                      ) : (
                        <Button variant="outline" size="md" className="w-full" disabled>
                          Admin Upgrade Only
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Invoices & Billing History */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Invoices & Payment History
                </h3>
              </div>
              {canManageBilling && isPaidPlan && (
                <button
                  type="button"
                  onClick={handleOpenStripePortal}
                  className="text-xs text-neutral-700 hover:text-neutral-900 font-semibold flex items-center gap-1"
                >
                  Manage on Stripe <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-xl">
                No Stripe payment invoices generated yet. Invoices appear automatically after upgrading to Pro or Business.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Receipt / PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-neutral-50/50">
                        <td className="py-3 px-3 font-mono font-medium text-neutral-900">
                          {inv.number || inv.stripeInvoiceId.slice(0, 14)}
                        </td>
                        <td className="py-3 px-3 text-neutral-600">
                          {formatDate(inv.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-900">
                          ${(inv.amountPaid / 100).toFixed(2)} {inv.currency}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'open'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {inv.hostedInvoiceUrl || inv.invoicePdf ? (
                            <a
                              href={inv.hostedInvoiceUrl || inv.invoicePdf}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              View
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Usage History & Event Audit Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Historical Billing Periods */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Billing Period History
                </h3>
              </div>

              {usageRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No previous closed billing cycles recorded for this workspace.
                </div>
              ) : (
                <div className="space-y-3">
                  {usageRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-neutral-900 block">
                          {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          Completed Billing Cycle
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-neutral-900 block">
                          {record.scansUsed} Scans
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Recorded
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Metered Usage Events */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Recent Metered Usage Events
                </h3>
              </div>

              {events.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No scan usage events recorded in the current period.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {events.slice(0, 10).map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-lg border border-neutral-100 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <span className="font-medium text-neutral-900 block">
                            Scan Quota Metered
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Scan ID: {evt.scanId.slice(0, 14)}...
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-neutral-900 block">
                          - {evt.units} Scan
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {formatDateTime(evt.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-neutral-900">Cancel Subscription?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed mb-6">
              Your plan will remain active with full quotas until the end of your current cycle on{' '}
              <strong>{formatDate(summary?.subscription.currentPeriodEnd)}</strong>. After that date, your workspace will automatically revert to the Free tier.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={isCanceling}
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelSubscription}
                isLoading={isCanceling}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => loadBillingData(false)}
      />
    </div>
  );
};
