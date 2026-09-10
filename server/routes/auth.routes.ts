import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateId,
  requireAuth,
  sanitizeUser,
  rateLimit,
} from '../auth';
import { EmailService } from '../services/email.service';

const router = Router();

// 30 days in milliseconds
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
// OTP expiry: 10 minutes
const OTP_DURATION_MS = 10 * 60 * 1000;
// Verification link token expiry: 24 hours
const VERIFY_TOKEN_DURATION_MS = 24 * 60 * 60 * 1000;
// Password reset token expiry: 1 hour
const RESET_TOKEN_DURATION_MS = 60 * 60 * 1000;

// Rate limiters
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many signup attempts. Please try again in 15 minutes.',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

const resendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: 'Please wait at least 60 seconds before requesting another verification code.',
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please wait before trying again.',
});

/**
 * Helper to compute user's auth status
 */
function getComputedAuthStatus(user: { emailVerified: boolean; status: string }, userId: string) {
  if (user.status === 'SUSPENDED') return 'SUSPENDED';
  const onboarding = db.getOnboarding(userId);
  if (onboarding.status !== 'COMPLETED') return 'AUTHENTICATED_ONBOARDING';
  return 'AUTHENTICATED_READY';
}

/**
 * Generate a cryptographically secure 6-digit OTP and store hashed challenge
 */
function generateAndStoreOtpChallenge(userId: string, email: string) {
  // Real 6-digit code: 100000 to 999999
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = crypto.createHash('sha256').update(rawOtp + salt).digest('hex');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + OTP_DURATION_MS).toISOString();

  const challenge = db.createOtpChallenge({
    id: generateId('otp'),
    userId,
    email: email.toLowerCase(),
    otpHash,
    salt,
    expiresAt,
    attemptCount: 0,
    maxAttempts: 5,
    createdAt: now,
    lastResentAt: now,
  });

  return { rawOtp, challenge, expiresAt };
}

/**
 * POST /api/auth/signup
 */
router.post('/signup', signupLimiter, async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, termsAccepted } = req.body;

    // Validate inputs
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (!termsAccepted) {
      return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if account already exists
    const existingUser = db.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please log in or use password reset.',
        code: 'EMAIL_EXISTS',
      });
    }

    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(password);
    const userId = generateId('usr');

    const newUser = db.createUser({
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      displayName: fullName.trim(),
      emailVerified: true,
      passwordHash: hash,
      passwordSalt: salt,
      status: 'ACTIVE',
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    // Initialize onboarding
    db.updateOnboarding(userId, {
      step: 1,
      status: 'IN_PROGRESS',
    });

    // Create authenticated session
    const sessionToken = generateSecureToken(32);
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    db.createSession({
      token: sessionToken,
      userId,
      expiresAt: sessionExpiresAt,
      createdAt: now,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Set HTTP-only session cookie
    res.cookie('prescan_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS,
      path: '/',
    });

    // Audit log
    db.createAuditLog({
      id: generateId('aud'),
      actorUserId: userId,
      action: 'USER_REGISTERED',
      metadataJson: JSON.stringify({ email: normalizedEmail }),
      ipAddress: req.ip,
      createdAt: now,
    });

    return res.status(201).json({
      user: sanitizeUser(newUser),
      authStatus: 'AUTHENTICATED_ONBOARDING',
      sessionToken,
      message: 'Account created successfully. Directing to workspace onboarding...',
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during signup.' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    let user = db.findUserByEmail(normalizedEmail);

    if (!user || user.status === 'DELETED') {
      return res.status(401).json({
        error: 'Invalid email or password. Please check your credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'This account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid email or password. Please check your credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const now = new Date().toISOString();

    // Ensure user is verified so they can proceed directly
    if (!user.emailVerified) {
      user = db.updateUser(user.id, { emailVerified: true })!;
    }

    // Update lastLoginAt
    db.updateUser(user.id, { lastLoginAt: now });

    // Create session
    const sessionToken = generateSecureToken(32);
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    db.createSession({
      token: sessionToken,
      userId: user.id,
      expiresAt: sessionExpiresAt,
      createdAt: now,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    res.cookie('prescan_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS,
      path: '/',
    });

    // Audit log
    db.createAuditLog({
      id: generateId('aud'),
      actorUserId: user.id,
      action: 'USER_LOGGED_IN',
      ipAddress: req.ip,
      createdAt: now,
    });

    const authStatus = getComputedAuthStatus(user, user.id);
    const onboarding = db.getOnboarding(user.id);

    // Retrieve active organization & membership if any
    let activeOrg = null;
    let activeMembership = null;
    if (user.defaultOrganizationId) {
      activeOrg = db.findOrganizationById(user.defaultOrganizationId) || null;
      if (activeOrg) {
        activeMembership = db.findMembership(activeOrg.id, user.id) || null;
      }
    }

    return res.json({
      user: sanitizeUser(user),
      authStatus,
      onboarding,
      organization: activeOrg,
      membership: activeMembership,
      sessionToken,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    let token = req.cookies?.['prescan_session'];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (token) {
      db.deleteSession(token);
    }
    res.clearCookie('prescan_session', { path: '/' });

    if (req.user) {
      db.createAuditLog({
        id: generateId('aud'),
        actorUserId: req.user.id,
        action: 'USER_LOGGED_OUT',
        ipAddress: req.ip,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Failed to complete logout.' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const authStatus = getComputedAuthStatus(user, user.id);
    const onboarding = db.getOnboarding(user.id);

    let activeOrg = null;
    let activeMembership = null;

    if (user.defaultOrganizationId) {
      activeOrg = db.findOrganizationById(user.defaultOrganizationId) || null;
      if (activeOrg) {
        activeMembership = db.findMembership(activeOrg.id, user.id) || null;
      }
    } else {
      // Find first organization user is member of
      const userOrgs = db.findOrganizationsByUserId(user.id);
      if (userOrgs.length > 0) {
        activeOrg = userOrgs[0];
        activeMembership = db.findMembership(activeOrg.id, user.id) || null;
        db.updateUser(user.id, { defaultOrganizationId: activeOrg.id });
      }
    }

    return res.json({
      user: sanitizeUser(user),
      authStatus,
      onboarding,
      organization: activeOrg,
      membership: activeMembership,
    });
  } catch (err: any) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user session.' });
  }
});

/**
 * POST /api/auth/verify-email
 * Supports 6-digit OTP code or legacy link token
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { code, token, email } = req.body;

    // 1. Verify via 6-digit OTP code
    if (code !== undefined && code !== null && String(code).trim().length > 0) {
      const cleanCode = String(code).trim().replace(/\D/g, ''); // strip any formatting dashes

      if (cleanCode.length !== 6) {
        return res.status(400).json({
          error: 'Verification code must be exactly 6 digits.',
          code: 'INVALID_CODE',
        });
      }

      // Determine target user
      let targetUser = req.user;
      const targetEmail = (email && typeof email === 'string' ? email.trim().toLowerCase() : targetUser?.email)?.toLowerCase();

      if (!targetEmail) {
        return res.status(400).json({
          error: 'Email address is required for verification.',
          code: 'MISSING_EMAIL',
        });
      }

      if (!targetUser) {
        targetUser = db.findUserByEmail(targetEmail);
      }

      if (!targetUser) {
        return res.status(404).json({
          error: 'No account found matching this email address.',
          code: 'USER_NOT_FOUND',
        });
      }

      // If user is already verified
      if (targetUser.emailVerified) {
        const authStatus = getComputedAuthStatus(targetUser, targetUser.id);
        const onboarding = db.getOnboarding(targetUser.id);
        return res.json({
          success: true,
          alreadyVerified: true,
          message: 'Email address is already verified.',
          user: sanitizeUser(targetUser),
          authStatus,
          onboarding,
        });
      }

      // Look up active challenge
      const challenge = db.findActiveOtpChallenge(targetUser.id) || db.findActiveOtpChallenge(targetEmail);

      if (!challenge) {
        return res.status(400).json({
          error: 'No active verification code found. Please request a new code.',
          code: 'INVALID_CODE',
        });
      }

      // Check if challenge expired
      if (new Date(challenge.expiresAt) <= new Date()) {
        return res.status(400).json({
          error: 'The verification code has expired. Please request a new code.',
          code: 'EXPIRED_CODE',
        });
      }

      // Check if max attempts exceeded
      if (challenge.attemptCount >= challenge.maxAttempts) {
        return res.status(400).json({
          error: 'Too many incorrect attempts. Please request a new verification code.',
          code: 'TOO_MANY_ATTEMPTS',
        });
      }

      // Verify SHA-256 hash
      const calculatedHash = crypto.createHash('sha256').update(cleanCode + challenge.salt).digest('hex');

      if (calculatedHash !== challenge.otpHash) {
        // Increment attempt count
        const newAttempts = challenge.attemptCount + 1;
        db.updateOtpChallenge(challenge.id, { attemptCount: newAttempts });

        const remaining = challenge.maxAttempts - newAttempts;
        if (remaining <= 0) {
          return res.status(400).json({
            error: 'Too many incorrect attempts. Please request a new verification code.',
            code: 'TOO_MANY_ATTEMPTS',
          });
        }

        return res.status(400).json({
          error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
          code: 'INVALID_CODE',
          attemptsRemaining: remaining,
        });
      }

      // Code is valid! Mark challenge used
      db.markOtpChallengeUsed(challenge.id);

      // Update user to verified
      const updatedUser = db.updateUser(targetUser.id, { emailVerified: true })!;

      // Ensure active session exists and set cookie
      const sessionToken = generateSecureToken(32);
      const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
      db.createSession({
        token: sessionToken,
        userId: targetUser.id,
        expiresAt: sessionExpiresAt,
        createdAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.cookie('prescan_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/',
      });

      // Audit log
      db.createAuditLog({
        id: generateId('aud'),
        actorUserId: targetUser.id,
        action: 'EMAIL_VERIFIED',
        metadataJson: JSON.stringify({ email: targetUser.email, method: 'OTP' }),
        ipAddress: req.ip,
        createdAt: new Date().toISOString(),
      });

      const authStatus = getComputedAuthStatus(updatedUser, targetUser.id);
      const onboarding = db.getOnboarding(targetUser.id);

      let activeOrg = null;
      let activeMembership = null;
      if (updatedUser.defaultOrganizationId) {
        activeOrg = db.findOrganizationById(updatedUser.defaultOrganizationId) || null;
        if (activeOrg) {
          activeMembership = db.findMembership(activeOrg.id, updatedUser.id) || null;
        }
      }

      return res.json({
        success: true,
        message: 'Email address verified successfully!',
        user: sanitizeUser(updatedUser),
        authStatus,
        onboarding,
        organization: activeOrg,
        membership: activeMembership,
        sessionToken,
      });
    }

    // 2. Verify via URL Token Link
    if (token && typeof token === 'string') {
      const verificationRecord = db.findVerificationToken(token);
      if (!verificationRecord) {
        return res.status(400).json({
          error: 'Invalid verification link. Please request a new verification code.',
          code: 'INVALID_TOKEN',
        });
      }

      if (verificationRecord.usedAt) {
        return res.status(400).json({
          error: 'This verification link has already been used. Please log in.',
          code: 'TOKEN_ALREADY_USED',
        });
      }

      if (new Date(verificationRecord.expiresAt) <= new Date()) {
        return res.status(400).json({
          error: 'This verification link has expired. Please request a new code.',
          code: 'EXPIRED_CODE',
        });
      }

      const user = db.findUserById(verificationRecord.userId);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      db.updateUser(user.id, { emailVerified: true });
      db.markVerificationTokenUsed(token);

      const sessionToken = generateSecureToken(32);
      const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
      db.createSession({
        token: sessionToken,
        userId: user.id,
        expiresAt: sessionExpiresAt,
        createdAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      res.cookie('prescan_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS,
        path: '/',
      });

      const updatedUser = db.findUserById(user.id)!;
      const authStatus = getComputedAuthStatus(updatedUser, user.id);
      const onboarding = db.getOnboarding(user.id);

      return res.json({
        success: true,
        message: 'Email address verified successfully!',
        user: sanitizeUser(updatedUser),
        authStatus,
        onboarding,
        sessionToken,
      });
    }

    return res.status(400).json({
      error: 'Please provide a 6-digit verification code or token.',
      code: 'MISSING_CREDENTIALS',
    });
  } catch (err: any) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
});

/**
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification', resendLimiter, async (req: Request, res: Response) => {
  try {
    let targetUser = req.user;
    const bodyEmail = req.body.email ? String(req.body.email).trim().toLowerCase() : null;

    if (!targetUser && bodyEmail) {
      targetUser = db.findUserByEmail(bodyEmail);
    }

    if (!targetUser) {
      return res.status(400).json({
        error: 'Please provide the email address associated with your account.',
        code: 'MISSING_EMAIL',
      });
    }

    if (targetUser.emailVerified) {
      return res.status(400).json({
        error: 'Your email address is already verified. Please sign in.',
        code: 'ALREADY_VERIFIED',
      });
    }

    // Cooldown check (60s cooldown per challenge resend)
    const existingChallenge = db.findActiveOtpChallenge(targetUser.id);
    if (existingChallenge) {
      const elapsedMs = Date.now() - new Date(existingChallenge.lastResentAt || existingChallenge.createdAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before requesting another code.`,
          code: 'RESEND_COOLDOWN',
          remainingSeconds,
        });
      }
    }

    // Generate fresh 6-digit OTP
    const { rawOtp } = generateAndStoreOtpChallenge(targetUser.id, targetUser.email);

    // Also update verification token link
    const verifyToken = generateSecureToken(32);
    const verifyExpiresAt = new Date(Date.now() + VERIFY_TOKEN_DURATION_MS).toISOString();
    db.createVerificationToken({
      token: verifyToken,
      userId: targetUser.id,
      email: targetUser.email,
      expiresAt: verifyExpiresAt,
      createdAt: new Date().toISOString(),
    });

    // Send email
    await EmailService.sendVerificationOtp({
      email: targetUser.email,
      code: rawOtp,
      expiresInMinutes: 10,
      userName: targetUser.fullName || targetUser.displayName,
    });

    return res.json({
      success: true,
      message: `A new 6-digit verification code has been sent to ${targetUser.email}.`,
    });
  } catch (err: any) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please enter your email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(normalizedEmail);

    const successResponse = {
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions shortly.',
    };

    if (!user || user.status !== 'ACTIVE') {
      return res.json(successResponse);
    }

    const resetToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS).toISOString();
    const now = new Date().toISOString();

    db.createPasswordResetToken({
      token: resetToken,
      userId: user.id,
      expiresAt,
      createdAt: now,
    });

    const baseUrl = req.protocol + '://' + req.get('host');
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    await EmailService.sendPasswordReset({
      email: user.email,
      resetUrl,
      expiresInMinutes: 60,
      userName: user.fullName || user.displayName,
    });

    db.createAuditLog({
      id: generateId('aud'),
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      ipAddress: req.ip,
      createdAt: now,
    });

    return res.json(successResponse);
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

/**
 * GET /api/auth/validate-reset-token
 */
router.get('/validate-reset-token', async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || '');
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Reset token is required.' });
    }

    const record = db.findPasswordResetToken(token);
    if (!record) {
      return res.status(400).json({ valid: false, error: 'Invalid password reset link.' });
    }

    if (record.usedAt) {
      return res.status(400).json({ valid: false, error: 'This password reset link has already been used.' });
    }

    if (new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({ valid: false, error: 'This password reset link has expired.' });
    }

    const user = db.findUserById(record.userId);
    if (!user) {
      return res.status(400).json({ valid: false, error: 'Associated user account not found.' });
    }

    return res.json({
      valid: true,
      email: user.email,
    });
  } catch (err: any) {
    console.error('Validate reset token error:', err);
    return res.status(500).json({ valid: false, error: 'Failed to validate reset token.' });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const record = db.findPasswordResetToken(token);
    if (!record || record.usedAt || new Date(record.expiresAt) <= new Date()) {
      return res.status(400).json({
        error: 'This password reset link is invalid or has expired. Please request a new link.',
      });
    }

    const user = db.findUserById(record.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    db.updateUser(user.id, {
      passwordHash: hash,
      passwordSalt: salt,
    });

    db.markPasswordResetTokenUsed(token);

    // Invalidate all existing sessions for security
    db.deleteUserSessions(user.id);
    res.clearCookie('prescan_session');

    db.createAuditLog({
      id: generateId('aud'),
      actorUserId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      ipAddress: req.ip,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

/**
 * GET /api/auth/dev/latest-email
 * Returns the most recent verification or reset token for testing in dev
 */
router.get('/dev/latest-email', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production.' });
  }
  const email = String(req.query.email || '');
  const type = req.query.type as 'VERIFY_EMAIL' | 'RESET_PASSWORD' | undefined;
  const mail = email ? db.getLatestMailFor(email, type) : undefined;
  return res.json({ mail: mail || null });
});

export default router;
