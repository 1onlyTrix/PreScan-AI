import { IAuthService, SignInCredentials, SignUpData } from './auth.interface';
import { User, Organization, MembershipRole } from '../types';
import { apiFetch, setStoredToken } from '../lib/api';

export function getAppRedirectUrl(targetPath: string = ''): string {
  let baseUrl = '';

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    baseUrl = import.meta.env.VITE_APP_URL || import.meta.env.APP_URL || '';
  }
  if (!baseUrl && typeof process !== 'undefined' && process.env) {
    baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || '';
  }

  if (!baseUrl && typeof window !== 'undefined' && window.location?.origin) {
    baseUrl = window.location.origin;
  }

  baseUrl = (baseUrl || '').trim();

  if (!baseUrl) {
    baseUrl = 'https://prescan.netlify.app';
  }

  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  baseUrl = baseUrl.replace(/\/+$/, '');

  if (!targetPath) {
    return baseUrl;
  }

  const formattedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return `${baseUrl}${formattedPath}`;
}

export class AuthService implements IAuthService {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  async getCurrentSession(): Promise<any | null> {
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.session || (data.user ? { user: data.user } : null);
    } catch {
      return null;
    }
  }

  async getCurrentOrganization(): Promise<Organization | null> {
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.organization || null;
    } catch {
      return null;
    }
  }

  async getUserRole(organizationId: string): Promise<MembershipRole | null> {
    try {
      const res = await apiFetch(`/api/workspaces/${organizationId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (data.workspace?.role as MembershipRole) || null;
    } catch {
      return null;
    }
  }

  async signUpWithEmail(data: SignUpData): Promise<User> {
    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          email: data.email.trim(),
          password: data.password,
          termsAccepted: true,
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.user) {
        if (resData.sessionToken) {
          setStoredToken(resData.sessionToken);
        }
        return resData.user;
      }

      if (resData.code === 'EMAIL_EXISTS' || (res.status === 400 && resData.error?.includes('already exists'))) {
        throw new Error(resData.error || 'An account with this email already exists. Please log in.');
      }

      throw new Error(resData.error || 'Unable to create your account. Please check your details and try again.');
    } catch (err: any) {
      throw err;
    }
  }

  async signInWithEmail(credentials: SignInCredentials): Promise<User> {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 403 && data.unverified) {
        const unverifiedErr = new Error(data.error || 'Please verify your email before signing in.');
        (unverifiedErr as any).code = 'UNVERIFIED_EMAIL';
        (unverifiedErr as any).unverified = true;
        (unverifiedErr as any).email = credentials.email.trim();
        throw unverifiedErr;
      }
      throw new Error(data.error || 'Invalid email or password. Please check your credentials.');
    }
    return data.user;
  }

  async verifyOtp(email: string, token: string): Promise<User> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (token || '').trim().replace(/\D/g, '');

    if (!cleanEmail) {
      throw new Error('Please provide a valid email address.');
    }

    if (cleanToken.length !== 6) {
      throw new Error('Verification code must be exactly 6 digits.');
    }

    const res = await apiFetch('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: cleanEmail,
        code: cleanToken,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (data.sessionToken) {
        setStoredToken(data.sessionToken);
      }
      if (data.user) {
        return data.user;
      }
    } else {
      if (data.code === 'EXPIRED_CODE') {
        const err: any = new Error('This code has expired. Request a new code.');
        err.code = 'EXPIRED_CODE';
        throw err;
      }
      if (data.code === 'INVALID_CODE') {
        const err: any = new Error('That code is incorrect. Please check your email and try again.');
        err.code = 'INVALID_CODE';
        throw err;
      }
      const err: any = new Error(data.error || 'Verification failed. Please check the code and try again.');
      err.code = data.code;
      throw err;
    }

    throw new Error('Unable to complete email verification. Please try again.');
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = (email || '').trim();
    if (!cleanEmail) {
      throw new Error('Please provide a valid email address.');
    }

    const res = await apiFetch('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        success: true,
        message: data.message || `A verification code has been sent to ${cleanEmail}. Please check your inbox.`,
      };
    }

    if (res.status === 429) {
      const err = new Error(data.error || 'Too many verification requests. Please wait before trying again.');
      (err as any).code = 'RESEND_COOLDOWN';
      (err as any).remainingSeconds = data.remainingSeconds || 60;
      throw err;
    }

    throw new Error(data.error || 'Failed to resend verification code.');
  }

  async signInWithGoogle(): Promise<void> {
    console.log('[Google OAuth] Google authentication is not currently connected to a backend provider.');
    throw new Error('Google sign-in is not configured. Please sign in with email.');
  }

  async signIn(credentials: SignInCredentials): Promise<User> {
    return this.signInWithEmail(credentials);
  }

  async signUp(data: SignUpData): Promise<User> {
    return this.signUpWithEmail(data);
  }

  async signOut(): Promise<void> {
    setStoredToken(null);
    await apiFetch('/api/auth/logout', {
      method: 'POST',
    });
  }

  async resetPassword(email: string): Promise<void> {
    const cleanEmail = (email || '').trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }

    const res = await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to request password reset.');
    }
  }

  async updateUserPassword(newPassword: string): Promise<void> {
    const res = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update password.');
    }
  }

  async updateProfile(updates: Partial<Pick<User, 'fullName' | 'avatarUrl'>>): Promise<User> {
    const res = await apiFetch('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile.');
    }
    return data.user;
  }

  async switchOrganization(organizationId: string): Promise<void> {
    // Workspace switch
  }

  listenToAuthChanges(callback: (event: string, session: any) => void): { unsubscribe: () => void } {
    return { unsubscribe: () => {} };
  }
}

export const authService = new AuthService();

