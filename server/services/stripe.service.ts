import Stripe from 'stripe';
import { db, DbSubscription, DbInvoice } from '../db';
import { PLANS_CONFIG } from '../config/plans.config';
import { EntitlementService } from './entitlement.service';

let stripeClient: Stripe | null = null;

export class StripeService {
  /**
   * Lazy initialization of Stripe SDK client
   */
  static getStripe(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables.');
    }
    if (!stripeClient) {
      stripeClient = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia' as any,
        typescript: true,
      });
    }
    return stripeClient;
  }

  /**
   * Check if Stripe secret key is present in environment
   */
  static isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== '');
  }

  /**
   * Return publishable key for client
   */
  static getPublishableKey(): string {
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Resolve Price ID for plan tier
   */
  static getPriceIdForPlan(planKey: 'PRO' | 'BUSINESS'): string | undefined {
    if (planKey === 'PRO') {
      return process.env.STRIPE_PRO_PRICE_ID || undefined;
    }
    if (planKey === 'BUSINESS') {
      return process.env.STRIPE_BUSINESS_PRICE_ID || undefined;
    }
    return undefined;
  }

  /**
   * Match Stripe Price ID or Product to PreScan Plan Key
   */
  static getPlanKeyFromPriceId(priceId?: string): 'PRO' | 'BUSINESS' | 'FREE' {
    if (!priceId) return 'FREE';
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    const busPriceId = process.env.STRIPE_BUSINESS_PRICE_ID;

    if (proPriceId && priceId === proPriceId) return 'PRO';
    if (busPriceId && priceId === busPriceId) return 'BUSINESS';

    // Heuristic fallback if test price contains plan name
    const lower = priceId.toLowerCase();
    if (lower.includes('business')) return 'BUSINESS';
    if (lower.includes('pro')) return 'PRO';

    return 'PRO'; // Default upgraded tier
  }

  /**
   * Retrieve or create a Stripe Customer for a given Workspace
   * (Stripe Customer belongs strictly to the WORKSPACE / Organization)
   */
  static async getOrCreateCustomer(
    workspaceId: string,
    customerEmail: string,
    workspaceName?: string
  ): Promise<string> {
    const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
    if (sub.providerCustomerId && sub.providerCustomerId.startsWith('cus_')) {
      return sub.providerCustomerId;
    }

    if (!this.isConfigured()) {
      // In dev/test mode without API keys, generate a consistent mock customer ID
      const mockCustomerId = `cus_mock_${workspaceId.replace(/[^a-zA-Z0-9]/g, '')}`;
      db.updateSubscription(sub.id, {
        providerCustomerId: mockCustomerId,
        billingProvider: 'STRIPE',
      });
      return mockCustomerId;
    }

    const stripe = this.getStripe();
    const org = db.findOrganizationById(workspaceId);
    const displayName = workspaceName || org?.name || 'PreScan Workspace';

    // Search for existing Stripe customer by workspace metadata
    const existing = await stripe.customers.search({
      query: `metadata['workspaceId']:'${workspaceId}'`,
      limit: 1,
    });

    if (existing.data.length > 0) {
      const custId = existing.data[0].id;
      db.updateSubscription(sub.id, {
        providerCustomerId: custId,
        billingProvider: 'STRIPE',
      });
      return custId;
    }

    // Create new customer in Stripe
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: displayName,
      metadata: {
        workspaceId,
        workspaceName: displayName,
        app: 'PreScan',
      },
    });

    db.updateSubscription(sub.id, {
      providerCustomerId: customer.id,
      billingProvider: 'STRIPE',
    });

    return customer.id;
  }

  /**
   * Create a Stripe Checkout Session for upgrading a Workspace to Pro or Business
   */
  static async createCheckoutSession(params: {
    workspaceId: string;
    planKey: 'PRO' | 'BUSINESS';
    userId: string;
    userEmail: string;
    returnUrlBase: string;
  }): Promise<{ url: string; sessionId: string; mode: 'stripe' | 'simulated' }> {
    const { workspaceId, planKey, userId, userEmail, returnUrlBase } = params;
    const planConfig = PLANS_CONFIG[planKey];
    if (!planConfig) {
      throw new Error(`Invalid plan key: ${planKey}`);
    }

    const successUrl = `${returnUrlBase}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${planKey}`;
    const cancelUrl = `${returnUrlBase}/app/billing?checkout=canceled`;

    // 1. If Stripe is fully configured, execute real Stripe Checkout Session creation
    if (this.isConfigured()) {
      const stripe = this.getStripe();
      const customerId = await this.getOrCreateCustomer(workspaceId, userEmail);
      const configuredPriceId = this.getPriceIdForPlan(planKey);

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

      if (configuredPriceId) {
        lineItems = [
          {
            price: configuredPriceId,
            quantity: 1,
          },
        ];
      } else {
        // Dynamic price data based on plan configuration
        lineItems = [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `PreScan ${planConfig.name} Plan`,
                description: planConfig.description,
                metadata: {
                  planKey,
                  scanLimit: String(planConfig.scanLimit),
                  maxVideoDurationSeconds: String(planConfig.maxVideoDurationSeconds),
                },
              },
              unit_amount: planConfig.monthlyPrice * 100, // In cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ];
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: lineItems,
        client_reference_id: workspaceId,
        metadata: {
          workspaceId,
          planKey,
          userId,
        },
        subscription_data: {
          metadata: {
            workspaceId,
            planKey,
            userId,
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      });

      return {
        url: session.url || successUrl,
        sessionId: session.id,
        mode: 'stripe',
      };
    }

    // 2. Simulated Developer Checkout (when STRIPE_SECRET_KEY is not yet populated)
    // Ensures developers & testers can test the complete subscription flow smoothly
    const simulatedSessionId = `cs_test_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      url: successUrl.replace('{CHECKOUT_SESSION_ID}', simulatedSessionId),
      sessionId: simulatedSessionId,
      mode: 'simulated',
    };
  }

  /**
   * Create a Stripe Customer Portal session so workspace owners can manage payment methods,
   * view invoices, or update their billing subscription directly on Stripe.
   */
  static async createCustomerPortalSession(params: {
    workspaceId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const { workspaceId, returnUrl } = params;
    const sub = EntitlementService.getWorkspaceSubscription(workspaceId);

    if (!sub.providerCustomerId || !sub.providerCustomerId.startsWith('cus_')) {
      throw new Error('No active Stripe customer found for this workspace. Upgrade your plan to initialize billing portal access.');
    }

    if (!this.isConfigured()) {
      // In dev mode without keys, redirect back with a helpful notification
      return { url: `${returnUrl}?portal=simulated` };
    }

    const stripe = this.getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.providerCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  }

  /**
   * Retrieve invoice history for a workspace from Stripe and local database
   */
  static async getWorkspaceInvoices(workspaceId: string): Promise<DbInvoice[]> {
    const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
    let localInvoices = db.findInvoicesByWorkspace(workspaceId);

    // If Stripe is configured and workspace has a customer ID, sync fresh invoices from Stripe
    if (this.isConfigured() && sub.providerCustomerId && sub.providerCustomerId.startsWith('cus_')) {
      try {
        const stripe = this.getStripe();
        const stripeInvoices = await stripe.invoices.list({
          customer: sub.providerCustomerId,
          limit: 20,
        });

        for (const inv of stripeInvoices.data) {
          const invAny = inv as any;
          const subId = typeof invAny.subscription === 'string'
            ? invAny.subscription
            : invAny.subscription?.id || invAny.parent?.subscription_details?.subscription;

          const mapped: DbInvoice = {
            id: `inv_${inv.id}`,
            workspaceId,
            stripeInvoiceId: inv.id,
            stripeSubscriptionId: subId || undefined,
            stripeCustomerId: sub.providerCustomerId,
            number: inv.number || undefined,
            amountPaid: inv.amount_paid,
            amountDue: inv.amount_due,
            currency: (inv.currency || 'usd').toUpperCase(),
            status: (inv.status as any) || 'paid',
            hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
            invoicePdf: inv.invoice_pdf || undefined,
            periodStart: new Date((inv.period_start || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
            periodEnd: new Date((inv.period_end || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
            paidAt: inv.status_transitions?.paid_at
              ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
              : undefined,
            createdAt: new Date(inv.created * 1000).toISOString(),
          };
          db.saveInvoice(mapped);
        }

        localInvoices = db.findInvoicesByWorkspace(workspaceId);
      } catch (err) {
        console.error('Failed to fetch invoices from Stripe:', err);
      }
    }

    return localInvoices;
  }

  /**
   * Process and verify incoming Stripe Webhook events
   * Stripe Webhooks are the absolute SOURCE OF TRUTH for subscription lifecycle.
   */
  static async handleWebhook(
    rawBody: Buffer | string,
    signature: string
  ): Promise<{ received: boolean; eventType: string; eventId: string; processed: boolean; message?: string }> {
    let event: Stripe.Event;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (this.isConfigured() && webhookSecret) {
      const stripe = this.getStripe();
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error('Stripe webhook signature verification failed:', err.message);
        throw new Error(`Webhook Error: ${err.message}`);
      }
    } else {
      // In dev or when payload is parsed directly
      try {
        event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'));
      } catch {
        throw new Error('Invalid webhook JSON payload.');
      }
    }

    // Idempotency check: Skip if this event was already processed
    if (db.isStripeEventProcessed(event.id)) {
      return {
        received: true,
        eventId: event.id,
        eventType: event.type,
        processed: false,
        message: 'Event was previously processed (idempotent skip).',
      };
    }

    // Event Handler Dispatcher
    await this.dispatchWebhookEvent(event);

    // Record event as successfully processed
    db.recordStripeEvent(event.id, event.type);

    return {
      received: true,
      eventId: event.id,
      eventType: event.type,
      processed: true,
    };
  }

  /**
   * Process individual Stripe event types
   */
  private static async dispatchWebhookEvent(event: Stripe.Event): Promise<void> {
    const nowIso = new Date().toISOString();

    switch (event.type) {
      // 1. Checkout completed
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.client_reference_id || session.metadata?.workspaceId;
        const planKey = (session.metadata?.planKey as 'PRO' | 'BUSINESS') || 'PRO';

        if (workspaceId) {
          const targetPlan = db.getPlanByKey(planKey) || PLANS_CONFIG.PRO;
          const sub = EntitlementService.getWorkspaceSubscription(workspaceId);

          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

          // Update subscription state
          db.updateSubscription(sub.id, {
            planId: targetPlan.id,
            planKey: targetPlan.key,
            status: 'ACTIVE',
            billingProvider: 'STRIPE',
            providerCustomerId: customerId || sub.providerCustomerId,
            providerSubscriptionId: subscriptionId || sub.providerSubscriptionId,
            cancelAtPeriodEnd: false,
            updatedAt: nowIso,
          });

          // Ensure usage record for current period
          EntitlementService.getCurrentUsage(workspaceId);

          // Audit log
          db.createAuditLog({
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            organizationId: workspaceId,
            actorUserId: session.metadata?.userId || 'stripe_webhook',
            action: 'SUBSCRIPTION_CHECKOUT_COMPLETED',
            targetResourceType: 'WORKSPACE',
            targetResourceId: workspaceId,
            metadataJson: JSON.stringify({
              planKey,
              customerId,
              subscriptionId,
              stripeEventId: event.id,
            }),
            createdAt: nowIso,
          });
        }
        break;
      }

      // 2. Subscription Created or Updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id;
        const workspaceId = stripeSub.metadata?.workspaceId || db.findSubscriptionByStripeCustomerId(customerId || '')?.workspaceId;

        if (workspaceId) {
          const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
          const priceId = stripeSub.items?.data?.[0]?.price?.id;
          const resolvedPlanKey = (stripeSub.metadata?.planKey as any) || this.getPlanKeyFromPriceId(priceId);
          const targetPlan = db.getPlanByKey(resolvedPlanKey) || PLANS_CONFIG.PRO;

          // Map Stripe status to DbSubscription status
          let mappedStatus: DbSubscription['status'] = 'ACTIVE';
          if (stripeSub.status === 'active') mappedStatus = 'ACTIVE';
          else if (stripeSub.status === 'trialing') mappedStatus = 'TRIALING';
          else if (stripeSub.status === 'past_due') mappedStatus = 'PAST_DUE';
          else if (stripeSub.status === 'canceled') mappedStatus = 'CANCELED';
          else if (stripeSub.status === 'unpaid') mappedStatus = 'UNPAID';
          else if (stripeSub.status === 'incomplete') mappedStatus = 'INCOMPLETE';

          const stripeSubAny = stripeSub as any;
          const periodStart = new Date(((stripeSubAny.current_period_start || Math.floor(Date.now() / 1000)) * 1000)).toISOString();
          const periodEnd = new Date(((stripeSubAny.current_period_end || Math.floor(Date.now() / 1000) + 30 * 86400) * 1000)).toISOString();

          db.updateSubscription(sub.id, {
            planId: targetPlan.id,
            planKey: targetPlan.key,
            status: mappedStatus,
            billingProvider: 'STRIPE',
            providerCustomerId: customerId,
            providerSubscriptionId: stripeSub.id,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            updatedAt: nowIso,
          });

          // Ensure usage record for the active period
          db.createOrGetUsageRecord(workspaceId, periodStart, periodEnd);

          db.createAuditLog({
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            organizationId: workspaceId,
            actorUserId: 'stripe_webhook',
            action: 'SUBSCRIPTION_SYNCED',
            targetResourceType: 'WORKSPACE',
            targetResourceId: workspaceId,
            metadataJson: JSON.stringify({
              status: mappedStatus,
              planKey: targetPlan.key,
              subscriptionId: stripeSub.id,
              cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              stripeEventId: event.id,
            }),
            createdAt: nowIso,
          });
        }
        break;
      }

      // 3. Subscription Deleted / Cancelled
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id;
        const workspaceId = stripeSub.metadata?.workspaceId || db.findSubscriptionByStripeCustomerId(customerId || '')?.workspaceId;

        if (workspaceId) {
          const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
          const freePlan = db.getPlanByKey('FREE') || PLANS_CONFIG.FREE;

          // Revert workspace to Free plan on subscription cancellation
          db.updateSubscription(sub.id, {
            planId: freePlan.id,
            planKey: 'FREE',
            status: 'CANCELED',
            cancelAtPeriodEnd: false,
            updatedAt: nowIso,
          });

          db.createAuditLog({
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            organizationId: workspaceId,
            actorUserId: 'stripe_webhook',
            action: 'SUBSCRIPTION_CANCELED_REVERTED_TO_FREE',
            targetResourceType: 'WORKSPACE',
            targetResourceId: workspaceId,
            metadataJson: JSON.stringify({
              stripeSubscriptionId: stripeSub.id,
              stripeEventId: event.id,
            }),
            createdAt: nowIso,
          });
        }
        break;
      }

      // 4. Invoice Paid
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const invAny = inv as any;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        const workspaceId = db.findSubscriptionByStripeCustomerId(customerId || '')?.workspaceId;

        if (workspaceId) {
          const subId = typeof invAny.subscription === 'string'
            ? invAny.subscription
            : invAny.subscription?.id || invAny.parent?.subscription_details?.subscription;

          const invoiceObj: DbInvoice = {
            id: `inv_${inv.id}`,
            workspaceId,
            stripeInvoiceId: inv.id,
            stripeSubscriptionId: subId || undefined,
            stripeCustomerId: customerId,
            number: inv.number || undefined,
            amountPaid: inv.amount_paid,
            amountDue: inv.amount_due,
            currency: (inv.currency || 'usd').toUpperCase(),
            status: 'paid',
            hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
            invoicePdf: inv.invoice_pdf || undefined,
            periodStart: new Date(((inv.period_start || Math.floor(Date.now() / 1000)) * 1000)).toISOString(),
            periodEnd: new Date(((inv.period_end || Math.floor(Date.now() / 1000)) * 1000)).toISOString(),
            paidAt: inv.status_transitions?.paid_at
              ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
              : nowIso,
            createdAt: new Date(inv.created * 1000).toISOString(),
          };

          db.saveInvoice(invoiceObj);

          // Update subscription status to ACTIVE if it was past due
          const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
          if (sub.status !== 'ACTIVE') {
            db.updateSubscription(sub.id, {
              status: 'ACTIVE',
              updatedAt: nowIso,
            });
          }
        }
        break;
      }

      // 5. Invoice Payment Failed
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const invAny = inv as any;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        const workspaceId = db.findSubscriptionByStripeCustomerId(customerId || '')?.workspaceId;

        if (workspaceId) {
          const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
          db.updateSubscription(sub.id, {
            status: 'PAST_DUE',
            updatedAt: nowIso,
          });

          const subId = typeof invAny.subscription === 'string'
            ? invAny.subscription
            : invAny.subscription?.id || invAny.parent?.subscription_details?.subscription;

          const invoiceObj: DbInvoice = {
            id: `inv_${inv.id}`,
            workspaceId,
            stripeInvoiceId: inv.id,
            stripeSubscriptionId: subId || undefined,
            stripeCustomerId: customerId,
            number: inv.number || undefined,
            amountPaid: inv.amount_paid,
            amountDue: inv.amount_due,
            currency: (inv.currency || 'usd').toUpperCase(),
            status: 'open',
            hostedInvoiceUrl: inv.hosted_invoice_url || undefined,
            invoicePdf: inv.invoice_pdf || undefined,
            periodStart: new Date(((inv.period_start || Math.floor(Date.now() / 1000)) * 1000)).toISOString(),
            periodEnd: new Date(((inv.period_end || Math.floor(Date.now() / 1000)) * 1000)).toISOString(),
            createdAt: new Date(inv.created * 1000).toISOString(),
          };
          db.saveInvoice(invoiceObj);

          db.createAuditLog({
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            organizationId: workspaceId,
            actorUserId: 'stripe_webhook',
            action: 'INVOICE_PAYMENT_FAILED',
            targetResourceType: 'WORKSPACE',
            targetResourceId: workspaceId,
            metadataJson: JSON.stringify({
              invoiceId: inv.id,
              amountDue: inv.amount_due,
              stripeEventId: event.id,
            }),
            createdAt: nowIso,
          });
        }
        break;
      }

      default:
        // Ignore unhandled events safely
        break;
    }
  }

  /**
   * Helper for development/test simulation to complete a checkout session
   */
  static simulateCheckoutCompletion(
    workspaceId: string,
    planKey: 'PRO' | 'BUSINESS',
    userId: string
  ): DbSubscription {
    const targetPlan = db.getPlanByKey(planKey) || PLANS_CONFIG.PRO;
    const sub = EntitlementService.getWorkspaceSubscription(workspaceId);
    const now = new Date();
    const nowIso = now.toISOString();

    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const periodEnd = new Date(nextMonth.getTime() - 1).toISOString();

    const updated = db.updateSubscription(sub.id, {
      planId: targetPlan.id,
      planKey: targetPlan.key,
      status: 'ACTIVE',
      billingProvider: 'STRIPE',
      providerCustomerId: sub.providerCustomerId || `cus_sim_${workspaceId}`,
      providerSubscriptionId: `sub_sim_${Date.now()}`,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: nowIso,
    });

    // Create a mock invoice for test history
    const mockInvoice: DbInvoice = {
      id: `inv_sim_${Date.now()}`,
      workspaceId,
      stripeInvoiceId: `in_sim_${Date.now()}`,
      stripeSubscriptionId: updated?.providerSubscriptionId,
      stripeCustomerId: updated?.providerCustomerId,
      number: `INV-${now.getUTCFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      amountPaid: targetPlan.monthlyPrice * 100,
      amountDue: 0,
      currency: 'USD',
      status: 'paid',
      periodStart,
      periodEnd,
      paidAt: nowIso,
      createdAt: nowIso,
    };
    db.saveInvoice(mockInvoice);

    // Ensure usage record exists for period
    db.createOrGetUsageRecord(workspaceId, periodStart, periodEnd);

    db.createAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: workspaceId,
      actorUserId: userId,
      action: 'SUBSCRIPTION_CHECKOUT_COMPLETED',
      targetResourceType: 'WORKSPACE',
      targetResourceId: workspaceId,
      metadataJson: JSON.stringify({
        planKey: targetPlan.key,
        mode: 'simulated_test',
      }),
      createdAt: nowIso,
    });

    return updated!;
  }
}
