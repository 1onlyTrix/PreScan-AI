import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { db, DbMembership } from '../db';
import { requireAuth, generateId } from '../auth';
import { EntitlementService } from '../services/entitlement.service';

const router = Router();

/**
 * GET /api/invitations/verify/:token
 * Public endpoint to verify invitation token validity and retrieve workspace details
 */
router.get('/verify/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invitation token is required.', code: 'INVALID_TOKEN' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const invitation = db.findInvitationByTokenHash(tokenHash);

  if (!invitation) {
    return res.status(404).json({ error: 'Invalid or expired invitation token.', code: 'INVITATION_NOT_FOUND' });
  }

  const now = new Date().toISOString();

  if (invitation.status !== 'PENDING' || invitation.expiresAt <= now) {
    if (invitation.status === 'PENDING' && invitation.expiresAt <= now) {
      db.updateInvitation(invitation.id, { status: 'EXPIRED' });
    }
    return res.status(400).json({
      error: 'This invitation has expired or has already been used.',
      code: 'INVITATION_INACTIVE',
      status: invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status,
    });
  }

  const org = db.findOrganizationById(invitation.organizationId);
  if (!org || org.status === 'DEACTIVATED') {
    return res.status(404).json({ error: 'The workspace associated with this invitation no longer exists.', code: 'WORKSPACE_NOT_FOUND' });
  }

  const inviter = db.findUserById(invitation.invitedById);

  return res.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      workspaceId: org.id,
      workspaceName: org.name,
      inviterName: inviter ? (inviter.fullName || inviter.displayName || inviter.email) : 'Team Admin',
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    },
  });
});

/**
 * POST /api/invitations/accept
 * Authenticated endpoint to accept a workspace invitation
 */
router.post('/accept', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invitation token is required.', code: 'INVALID_TOKEN' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const invitation = db.findInvitationByTokenHash(tokenHash);

  if (!invitation) {
    return res.status(404).json({ error: 'Invalid or expired invitation token.', code: 'INVITATION_NOT_FOUND' });
  }

  const now = new Date().toISOString();

  if (invitation.status !== 'PENDING' || invitation.expiresAt <= now) {
    return res.status(400).json({
      error: 'This invitation link has expired or has already been used.',
      code: 'INVITATION_INACTIVE',
    });
  }

  // Strict email verification check
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return res.status(400).json({
      error: `This invitation was issued to ${invitation.email}. You are currently logged in as ${user.email}. Please log into the matching account to accept.`,
      code: 'EMAIL_MISMATCH',
      invitedEmail: invitation.email,
      currentUserEmail: user.email,
    });
  }

  const org = db.findOrganizationById(invitation.organizationId);
  if (!org) {
    return res.status(404).json({ error: 'Workspace no longer exists.', code: 'WORKSPACE_NOT_FOUND' });
  }

  // Check if already a member
  const existingMembership = db.findMembership(org.id, user.id);
  if (existingMembership) {
    db.updateInvitation(invitation.id, {
      status: 'ACCEPTED',
      acceptedAt: now,
    });
    db.updateUser(user.id, { defaultOrganizationId: org.id });
    return res.json({
      success: true,
      message: 'You are already a member of this workspace.',
      workspace: { ...org, role: existingMembership.role },
    });
  }

  // Verify seat capacity before accepting new member
  const activeMembers = db.findMembershipsByOrg(org.id);
  const plan = EntitlementService.getWorkspacePlan(org.id);
  if (activeMembers.length >= plan.maxMembers) {
    return res.status(403).json({
      error: `Workspace has reached the member limit for the ${plan.name} plan (${plan.maxMembers} members). Contact the workspace owner to upgrade.`,
      code: 'MEMBER_LIMIT_REACHED',
    });
  }

  // Create membership
  const newMembership: DbMembership = {
    id: generateId('mem'),
    organizationId: org.id,
    userId: user.id,
    role: invitation.role,
    status: 'ACTIVE',
    invitedBy: invitation.invitedById,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  db.createMembership(newMembership);

  // Update invitation status
  db.updateInvitation(invitation.id, {
    status: 'ACCEPTED',
    acceptedAt: now,
  });

  // Set as default workspace
  db.updateUser(user.id, { defaultOrganizationId: org.id });

  // Audit Log
  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: user.id,
    action: 'MEMBER_JOINED',
    targetResourceType: 'USER',
    targetResourceId: user.id,
    metadataJson: JSON.stringify({ invitationId: invitation.id, role: invitation.role }),
    createdAt: now,
  });

  return res.json({
    success: true,
    message: `Welcome to ${org.name}! You have successfully joined the team.`,
    workspace: { ...org, role: invitation.role },
  });
});

export default router;
