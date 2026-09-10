import { db } from '../db';
import { generateId } from '../auth';

export interface SendOtpOptions {
  email: string;
  code: string;
  expiresInMinutes?: number;
  userName?: string;
}

export interface SendResetPasswordOptions {
  email: string;
  resetUrl: string;
  expiresInMinutes?: number;
  userName?: string;
}

export interface SendInvitationOptions {
  email: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  invitationToken: string;
  expiresAt: string;
}

export class EmailService {
  /**
   * Send 6-digit email verification OTP
   */
  static async sendVerificationOtp(options: SendOtpOptions): Promise<{ success: boolean; messageId: string }> {
    const { email, code, expiresInMinutes = 10, userName } = options;
    const now = new Date().toISOString();
    const messageId = generateId('msg');

    const subject = `${code} is your PreScan verification code`;
    const greeting = userName ? `Hi ${userName},` : 'Welcome to PreScan,';

    // Log formatted output to server console for dev / test verification
    console.log('\n' + '='.repeat(64));
    console.log(`[PRESCAN EMAIL SERVICE - ${process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}]`);
    console.log(`✉️  TO:        ${email}`);
    console.log(`🔑  OTP CODE:  ${code}`);
    console.log(`⏱️  VALIDITY:  ${expiresInMinutes} minutes (expires at ${new Date(Date.now() + expiresInMinutes * 60 * 1000).toLocaleTimeString()})`);
    console.log(`📋  PURPOSE:   Email Verification for PreScan Creator Account`);
    console.log('='.repeat(64) + '\n');

    // Record in database mailLog
    db.logMail({
      id: messageId,
      to: email,
      subject,
      type: 'VERIFY_EMAIL',
      token: code,
      actionUrl: `/verify-email?email=${encodeURIComponent(email)}&code=${code}`,
      sentAt: now,
    });

    // If third-party email provider is configured (e.g. SMTP / Resend), dispatch here
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'PreScan <auth@prescan.dev>',
            to: [email],
            subject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #171717;">
                <div style="margin-bottom: 24px;">
                  <span style="font-size: 20px; font-weight: 700; color: #171717; letter-spacing: -0.5px;">PreScan</span>
                </div>
                <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #171717;">Verify your email address</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #525252; margin-bottom: 24px;">
                  ${greeting}<br/>
                  Please use the following 6-digit verification code to complete your PreScan account registration:
                </p>
                <div style="background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #171717;">${code}</span>
                </div>
                <p style="font-size: 12px; color: #737373; line-height: 1.5;">
                  This verification code will expire in ${expiresInMinutes} minutes. If you did not request this code, you can safely ignore this email.
                </p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error('Failed to send email via Resend API:', err);
      }
    }

    return { success: true, messageId };
  }

  /**
   * Send Password Reset Link / Email
   */
  static async sendPasswordReset(options: SendResetPasswordOptions): Promise<{ success: boolean; messageId: string }> {
    const { email, resetUrl, expiresInMinutes = 60, userName } = options;
    const now = new Date().toISOString();
    const messageId = generateId('msg');
    const subject = 'Reset your PreScan password';
    const greeting = userName ? `Hi ${userName},` : 'Hello,';

    console.log('\n' + '='.repeat(64));
    console.log(`[PRESCAN EMAIL SERVICE - ${process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}]`);
    console.log(`✉️  TO:        ${email}`);
    console.log(`🔗  RESET URL: ${resetUrl}`);
    console.log(`⏱️  VALIDITY:  ${expiresInMinutes} minutes`);
    console.log(`📋  PURPOSE:   Password Reset for PreScan Account`);
    console.log('='.repeat(64) + '\n');

    db.logMail({
      id: messageId,
      to: email,
      subject,
      type: 'RESET_PASSWORD',
      token: resetUrl,
      actionUrl: resetUrl,
      sentAt: now,
    });

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'PreScan <security@prescan.dev>',
            to: [email],
            subject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #171717;">
                <div style="margin-bottom: 24px;">
                  <span style="font-size: 20px; font-weight: 700; color: #171717;">PreScan</span>
                </div>
                <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 12px;">Reset your password</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #525252; margin-bottom: 24px;">
                  ${greeting}<br/>
                  We received a request to reset the password for your PreScan workspace. Click the button below to choose a new password:
                </p>
                <div style="margin-bottom: 24px; text-align: center;">
                  <a href="${resetUrl}" style="display: inline-block; background: #171717; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 12px; color: #737373;">
                  This link expires in ${expiresInMinutes} minutes. If you did not request a password reset, no action is needed.
                </p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error('Failed to send password reset via Resend API:', err);
      }
    }

    return { success: true, messageId };
  }

  /**
   * Send Workspace Member Invitation Email
   */
  static async sendWorkspaceInvitation(options: SendInvitationOptions): Promise<{ success: boolean; messageId: string }> {
    const { email, inviterName, workspaceName, role, invitationToken, expiresAt } = options;
    const now = new Date().toISOString();
    const messageId = generateId('msg');

    const appUrl = process.env.APP_URL || '';
    const inviteUrl = `${appUrl}/invite/${invitationToken}`;
    const subject = `${inviterName} invited you to join ${workspaceName} on PreScan`;

    console.log('\n' + '='.repeat(64));
    console.log(`[PRESCAN EMAIL SERVICE - ${process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}]`);
    console.log(`✉️  TO:         ${email}`);
    console.log(`🏢  WORKSPACE:  ${workspaceName}`);
    console.log(`👤  INVITER:    ${inviterName}`);
    console.log(`🛡️  ROLE:       ${role}`);
    console.log(`🔗  INVITE URL: ${inviteUrl}`);
    console.log(`⏱️  EXPIRES AT: ${expiresAt}`);
    console.log(`📋  PURPOSE:    Team Member Invitation`);
    console.log('='.repeat(64) + '\n');

    db.logMail({
      id: messageId,
      to: email,
      subject,
      type: 'VERIFY_EMAIL', // Log token for dev testing inspection
      token: invitationToken,
      actionUrl: inviteUrl,
      sentAt: now,
    });

    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'PreScan <team@prescan.dev>',
            to: [email],
            subject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; color: #171717;">
                <div style="margin-bottom: 24px;">
                  <span style="font-size: 20px; font-weight: 700; color: #171717;">PreScan</span>
                </div>
                <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 12px;">You've been invited to join ${workspaceName}</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #525252; margin-bottom: 24px;">
                  ${inviterName} has invited you to collaborate in <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
                </p>
                <div style="margin-bottom: 24px; text-align: center;">
                  <a href="${inviteUrl}" style="display: inline-block; background: #171717; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none;">
                    Accept Invitation
                  </a>
                </div>
                <p style="font-size: 12px; color: #737373;">
                  Or copy and paste this link into your browser: <br/>
                  <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${inviteUrl}</code>
                </p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error('Failed to send workspace invitation via Resend API:', err);
      }
    }

    return { success: true, messageId };
  }
}
