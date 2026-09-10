import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Check,
  Zap,
  Sparkles,
  Shield,
  Clock,
  Users,
  Film,
  ArrowRight,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { BillingService } from '../../services/billing.service';
import { BillingSummary, Plan, PlanKey } from '../../types/billing';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  targetFeature?: string;
  triggerReason?: string;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  title = 'Upgrade Workspace Plan',
  description = 'Expand your pre-upload scanning capacity, analyze longer videos, and collaborate with your team.',
  targetFeature,
  triggerReason,
  onSuccess,
}) => {
  const { organization, membership } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>('PRO');

  const canManageBilling = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  const displayReason = triggerReason || targetFeature;

  useEffect(() => {
    if (!isOpen || !organization?.id) return;
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [sum, plns] = await Promise.all([
          BillingService.getBillingSummary(organization.id),
          BillingService.getPlans(),
        ]);
        if (isMounted) {
          setSummary(sum);
          setPlans(plns);
          // Set default selected to next tier
          if (sum.plan.key === 'FREE') {
            setSelectedPlanKey('PRO');
          } else if (sum.plan.key === 'PRO') {
            setSelectedPlanKey('BUSINESS');
          } else {
            setSelectedPlanKey('BUSINESS');
          }
        }
      } catch (err) {
        console.error('Failed to load billing info:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen, organization?.id]);

  const handleCheckout = async () => {
    if (!organization?.id || !canManageBilling) return;

    if (selectedPlanKey === 'FREE') {
      setIsCheckoutLoading(true);
      try {
        await BillingService.upgradePlan(organization.id, 'FREE');
        showToast({
          type: 'success',
          title: 'Plan Updated',
          message: 'Workspace has been switched to Free plan.',
        });
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Downgrade Failed',
          message: err?.message || 'Could not switch plan.',
        });
      } finally {
        setIsCheckoutLoading(false);
      }
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const checkoutRes = await BillingService.createCheckoutSession(organization.id, selectedPlanKey as 'PRO' | 'BUSINESS');

      if (checkoutRes.mode === 'stripe' && checkoutRes.url) {
        // Redirect user to Stripe hosted checkout page
        window.location.href = checkoutRes.url;
      } else {
        // Simulated checkout (development mode without live Stripe credentials)
        await BillingService.simulateCheckout(organization.id, selectedPlanKey as 'PRO' | 'BUSINESS');
        showToast({
          type: 'success',
          title: 'Checkout Complete',
          message: `Workspace upgraded to ${selectedPlanKey} plan successfully.`,
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Checkout Failed',
        message: err?.message || 'Could not initiate checkout session.',
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const modalFooter = (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <div className="text-xs text-neutral-500 text-center sm:text-left flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span>Secure checkout with Stripe. Cancel or change plans anytime.</span>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <Button variant="outline" size="md" onClick={onClose} disabled={isCheckoutLoading}>
          Cancel
        </Button>
        {canManageBilling && (
          <Button
            variant="primary"
            size="md"
            onClick={handleCheckout}
            isLoading={isCheckoutLoading}
            disabled={isLoading || summary?.plan.key === selectedPlanKey}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {selectedPlanKey === 'FREE' ? 'Switch to Free' : `Continue to Checkout (${selectedPlanKey})`}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="xl"
      footer={modalFooter}
    >
      <div className="space-y-6">
        {displayReason && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-xs text-amber-900 font-medium">
              Triggered by quota limit: <strong>{displayReason}</strong>. Upgrade below to remove this limitation.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-900" />
            <span className="text-xs font-medium">Loading workspace subscription details...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Tier Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrent = summary?.plan.key === plan.key;
                const isSelected = selectedPlanKey === plan.key;

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!isCurrent) setSelectedPlanKey(plan.key);
                    }}
                    className={`relative rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-neutral-900 ring-2 ring-neutral-900/10 bg-white shadow-md'
                        : isCurrent
                        ? 'border-neutral-200 bg-neutral-50 opacity-90'
                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 right-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-neutral-900 text-white shadow-xs">
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-base font-bold text-neutral-900">{plan.name}</h4>
                        {isCurrent && (
                          <Badge variant="neutral" size="sm">
                            Current
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-black text-neutral-900">
                          ${plan.monthlyPrice}
                        </span>
                        <span className="text-xs text-neutral-500 font-medium">/ month</span>
                      </div>

                      <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
                        {plan.description}
                      </p>

                      <div className="pt-3 border-t border-neutral-100 space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-neutral-700">
                          <Film className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span><strong>{plan.scanLimit}</strong> Scans / month</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-700">
                          <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>Max <strong>{Math.round(plan.maxVideoDurationSeconds / 60)} min</strong> video</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-700">
                          <Users className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span>Up to <strong>{plan.maxMembers}</strong> team seats</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      {isCurrent ? (
                        <div className="w-full py-1.5 text-center text-xs font-semibold text-neutral-500 bg-neutral-100 rounded-lg">
                          Active Plan
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`w-full py-2 text-xs font-bold rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-neutral-900 text-white'
                              : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                          }`}
                        >
                          {isSelected ? 'Selected' : `Select ${plan.name}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Permission Note */}
            {!canManageBilling && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                You have <strong>Member</strong> permissions in this workspace. Only Workspace Owners or Admins can upgrade the workspace plan.
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};
