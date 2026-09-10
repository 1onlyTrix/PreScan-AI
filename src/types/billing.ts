export type PlanKey = 'FREE' | 'PRO' | 'BUSINESS';

export interface Plan {
  id: string;
  key: PlanKey;
  name: string;
  description: string;
  monthlyPrice: number;
  currency: string;
  scanLimit: number;
  maxVideoDurationSeconds: number;
  maxMembers: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  badge?: string;
  isPopular?: boolean;
}

export interface Subscription {
  id: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'UNPAID' | 'NONE';
  planKey: PlanKey;
  billingProvider: 'NONE' | 'STRIPE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
}

export interface BillingSummary {
  workspaceId: string;
  plan: Plan;
  subscription: Subscription;
  usage: {
    scansUsed: number;
    scanLimit: number;
    remainingScans: number;
    usagePercentage: number;
    periodStart: string;
    periodEnd: string;
    daysRemaining: number;
  };
  limits: {
    scanLimit: number;
    maxVideoDurationSeconds: number;
    maxVideoDurationMinutes: number;
    maxMembers: number;
    features: string[];
  };
  team: {
    currentCount: number;
    maxMembers: number;
    canAddMember: boolean;
  };
  availablePlans: Plan[];
}

export interface UsageRecord {
  id: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  scansUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  workspaceId: string;
  userId: string;
  scanId: string;
  type: 'SCAN_CONSUMED' | 'SCAN_FAILED_REVERT';
  units: number;
  metadataJson?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  stripeInvoiceId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  number?: string;
  amountPaid: number; // in cents
  amountDue: number; // in cents
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

export interface StripeConfig {
  publishableKey: string;
  isConfigured: boolean;
  proPriceId?: string;
  businessPriceId?: string;
}
