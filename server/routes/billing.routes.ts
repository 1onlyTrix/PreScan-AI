import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../auth';
import { EntitlementService } from '../services/entitlement.service';
import { StripeService } from '../services/stripe.service';
import { PLANS_CONFIG } from '../config/plans.config';

const router = Router();

/**
 * GET /api/billing/plans
 * Public/authenticated endpoint returning all available plan tiers
 */
router.get('/plans', (req: Request, res: Response) => {
  const plans = db.getPlans();
  return res.json({ plans });
});

/**
 * GET /api/billing/config
 * Public/authenticated endpoint returning Stripe public configuration status
 */
router.get('/config', (req: Request, res: Response) => {
  return res.json({
    publishableKey: StripeService.getPublishableKey(),
    isConfigured: StripeService.isConfigured(),
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    businessPriceId: process.env.STRIPE_BUSINESS_PRICE_ID || '',
  });
});

/**
 * GET /api/billing/summary
 * Returns active plan, subscription state, scan metering usage, and team capacity
 */
router.get('/summary', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const workspaceId = (req.query.workspaceId as string) || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  const membership = db.findMembership(workspaceId, user.id);
  if (!membership) {
    return res.status(403).json({ error: 'You do not have access to this workspace.', code: 'FORBIDDEN_WORKSPACE' });
  }

  const summary = EntitlementService.getBillingSummary(workspaceId);
  return res.json({
    summary,
    stripe: {
      isConfigured: StripeService.isConfigured(),
      publishableKey: StripeService.getPublishableKey(),
    },
  });
});

/**
 * GET /api/billing/usage-history
 * Returns historical usage records and immutable usage events for the workspace
 */
router.get('/usage-history', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const workspaceId = (req.query.workspaceId as string) || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  const membership = db.findMembership(workspaceId, user.id);
  if (!membership) {
    return res.status(403).json({ error: 'You do not have access to this workspace.', code: 'FORBIDDEN_WORKSPACE' });
  }

  const usageRecords = db.getUsageRecordsByWorkspace(workspaceId);
  const events = db.getUsageEventsByWorkspace(workspaceId, 20);

  return res.json({
    usageRecords,
    events,
  });
});

/**
 * GET /api/billing/invoices
 * Returns payment invoices & billing history for the workspace
 */
router.get('/invoices', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const workspaceId = (req.query.workspaceId as string) || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  const membership = db.findMembership(workspaceId, user.id);
  if (!membership) {
    return res.status(403).json({ error: 'You do not have access to this workspace.', code: 'FORBIDDEN_WORKSPACE' });
  }

  try {
    const invoices = await StripeService.getWorkspaceInvoices(workspaceId);
    return res.json({ invoices });
  } catch (err: any) {
    console.error('Failed to load invoices:', err);
    return res.status(500).json({ error: 'Failed to retrieve invoice history.', code: 'INVOICES_ERROR' });
  }
});

/**
 * POST /api/billing/create-checkout-session
 * Creates real Stripe Checkout Session for upgrading workspace (OWNER / ADMIN only)
 */
router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { workspaceId, planKey } = req.body;

  const targetOrgId = workspaceId || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;
  if (!targetOrgId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  if (!planKey || !['PRO', 'BUSINESS'].includes(planKey)) {
    return res.status(400).json({ error: 'Valid planKey (PRO or BUSINESS) is required.', code: 'INVALID_PLAN_KEY' });
  }

  const membership = db.findMembership(targetOrgId, user.id);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Only Workspace Owners or Admins can purchase subscription upgrades.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  try {
    // Resolve app base URL from request origin or environment
    const origin = req.get('origin') || req.protocol + '://' + req.get('host');
    const returnUrlBase = process.env.APP_URL || origin;

    const session = await StripeService.createCheckoutSession({
      workspaceId: targetOrgId,
      planKey,
      userId: user.id,
      userEmail: user.email,
      returnUrlBase,
    });

    return res.json({
      url: session.url,
      sessionId: session.sessionId,
      mode: session.mode,
      planKey,
    });
  } catch (err: any) {
    console.error('Checkout creation error:', err);
    return res.status(400).json({
      error: err.message || 'Failed to create checkout session.',
      code: 'CHECKOUT_FAILED',
    });
  }
});

/**
 * POST /api/billing/create-portal-session
 * Creates a Stripe Customer Portal Session for managing subscriptions, payment cards, & invoices
 */
router.post('/create-portal-session', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { workspaceId } = req.body;

  const targetOrgId = workspaceId || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;
  if (!targetOrgId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  const membership = db.findMembership(targetOrgId, user.id);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Only Workspace Owners or Admins can access the Stripe billing portal.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  try {
    const origin = req.get('origin') || req.protocol + '://' + req.get('host');
    const returnUrl = `${process.env.APP_URL || origin}/app/billing`;

    const portal = await StripeService.createCustomerPortalSession({
      workspaceId: targetOrgId,
      returnUrl,
    });

    return res.json({ url: portal.url });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'Failed to generate Customer Portal session.',
      code: 'PORTAL_ERROR',
    });
  }
});

/**
 * POST /api/billing/simulate-checkout
 * Simulates checkout success in local/demo environment when Stripe API keys are not provided
 */
router.post('/simulate-checkout', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const { workspaceId, planKey } = req.body;

  const targetOrgId = workspaceId || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;
  if (!targetOrgId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  if (!planKey || !['PRO', 'BUSINESS'].includes(planKey)) {
    return res.status(400).json({ error: 'Valid planKey (PRO or BUSINESS) is required.', code: 'INVALID_PLAN_KEY' });
  }

  const membership = db.findMembership(targetOrgId, user.id);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Only Workspace Owners or Admins can upgrade subscriptions.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  try {
    const updatedSub = StripeService.simulateCheckoutCompletion(targetOrgId, planKey, user.id);
    const summary = EntitlementService.getBillingSummary(targetOrgId);
    return res.json({
      success: true,
      subscription: updatedSub,
      summary,
      message: `Workspace successfully upgraded to ${planKey} plan (Simulated).`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, code: 'SIMULATE_FAILED' });
  }
});

/**
 * POST /api/billing/cancel-subscription
 * Cancels active Stripe subscription (or sets cancelAtPeriodEnd)
 */
router.post('/cancel-subscription', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { workspaceId, immediate } = req.body;

  const targetOrgId = workspaceId || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;
  if (!targetOrgId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  const membership = db.findMembership(targetOrgId, user.id);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Only Workspace Owners or Admins can manage subscription cancellations.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  const sub = EntitlementService.getWorkspaceSubscription(targetOrgId);

  try {
    // If Stripe is configured and subscription ID exists, cancel in Stripe
    if (StripeService.isConfigured() && sub.providerSubscriptionId && sub.providerSubscriptionId.startsWith('sub_')) {
      const stripe = StripeService.getStripe();
      if (immediate) {
        await stripe.subscriptions.cancel(sub.providerSubscriptionId);
      } else {
        await stripe.subscriptions.update(sub.providerSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }

    if (immediate) {
      const freePlan = db.getPlanByKey('FREE') || PLANS_CONFIG.FREE;
      db.updateSubscription(sub.id, {
        planId: freePlan.id,
        planKey: 'FREE',
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
        updatedAt: new Date().toISOString(),
      });
    } else {
      db.updateSubscription(sub.id, {
        cancelAtPeriodEnd: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const summary = EntitlementService.getBillingSummary(targetOrgId);
    return res.json({
      success: true,
      message: immediate ? 'Subscription canceled and downgraded to Free.' : 'Subscription scheduled to cancel at end of billing cycle.',
      summary,
    });
  } catch (err: any) {
    console.error('Cancel subscription error:', err);
    return res.status(400).json({ error: err.message || 'Failed to cancel subscription.', code: 'CANCEL_FAILED' });
  }
});

/**
 * POST /api/billing/upgrade
 * Administrative plan switch (or downgrade to Free)
 */
router.post('/upgrade', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const { workspaceId, planKey } = req.body;

  const targetOrgId = workspaceId || (req.headers['x-workspace-id'] as string) || user.defaultOrganizationId;
  if (!targetOrgId) {
    return res.status(400).json({ error: 'Workspace ID is required.', code: 'MISSING_WORKSPACE_ID' });
  }

  if (!planKey || !['FREE', 'PRO', 'BUSINESS'].includes(planKey)) {
    return res.status(400).json({ error: 'Valid planKey (FREE, PRO, or BUSINESS) is required.', code: 'INVALID_PLAN_KEY' });
  }

  const membership = db.findMembership(targetOrgId, user.id);
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return res.status(403).json({
      error: 'Only Workspace Owners or Admins can modify plan subscriptions.',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }

  try {
    const result = EntitlementService.updateWorkspacePlan(targetOrgId, planKey, user.id);
    return res.json({
      success: true,
      message: `Workspace successfully updated to ${planKey} plan.`,
      summary: result.summary,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update plan.', code: 'UPGRADE_FAILED' });
  }
});

/**
 * POST /api/billing/webhook & POST /api/billing/stripe/webhook
 * Source of truth endpoint for Stripe events (Idempotent signature verification & state synchronization)
 */
const handleWebhookRequest = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody || req.body;

  if (!rawBody) {
    return res.status(400).json({ error: 'Missing webhook payload.', code: 'EMPTY_BODY' });
  }

  try {
    const result = await StripeService.handleWebhook(rawBody, signature || '');
    return res.json({
      received: true,
      eventId: result.eventId,
      eventType: result.eventType,
      processed: result.processed,
      message: result.message,
    });
  } catch (err: any) {
    console.error('Webhook processing error:', err.message);
    return res.status(400).json({
      error: err.message || 'Webhook verification failed',
      code: 'WEBHOOK_FAILED',
    });
  }
};

router.post('/webhook', handleWebhookRequest);
router.post('/stripe/webhook', handleWebhookRequest);

export default router;
