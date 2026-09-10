import { db, DbPlan, DbSubscription, DbUsageRecord, DbUsageEvent } from '../db';
import { PLANS_CONFIG } from '../config/plans.config';

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  limits: {
    scanLimit: number;
    maxVideoDurationSeconds: number;
    maxMembers: number;
    features: string[];
  };
  usage: {
    scansUsed: number;
    remainingScans: number;
    periodStart: string;
    periodEnd: string;
  };
  plan: DbPlan;
  subscription: DbSubscription;
}

export interface VideoEntitlementResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  maxVideoDurationSeconds: number;
  durationSeconds?: number;
}

export interface MemberEntitlementResult {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
  currentCount: number;
  maxMembers: number;
}

export interface BillingSummary {
  workspaceId: string;
  plan: DbPlan;
  subscription: {
    id: string;
    status: string;
    planKey: 'FREE' | 'PRO' | 'BUSINESS';
    billingProvider: 'NONE' | 'STRIPE';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
  };
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
  availablePlans: DbPlan[];
}

export class EntitlementService {
  /**
   * Helper to compute rolling monthly billing period timestamps
   */
  private static calculateCurrentBillingPeriod(now: Date = new Date()): { start: string; end: string } {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const end = new Date(nextMonth.getTime() - 1).toISOString();
    return { start, end };
  }

  /**
   * Retrieve or initialize the active subscription for a workspace
   */
  static getWorkspaceSubscription(workspaceId: string): DbSubscription {
    let sub = db.getSubscriptionByWorkspace(workspaceId);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!sub) {
      const period = this.calculateCurrentBillingPeriod(now);
      const freePlan = db.getPlanByKey('FREE') || PLANS_CONFIG.FREE;
      sub = {
        id: `sub_${workspaceId}`,
        workspaceId,
        planId: freePlan.id,
        planKey: 'FREE',
        status: 'ACTIVE',
        billingProvider: 'NONE',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.createSubscription(sub);
      return sub;
    }

    // Auto-advance billing period if expired
    if (sub.currentPeriodEnd < nowIso) {
      const period = this.calculateCurrentBillingPeriod(now);
      const updated = db.updateSubscription(sub.id, {
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      });
      if (updated) {
        sub = updated;
      }
    }

    return sub;
  }

  /**
   * Retrieve the active DbPlan for a workspace
   */
  static getWorkspacePlan(workspaceId: string): DbPlan {
    const sub = this.getWorkspaceSubscription(workspaceId);
    let plan = db.getPlanByKey(sub.planKey);
    if (!plan) {
      plan = db.getPlanByKey('FREE') || (PLANS_CONFIG.FREE as any);
    }
    return plan!;
  }

  /**
   * Retrieve or initialize usage record for the current billing cycle
   */
  static getCurrentUsage(workspaceId: string): { record: DbUsageRecord; scansUsed: number; periodStart: string; periodEnd: string } {
    const sub = this.getWorkspaceSubscription(workspaceId);
    const record = db.createOrGetUsageRecord(workspaceId, sub.currentPeriodStart, sub.currentPeriodEnd);
    return {
      record,
      scansUsed: record.scansUsed,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    };
  }

  /**
   * Retrieve remaining scans in the current cycle
   */
  static getRemainingScans(workspaceId: string): number {
    const plan = this.getWorkspacePlan(workspaceId);
    const { scansUsed } = this.getCurrentUsage(workspaceId);
    return Math.max(0, plan.scanLimit - scansUsed);
  }

  /**
   * Server-side gate: Verify if a workspace can create / initiate a new scan
   */
  static canCreateScan(workspaceId: string): EntitlementCheckResult {
    const subscription = this.getWorkspaceSubscription(workspaceId);
    const plan = this.getWorkspacePlan(workspaceId);
    const { scansUsed, periodStart, periodEnd } = this.getCurrentUsage(workspaceId);
    const remainingScans = Math.max(0, plan.scanLimit - scansUsed);

    // Subscription status validation
    if (subscription.status === 'CANCELED' || subscription.status === 'UNPAID') {
      return {
        allowed: false,
        reason: 'Workspace subscription is inactive or suspended.',
        errorCode: 'SUBSCRIPTION_INACTIVE',
        limits: {
          scanLimit: plan.scanLimit,
          maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
          maxMembers: plan.maxMembers,
          features: plan.features,
        },
        usage: {
          scansUsed,
          remainingScans: 0,
          periodStart,
          periodEnd,
        },
        plan,
        subscription,
      };
    }

    if (scansUsed >= plan.scanLimit) {
      return {
        allowed: false,
        reason: `Monthly scan limit reached (${plan.scanLimit}/${plan.scanLimit} scans used on ${plan.name} plan). Please upgrade your workspace plan to run more scans.`,
        errorCode: 'PLAN_LIMIT_REACHED',
        limits: {
          scanLimit: plan.scanLimit,
          maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
          maxMembers: plan.maxMembers,
          features: plan.features,
        },
        usage: {
          scansUsed,
          remainingScans: 0,
          periodStart,
          periodEnd,
        },
        plan,
        subscription,
      };
    }

    return {
      allowed: true,
      limits: {
        scanLimit: plan.scanLimit,
        maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
        maxMembers: plan.maxMembers,
        features: plan.features,
      },
      usage: {
        scansUsed,
        remainingScans,
        periodStart,
        periodEnd,
      },
      plan,
      subscription,
    };
  }

  /**
   * Server-side gate: Verify if video duration falls within plan limits
   */
  static canUploadVideo(workspaceId: string, durationSeconds?: number): VideoEntitlementResult {
    const plan = this.getWorkspacePlan(workspaceId);
    if (!durationSeconds || durationSeconds <= 0) {
      return {
        allowed: true,
        maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
      };
    }

    if (durationSeconds > plan.maxVideoDurationSeconds) {
      const allowedMin = Math.round(plan.maxVideoDurationSeconds / 60);
      const actualMin = Math.round(durationSeconds / 60);
      return {
        allowed: false,
        reason: `Video duration (${actualMin} min) exceeds the ${plan.name} plan limit of ${allowedMin} minutes. Upgrade your workspace to analyze longer content.`,
        errorCode: 'VIDEO_DURATION_EXCEEDED',
        maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
        durationSeconds,
      };
    }

    return {
      allowed: true,
      maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
      durationSeconds,
    };
  }

  /**
   * Server-side gate: Verify team member capacity
   */
  static canAddMember(workspaceId: string): MemberEntitlementResult {
    const plan = this.getWorkspacePlan(workspaceId);
    const activeMembers = db.findMembershipsByOrg(workspaceId);
    const pendingInvites = db.findInvitationsByOrg(workspaceId).filter((i) => i.status === 'PENDING');
    const totalCount = activeMembers.length + pendingInvites.length;

    if (totalCount >= plan.maxMembers) {
      return {
        allowed: false,
        reason: `Workspace team limit reached (${totalCount}/${plan.maxMembers} seats occupied or invited on ${plan.name} plan). Upgrade your plan to invite more collaborators.`,
        errorCode: 'MEMBER_LIMIT_REACHED',
        currentCount: totalCount,
        maxMembers: plan.maxMembers,
      };
    }

    return {
      allowed: true,
      currentCount: totalCount,
      maxMembers: plan.maxMembers,
    };
  }

  /**
   * Check feature entitlement
   */
  static canUseFeature(workspaceId: string, featureKey: string): boolean {
    const plan = this.getWorkspacePlan(workspaceId);
    return plan.features.includes(featureKey);
  }

  /**
   * Concurrency-safe atomic scan entitlement consumption.
   * Checks limit and increments counter in a single synchronous lock cycle.
   */
  static consumeScanEntitlement(
    workspaceId: string,
    userId: string,
    scanId: string,
    options?: { durationSeconds?: number }
  ): { success: boolean; usage?: DbUsageRecord; error?: string; errorCode?: string } {
    // 1. Verify scan limit entitlement
    const check = this.canCreateScan(workspaceId);
    if (!check.allowed) {
      return {
        success: false,
        error: check.reason,
        errorCode: check.errorCode,
      };
    }

    // 2. Verify duration if provided
    if (options?.durationSeconds) {
      const durCheck = this.canUploadVideo(workspaceId, options.durationSeconds);
      if (!durCheck.allowed) {
        return {
          success: false,
          error: durCheck.reason,
          errorCode: durCheck.errorCode,
        };
      }
    }

    const sub = check.subscription;
    const nowIso = new Date().toISOString();

    // 3. Atomically increment usage
    const updatedUsage = db.incrementUsage(workspaceId, sub.currentPeriodStart, sub.currentPeriodEnd, 1);

    // 4. Record immutable Usage Event
    const event: DbUsageEvent = {
      id: `usevt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      userId,
      scanId,
      type: 'SCAN_CONSUMED',
      units: 1,
      metadataJson: JSON.stringify({
        planKey: sub.planKey,
        durationSeconds: options?.durationSeconds,
        scansUsedAfter: updatedUsage.scansUsed,
        scanLimit: check.limits.scanLimit,
      }),
      createdAt: nowIso,
    };
    db.recordUsageEvent(event);

    // 5. Audit Log
    db.createAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: workspaceId,
      actorUserId: userId,
      action: 'USAGE_SCAN_CONSUMED',
      targetResourceType: 'SCAN',
      targetResourceId: scanId,
      metadataJson: JSON.stringify({
        scansUsed: updatedUsage.scansUsed,
        scanLimit: check.limits.scanLimit,
        plan: check.plan.key,
      }),
      createdAt: nowIso,
    });

    return {
      success: true,
      usage: updatedUsage,
    };
  }

  /**
   * Provide comprehensive billing and entitlement summary for UI
   */
  static getBillingSummary(workspaceId: string): BillingSummary {
    const subscription = this.getWorkspaceSubscription(workspaceId);
    const plan = this.getWorkspacePlan(workspaceId);
    const { scansUsed, periodStart, periodEnd } = this.getCurrentUsage(workspaceId);
    const remainingScans = Math.max(0, plan.scanLimit - scansUsed);
    const usagePercentage = Math.min(100, Math.round((scansUsed / plan.scanLimit) * 100));

    const now = new Date();
    const periodEndDate = new Date(periodEnd);
    const msRemaining = periodEndDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    const activeMembers = db.findMembershipsByOrg(workspaceId);
    const pendingInvites = db.findInvitationsByOrg(workspaceId).filter((i) => i.status === 'PENDING');
    const currentMemberCount = activeMembers.length + pendingInvites.length;

    const allPlans = db.getPlans();

    return {
      workspaceId,
      plan,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planKey: subscription.planKey,
        billingProvider: subscription.billingProvider,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        providerCustomerId: subscription.providerCustomerId,
        providerSubscriptionId: subscription.providerSubscriptionId,
      },
      usage: {
        scansUsed,
        scanLimit: plan.scanLimit,
        remainingScans,
        usagePercentage,
        periodStart,
        periodEnd,
        daysRemaining,
      },
      limits: {
        scanLimit: plan.scanLimit,
        maxVideoDurationSeconds: plan.maxVideoDurationSeconds,
        maxVideoDurationMinutes: Math.round(plan.maxVideoDurationSeconds / 60),
        maxMembers: plan.maxMembers,
        features: plan.features,
      },
      team: {
        currentCount: currentMemberCount,
        maxMembers: plan.maxMembers,
        canAddMember: currentMemberCount < plan.maxMembers,
      },
      availablePlans: allPlans,
    };
  }

  /**
   * Change workspace plan (administrative / billing-ready upgrade)
   */
  static updateWorkspacePlan(
    workspaceId: string,
    targetPlanKey: 'FREE' | 'PRO' | 'BUSINESS',
    actorUserId: string
  ): { success: boolean; summary: BillingSummary } {
    const targetPlan = db.getPlanByKey(targetPlanKey);
    if (!targetPlan) {
      throw new Error(`Invalid plan key: ${targetPlanKey}`);
    }

    const sub = this.getWorkspaceSubscription(workspaceId);
    const oldPlanKey = sub.planKey;

    db.updateSubscription(sub.id, {
      planId: targetPlan.id,
      planKey: targetPlan.key,
      updatedAt: new Date().toISOString(),
    });

    db.createAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: workspaceId,
      actorUserId,
      action: 'PLAN_UPGRADED',
      targetResourceType: 'WORKSPACE',
      targetResourceId: workspaceId,
      metadataJson: JSON.stringify({
        previousPlan: oldPlanKey,
        newPlan: targetPlan.key,
      }),
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      summary: this.getBillingSummary(workspaceId),
    };
  }
}
