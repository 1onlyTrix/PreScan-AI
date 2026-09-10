import { User, Organization, MembershipRole, UserProfile } from '../types';

export interface SignInCredentials {
  email: string;
  password?: string;
}

export interface SignUpData {
  email: string;
  fullName: string;
  password?: string;
  organizationName?: string;
}

/**
 * AuthService Contract Boundary
 * Clean authentication abstraction for workspace profile identity.
 */
export interface IAuthService {
  getCurrentUser(): Promise<User | null>;
  getCurrentSession(): Promise<any | null>;
  getCurrentOrganization(): Promise<Organization | null>;
  getUserRole(organizationId: string): Promise<MembershipRole | null>;
  signUpWithEmail(data: SignUpData): Promise<User>;
  signInWithEmail(credentials: SignInCredentials): Promise<User>;
  signInWithGoogle(): Promise<void>;
  signIn(credentials: SignInCredentials): Promise<User>;
  signUp(data: SignUpData): Promise<User>;
  signOut(): Promise<void>;
  verifyOtp(email: string, token: string): Promise<User>;
  resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }>;
  resetPassword(email: string): Promise<void>;
  updateProfile(updates: Partial<Pick<User, 'fullName' | 'avatarUrl'>>): Promise<User>;
  switchOrganization(organizationId: string): Promise<void>;
  listenToAuthChanges(callback: (event: string, session: any) => void): { unsubscribe: () => void };
}

