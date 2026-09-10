import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth, verifyPassword, hashPassword, sanitizeUser, generateId } from '../auth';

const router = Router();

/**
 * PUT /api/user/profile
 * Update user display name / details
 */
router.put('/profile', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const { displayName, fullName } = req.body;

  const newName = (displayName || fullName || '').trim();
  if (!newName || newName.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }

  const updatedUser = db.updateUser(user.id, {
    displayName: newName,
    fullName: newName,
  });

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({
    success: true,
    user: sanitizeUser(updatedUser),
  });
});

/**
 * POST /api/user/change-password
 * Change password while authenticated
 */
router.post('/change-password', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const isCurrentValid = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
  if (!isCurrentValid) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  db.updateUser(user.id, {
    passwordHash: hash,
    passwordSalt: salt,
  });

  db.createAuditLog({
    id: generateId('aud'),
    actorUserId: user.id,
    action: 'PASSWORD_CHANGED',
    ipAddress: req.ip,
    createdAt: new Date().toISOString(),
  });

  return res.json({
    success: true,
    message: 'Password changed successfully.',
  });
});

export default router;
