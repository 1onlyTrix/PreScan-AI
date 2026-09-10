import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified, generateId, sanitizeUser } from '../auth';

const router = Router();

/**
 * GET /api/onboarding
 * Get current onboarding state
 */
router.get('/', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const onboarding = db.getOnboarding(user.id);
  return res.json({ onboarding });
});

/**
 * POST /api/onboarding/step
 * Persist incremental progress (Step 1..4)
 */
router.post('/step', requireAuth, requireVerified, (req: Request, res: Response) => {
  const user = req.user!;
  const { step, creatorType, contentTypes, publishFrequency, workspaceName } = req.body;

  if (typeof step !== 'number' || step < 1 || step > 4) {
    return res.status(400).json({ error: 'Valid step number (1-4) is required.' });
  }

  const updates: any = { step };
  if (creatorType !== undefined) updates.creatorType = creatorType;
  if (contentTypes !== undefined) updates.contentTypes = Array.isArray(contentTypes) ? contentTypes : [contentTypes];
  if (publishFrequency !== undefined) updates.publishFrequency = publishFrequency;
  if (workspaceName !== undefined) updates.workspaceName = workspaceName;

  const onboarding = db.updateOnboarding(user.id, updates);
  return res.json({ success: true, onboarding });
});

/**
 * POST /api/onboarding/complete
 * Complete onboarding and provision initial Organization & Owner Membership
 */
router.post('/complete', requireAuth, requireVerified, (req: Request, res: Response) => {
  const user = req.user!;
  const { workspaceName, creatorType, contentTypes, publishFrequency } = req.body;

  const now = new Date().toISOString();

  // Determine workspace name fallback
  const resolvedWorkspaceName =
    (workspaceName && typeof workspaceName === 'string' && workspaceName.trim()) ||
    `${user.fullName || user.displayName || 'Creator'}'s Workspace`;

  // Create slug from name
  const slug = resolvedWorkspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';

  // Check if user already has an organization (idempotency check)
  let org = user.defaultOrganizationId ? db.findOrganizationById(user.defaultOrganizationId) : undefined;

  if (!org) {
    const orgId = generateId('org');
    org = db.createOrganization({
      id: orgId,
      name: resolvedWorkspaceName.trim(),
      slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
      ownerId: user.id,
      createdById: user.id,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    // Create OWNER membership
    db.createMembership({
      id: generateId('mem'),
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update user default org
    db.updateUser(user.id, { defaultOrganizationId: org.id });

    // Log audit
    db.createAuditLog({
      id: generateId('aud'),
      organizationId: org.id,
      actorUserId: user.id,
      action: 'WORKSPACE_CREATED',
      targetResourceType: 'WORKSPACE',
      targetResourceId: org.id,
      metadataJson: JSON.stringify({ name: org.name }),
      ipAddress: req.ip,
      createdAt: now,
    });
  } else {
    // If org exists, update name if specified
    if (workspaceName && typeof workspaceName === 'string' && workspaceName.trim()) {
      org = db.updateOrganization(org.id, { name: workspaceName.trim() }) || org;
    }
  }

  // Finalize onboarding record
  const onboarding = db.updateOnboarding(user.id, {
    step: 4,
    status: 'COMPLETED',
    creatorType: creatorType || undefined,
    contentTypes: contentTypes || undefined,
    publishFrequency: publishFrequency || undefined,
    workspaceName: org.name,
    completedAt: now,
  });

  db.createAuditLog({
    id: generateId('aud'),
    organizationId: org.id,
    actorUserId: user.id,
    action: 'ONBOARDING_COMPLETED',
    ipAddress: req.ip,
    createdAt: now,
  });

  const updatedUser = db.findUserById(user.id)!;
  const membership = db.findMembership(org.id, user.id);

  return res.json({
    success: true,
    user: sanitizeUser(updatedUser),
    authStatus: 'AUTHENTICATED_READY',
    organization: org,
    membership,
    onboarding,
  });
});

export default router;
