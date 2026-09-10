import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { db, DbOrganization, DbMembership, DbInvitation, DbAuditLog } from '../db';
import { requireAuth, requireWorkspaceMember, requireWorkspaceRole, generateId, generateSecureToken, sanitizeUser } from '../auth';
import { EmailService } from '../services/email.service';
import { EntitlementService } from '../services/entitlement.service';

const router = Router();

/**
 * GET /api/workspaces
 * List all workspaces the current user belongs to (multi-tenant safe)
 */
router.get('/', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const orgs = db.findOrganizationsByUserId(user.id);
  const memberships = db.findMembershipsByUserId(user.id);

  const workspacesWithDetails = orgs.map((org) => {
    const mem = memberships.find((m) => m.organizationId === org.id);
    const orgMembers = db.findMembershipsByOrg(org.id);
    const owner = org.ownerId ? db.findUserById(org.ownerId) : undefined;

    return {
      ...org,
      role: mem?.role || 'MEMBER',
      joinedAt: mem?.joinedAt,
      memberCount: orgMembers.length,
      owner: owner ? sanitizeUser(owner) : undefined,
    };
  });

  return res.json({ workspaces: workspacesWithDetails, defaultWorkspaceId: user.defaultOrganizationId });
});

/**
 * POST /api/workspaces
 * Create a new workspace (Current user becomes OWNER)
 */
router.post('/', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Workspace name must be at least 2 characters long.', code: 'INVALID_NAME' });
  }

  const now = new Date().toISOString();
  const orgId = generateId('org');
  const cleanName = name.trim();
  const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';
  const slug = `${slugBase}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newWorkspace: DbOrganization = {
    id: orgId,
    name: cleanName,
    slug,
    ownerId: user.id,
    createdById: user.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  db.createOrganization(newWorkspace);

  const membership: DbMembership = {
    id: generateId('mem'),
    organizationId: orgId,
    userId: user.id,
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  db.createMembership(membership);

  // Update default organization ID
  db.updateUser(user.id, { defaultOrganizationId: orgId });

  // Audit Log
  db.createAuditLog({
    id: generateId('audit'),
    organizationId: orgId,
    actorUserId: user.id,
    action: 'WORKSPACE_CREATED',
    targetResourceType: 'WORKSPACE',
    targetResourceId: orgId,
    metadataJson: JSON.stringify({ name: cleanName, slug }),
    createdAt: now,
  });

  return res.status(201).json({
    workspace: {
      ...newWorkspace,
      role: 'OWNER',
      memberCount: 1,
    },
    membership,
  });
});

/**
 * GET /api/workspaces/:id
 * Retrieve specific workspace details
 */
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const orgId = req.params.id;

  const membership = db.findMembership(orgId, user.id);
  if (!membership) {
    return res.status(403).json({
      error: 'You do not have permission to access this workspace.',
      code: 'FORBIDDEN_WORKSPACE_ACCESS',
    });
  }

  const org = db.findOrganizationById(orgId);
  if (!org || org.status === 'DEACTIVATED') {
    return res.status(404).json({ error: 'Workspace not found.', code: 'WORKSPACE_NOT_FOUND' });
  }

  const members = db.findMembershipsByOrg(orgId);
  const owner = org.ownerId ? db.findUserById(org.ownerId) : undefined;

  return res.json({
    workspace: {
      ...org,
      role: membership.role,
      memberCount: members.length,
      owner: owner ? sanitizeUser(owner) : undefined,
    },
  });
});

/**
 * PUT /api/workspaces/:id
 * Update workspace settings (Only OWNER or ADMIN)
 */
router.put('/:id', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), (req: Request, res: Response) => {
  const user = req.user!;
  const org = req.workspace!;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Workspace name must be at least 2 characters long.', code: 'INVALID_NAME' });
  }

  const cleanName = name.trim();
  const updatedOrg = db.updateOrganization(org.id, { name: cleanName });

  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: user.id,
    action: 'WORKSPACE_UPDATED',
    targetResourceType: 'WORKSPACE',
    targetResourceId: org.id,
    metadataJson: JSON.stringify({ oldName: org.name, newName: cleanName }),
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, workspace: updatedOrg });
});

/**
 * POST /api/workspaces/:id/switch
 * Set active workspace as user's default workspace
 */
router.post('/:id/switch', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const orgId = req.params.id;

  const membership = db.findMembership(orgId, user.id);
  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this workspace.', code: 'FORBIDDEN_WORKSPACE_ACCESS' });
  }

  db.updateUser(user.id, { defaultOrganizationId: orgId });

  const org = db.findOrganizationById(orgId);

  return res.json({
    success: true,
    activeWorkspaceId: orgId,
    workspace: org ? { ...org, role: membership.role } : undefined,
  });
});

/**
 * GET /api/workspaces/:id/members
 * List all members of a workspace
 */
router.get('/:id/members', requireAuth, requireWorkspaceMember, (req: Request, res: Response) => {
  const org = req.workspace!;
  const memberships = db.findMembershipsByOrg(org.id);

  const memberList = memberships.map((mem) => {
    const user = db.findUserById(mem.userId);
    return {
      id: mem.id,
      userId: mem.userId,
      role: mem.role,
      status: mem.status || 'ACTIVE',
      joinedAt: mem.joinedAt,
      user: user ? sanitizeUser(user) : { id: mem.userId, email: 'unknown', displayName: 'User', fullName: 'User' },
      isOwner: org.ownerId === mem.userId,
    };
  });

  return res.json({ members: memberList });
});

/**
 * DELETE /api/workspaces/:id/members/:memberUserId
 * Remove a member from the workspace (OWNER or ADMIN)
 */
router.delete('/:id/members/:memberUserId', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), (req: Request, res: Response) => {
  const actor = req.user!;
  const actorRole = req.membership!.role;
  const org = req.workspace!;
  const targetUserId = req.params.memberUserId;

  if (targetUserId === org.ownerId) {
    return res.status(400).json({ error: 'Workspace Owner cannot be removed. Transfer ownership first.', code: 'OWNER_REMOVAL_FORBIDDEN' });
  }

  const targetMembership = db.findMembership(org.id, targetUserId);
  if (!targetMembership) {
    return res.status(404).json({ error: 'Member not found in workspace.', code: 'MEMBER_NOT_FOUND' });
  }

  // Admin cannot remove another Admin or Owner
  if (actorRole === 'ADMIN' && (targetMembership.role === 'ADMIN' || targetMembership.role === 'OWNER')) {
    return res.status(403).json({ error: 'Admins cannot remove other Admins or the Workspace Owner.', code: 'INSUFFICIENT_PERMISSIONS' });
  }

  db.deleteMembership(org.id, targetUserId);

  const targetUser = db.findUserById(targetUserId);

  // Audit Log
  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: actor.id,
    action: 'MEMBER_REMOVED',
    targetResourceType: 'USER',
    targetResourceId: targetUserId,
    metadataJson: JSON.stringify({ email: targetUser?.email, role: targetMembership.role }),
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, message: 'Member removed successfully.' });
});

/**
 * PATCH /api/workspaces/:id/members/:memberUserId/role
 * Change role of a workspace member (OWNER or ADMIN)
 */
router.patch('/:id/members/:memberUserId/role', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), (req: Request, res: Response) => {
  const actor = req.user!;
  const actorRole = req.membership!.role;
  const org = req.workspace!;
  const targetUserId = req.params.memberUserId;
  const { role } = req.body;

  if (!role || (role !== 'ADMIN' && role !== 'MEMBER')) {
    return res.status(400).json({ error: 'Role must be either ADMIN or MEMBER.', code: 'INVALID_ROLE' });
  }

  if (targetUserId === org.ownerId) {
    return res.status(400).json({ error: 'Owner role cannot be changed directly. Use transfer ownership.', code: 'OWNER_ROLE_CHANGE_FORBIDDEN' });
  }

  const targetMembership = db.findMembership(org.id, targetUserId);
  if (!targetMembership) {
    return res.status(404).json({ error: 'Member not found in workspace.', code: 'MEMBER_NOT_FOUND' });
  }

  // Admin cannot change role of another Admin or Owner
  if (actorRole === 'ADMIN' && (targetMembership.role === 'ADMIN' || targetMembership.role === 'OWNER')) {
    return res.status(403).json({ error: 'Admins cannot modify roles of other Admins or the Workspace Owner.', code: 'INSUFFICIENT_PERMISSIONS' });
  }

  const oldRole = targetMembership.role;
  const updatedMembership = db.updateMembership(targetMembership.id, { role });

  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: actor.id,
    action: 'MEMBER_ROLE_CHANGED',
    targetResourceType: 'USER',
    targetResourceId: targetUserId,
    metadataJson: JSON.stringify({ oldRole, newRole: role }),
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, membership: updatedMembership });
});

/**
 * POST /api/workspaces/:id/transfer-ownership
 * Transfer workspace ownership to another active member (OWNER only)
 */
router.post('/:id/transfer-ownership', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER']), (req: Request, res: Response) => {
  const currentOwner = req.user!;
  const org = req.workspace!;
  const { newOwnerUserId } = req.body;

  if (!newOwnerUserId || typeof newOwnerUserId !== 'string') {
    return res.status(400).json({ error: 'Target new owner user ID is required.', code: 'INVALID_TARGET_USER' });
  }

  if (newOwnerUserId === currentOwner.id) {
    return res.status(400).json({ error: 'You are already the Workspace Owner.', code: 'ALREADY_OWNER' });
  }

  const targetMembership = db.findMembership(org.id, newOwnerUserId);
  if (!targetMembership || targetMembership.status === 'SUSPENDED') {
    return res.status(404).json({ error: 'Target user is not an active member of this workspace.', code: 'MEMBER_NOT_FOUND' });
  }

  const currentOwnerMembership = db.findMembership(org.id, currentOwner.id);

  // 1. Set organization ownerId
  db.updateOrganization(org.id, { ownerId: newOwnerUserId });

  // 2. Promote target member to OWNER
  db.updateMembership(targetMembership.id, { role: 'OWNER' });

  // 3. Demote current owner to ADMIN
  if (currentOwnerMembership) {
    db.updateMembership(currentOwnerMembership.id, { role: 'ADMIN' });
  }

  // Audit Log
  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: currentOwner.id,
    action: 'OWNERSHIP_TRANSFERRED',
    targetResourceType: 'USER',
    targetResourceId: newOwnerUserId,
    metadataJson: JSON.stringify({ previousOwnerId: currentOwner.id, newOwnerId: newOwnerUserId }),
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, message: 'Workspace ownership transferred successfully.' });
});

/**
 * POST /api/workspaces/:id/leave
 * Member leaves workspace (OWNER cannot leave without transferring ownership)
 */
router.post('/:id/leave', requireAuth, requireWorkspaceMember, (req: Request, res: Response) => {
  const user = req.user!;
  const org = req.workspace!;
  const membership = req.membership!;

  if (membership.role === 'OWNER' || org.ownerId === user.id) {
    return res.status(400).json({
      error: 'Workspace Owner cannot leave the workspace. You must transfer ownership to another team member first.',
      code: 'OWNER_LEAVE_FORBIDDEN',
    });
  }

  db.deleteMembership(org.id, user.id);

  // Reset default organization if needed
  if (user.defaultOrganizationId === org.id) {
    const remainingOrgs = db.findOrganizationsByUserId(user.id);
    const nextOrgId = remainingOrgs.length > 0 ? remainingOrgs[0].id : undefined;
    db.updateUser(user.id, { defaultOrganizationId: nextOrgId });
  }

  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: user.id,
    action: 'MEMBER_LEFT',
    targetResourceType: 'USER',
    targetResourceId: user.id,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, message: 'You have left the workspace.' });
});

/**
 * GET /api/workspaces/:id/invitations
 * List pending invitations for a workspace (OWNER or ADMIN)
 */
router.get('/:id/invitations', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), (req: Request, res: Response) => {
  const org = req.workspace!;
  const invitations = db.findInvitationsByOrg(org.id);

  const safeInvitations = invitations.map((inv) => {
    const inviter = db.findUserById(inv.invitedById);
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
      invitedBy: inviter ? sanitizeUser(inviter) : undefined,
    };
  });

  return res.json({ invitations: safeInvitations });
});

/**
 * POST /api/workspaces/:id/invitations
 * Invite a new member by email (OWNER or ADMIN)
 */
router.post('/:id/invitations', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const inviter = req.user!;
  const org = req.workspace!;
  const { email, role = 'MEMBER' } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.', code: 'INVALID_EMAIL' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

  // 1. Check workspace plan seat capacity
  const seatCheck = EntitlementService.canAddMember(org.id);
  if (!seatCheck.allowed) {
    return res.status(403).json({
      error: seatCheck.reason,
      code: seatCheck.errorCode || 'MEMBER_LIMIT_REACHED',
      currentCount: seatCheck.currentCount,
      maxMembers: seatCheck.maxMembers,
    });
  }

  // 2. Check if user is already a member of this workspace
  const existingUser = db.findUserByEmail(cleanEmail);
  if (existingUser) {
    const existingMembership = db.findMembership(org.id, existingUser.id);
    if (existingMembership) {
      return res.status(400).json({
        error: `${cleanEmail} is already a member of this workspace.`,
        code: 'ALREADY_MEMBER',
      });
    }
  }

  // 3. Check for active pending invitation
  const existingInv = db.findActiveInvitationByEmail(org.id, cleanEmail);
  if (existingInv) {
    return res.status(400).json({
      error: `An active invitation has already been sent to ${cleanEmail}. You can resend it from the pending invitations list.`,
      code: 'INVITATION_ALREADY_EXISTS',
    });
  }

  // 4. Generate raw token & SHA-256 token hash
  const rawToken = generateSecureToken(32);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const newInvitation: DbInvitation = {
    id: generateId('inv'),
    organizationId: org.id,
    email: cleanEmail,
    role: assignedRole,
    tokenHash,
    invitedById: inviter.id,
    status: 'PENDING',
    expiresAt,
    createdAt: now.toISOString(),
  };

  db.createInvitation(newInvitation);

  // Send Invitation Email
  await EmailService.sendWorkspaceInvitation({
    email: cleanEmail,
    inviterName: inviter.fullName || inviter.displayName || inviter.email,
    workspaceName: org.name,
    role: assignedRole,
    invitationToken: rawToken,
    expiresAt,
  });

  // Audit Log
  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: inviter.id,
    action: 'INVITATION_CREATED',
    targetResourceType: 'INVITATION',
    targetResourceId: newInvitation.id,
    metadataJson: JSON.stringify({ email: cleanEmail, role: assignedRole }),
    createdAt: now.toISOString(),
  });

  return res.status(201).json({
    success: true,
    invitation: {
      id: newInvitation.id,
      email: cleanEmail,
      role: assignedRole,
      status: 'PENDING',
      expiresAt,
      createdAt: newInvitation.createdAt,
    },
  });
});

/**
 * POST /api/workspaces/:id/invitations/:invitationId/resend
 * Resend a pending invitation (OWNER or ADMIN)
 */
router.post('/:id/invitations/:invitationId/resend', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const inviter = req.user!;
  const org = req.workspace!;
  const invitationId = req.params.invitationId;

  const inv = db.findInvitationById(invitationId);
  if (!inv || inv.organizationId !== org.id) {
    return res.status(404).json({ error: 'Invitation not found.', code: 'INVITATION_NOT_FOUND' });
  }

  if (inv.status !== 'PENDING') {
    return res.status(400).json({ error: `Cannot resend invitation with status: ${inv.status}.`, code: 'INVALID_INVITATION_STATUS' });
  }

  // Generate new token & extend expiration
  const rawToken = generateSecureToken(32);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.updateInvitation(inv.id, {
    tokenHash,
    expiresAt,
  });

  await EmailService.sendWorkspaceInvitation({
    email: inv.email,
    inviterName: inviter.fullName || inviter.displayName || inviter.email,
    workspaceName: org.name,
    role: inv.role,
    invitationToken: rawToken,
    expiresAt,
  });

  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: inviter.id,
    action: 'INVITATION_RESENT',
    targetResourceType: 'INVITATION',
    targetResourceId: inv.id,
    metadataJson: JSON.stringify({ email: inv.email }),
    createdAt: now.toISOString(),
  });

  return res.json({ success: true, message: 'Invitation resent successfully.' });
});

/**
 * POST /api/workspaces/:id/invitations/:invitationId/cancel
 * Cancel a pending invitation (OWNER or ADMIN)
 */
router.post('/:id/invitations/:invitationId/cancel', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), (req: Request, res: Response) => {
  const actor = req.user!;
  const org = req.workspace!;
  const invitationId = req.params.invitationId;

  const inv = db.findInvitationById(invitationId);
  if (!inv || inv.organizationId !== org.id) {
    return res.status(404).json({ error: 'Invitation not found.', code: 'INVITATION_NOT_FOUND' });
  }

  db.updateInvitation(inv.id, { status: 'CANCELLED' });

  db.createAuditLog({
    id: generateId('audit'),
    organizationId: org.id,
    actorUserId: actor.id,
    action: 'INVITATION_CANCELLED',
    targetResourceType: 'INVITATION',
    targetResourceId: inv.id,
    metadataJson: JSON.stringify({ email: inv.email }),
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, message: 'Invitation cancelled.' });
});

/**
 * GET /api/workspaces/:id/audit-logs
 * Fetch workspace audit logs (OWNER or ADMIN)
 */
router.get('/:id/audit-logs', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER', 'ADMIN']), (req: Request, res: Response) => {
  const org = req.workspace!;
  const rawLogs = db.findAuditLogsByOrg(org.id, 50);

  const logs = rawLogs.map((log) => {
    const actor = db.findUserById(log.actorUserId);
    return {
      ...log,
      actor: actor ? sanitizeUser(actor) : undefined,
    };
  });

  return res.json({ auditLogs: logs });
});

/**
 * DELETE /api/workspaces/:id
 * Delete a workspace permanently (OWNER only)
 */
router.delete('/:id', requireAuth, requireWorkspaceMember, requireWorkspaceRole(['OWNER']), (req: Request, res: Response) => {
  const owner = req.user!;
  const org = req.workspace!;

  const userOrgs = db.findOrganizationsByUserId(owner.id);
  if (userOrgs.length <= 1) {
    return res.status(400).json({ error: 'You cannot delete your only workspace.', code: 'ONLY_WORKSPACE_DELETION_FORBIDDEN' });
  }

  db.deleteOrganization(org.id);

  // Switch user to remaining workspace
  const remaining = userOrgs.filter((o) => o.id !== org.id);
  db.updateUser(owner.id, { defaultOrganizationId: remaining[0].id });

  return res.json({ success: true, message: 'Workspace deleted successfully.' });
});

export default router;
