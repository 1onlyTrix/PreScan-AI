import { apiFetch } from '../lib/api';
import { Plan, BillingSummary, UsageRecord, UsageEvent, PlanKey, Invoice, StripeConfig } from '../types/billing';

export class BillingService {
  /**
   * Fetch all available plan tiers
   */
  static async getPlans(): Promise<Plan[]> {
    const res = await apiFetch('/api/billing/plans');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load plans.');
    }
    const data = await res.json();
    return data.plans || [];
  }

  /**
   * Fetch Stripe public configuration
   */
  static async getStripeConfig(): Promise<StripeConfig> {
    const res = await apiFetch('/api/billing/config');
    if (!res.ok) {
      return { publishableKey: '', isConfigured: false };
    }
    return res.json();
  }

  /**
   * Fetch workspace billing summary, current usage, and plan limits
   */
  static async getBillingSummary(workspaceId?: string): Promise<BillingSummary> {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    const res = await apiFetch(`/api/billing/summary${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load billing summary.');
    }
    const data = await res.json();
    return data.summary;
  }

  /**
   * Fetch usage records and event history
   */
  static async getUsageHistory(workspaceId?: string): Promise<{ usageRecords: UsageRecord[]; events: UsageEvent[] }> {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    const res = await apiFetch(`/api/billing/usage-history${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load usage history.');
    }
    return res.json();
  }

  /**
   * Fetch workspace invoice history from Stripe/Backend
   */
  static async getInvoices(workspaceId?: string): Promise<Invoice[]> {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    const res = await apiFetch(`/api/billing/invoices${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load invoice history.');
    }
    const data = await res.json();
    return data.invoices || [];
  }

  /**
   * Create Stripe Checkout Session
   */
  static async createCheckoutSession(
    workspaceId: string,
    planKey: 'PRO' | 'BUSINESS'
  ): Promise<{ url: string; sessionId: string; mode: 'stripe' | 'simulated' }> {
    const res = await apiFetch('/api/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, planKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to initiate checkout session.');
    }
    return res.json();
  }

  /**
   * Create Stripe Customer Portal session for managing subscriptions and invoices
   */
  static async createCustomerPortalSession(workspaceId: string): Promise<{ url: string }> {
    const res = await apiFetch('/api/billing/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate Customer Portal session.');
    }
    return res.json();
  }

  /**
   * Simulate checkout in test mode
   */
  static async simulateCheckout(
    workspaceId: string,
    planKey: 'PRO' | 'BUSINESS'
  ): Promise<{ success: boolean; summary: BillingSummary; message: string }> {
    const res = await apiFetch('/api/billing/simulate-checkout', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, planKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Simulated checkout failed.');
    }
    return res.json();
  }

  /**
   * Cancel subscription (or schedule at period end)
   */
  static async cancelSubscription(
    workspaceId: string,
    immediate = false
  ): Promise<{ success: boolean; summary: BillingSummary; message: string }> {
    const res = await apiFetch('/api/billing/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, immediate }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel subscription.');
    }
    return res.json();
  }

  /**
   * Change or upgrade workspace plan directly (OWNER/ADMIN only)
   */
  static async upgradePlan(
    workspaceId: string,
    planKey: PlanKey
  ): Promise<{ success: boolean; summary: BillingSummary; message: string }> {
    const res = await apiFetch('/api/billing/upgrade', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, planKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update plan.');
    }
    return res.json();
  }
}
