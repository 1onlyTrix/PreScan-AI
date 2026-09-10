import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Organization, Membership } from '../types';
import { AuthStatus, OnboardingState, AuthContextType, WorkspaceWithRole } from '../types/auth';
import { getStoredWorkspaceId, setStoredWorkspaceId, setStoredToken } from '../lib/api';
import { supabase } from '../supabaseClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Resolve persistent onboarding state for a Supabase user.
 * Reads user_metadata from Supabase Auth and optionally checks the profiles table.
 */
async function resolvePersistentOnboarding(sbUser: any): Promise<{
  onboarding: OnboardingState;
  isCompleted: boolean;
  workspaceName: string;
}> {
  const meta = sbUser.user_metadata || {};
  let isCompleted = meta.onboarding_completed === true;
  let step = typeof meta.onboarding_step === 'number' ? meta.onboarding_step : (isCompleted ? 4 : 1);
  let workspaceName = meta.workspace_name;
  let creatorType = meta.creator_type;
  let contentTypes = meta.content_types;
  let publishFrequency = meta.publish_frequency;
  let completedAt = meta.completed_at;

  // Check Supabase 'profiles' table if accessible
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, workspace_name, creator_type, content_types, publish_frequency, completed_at, onboarding_step')
      .eq('id', sbUser.id)
      .maybeSingle();

    if (data && !error) {
      if (typeof data.onboarding_completed === 'boolean') {
        isCompleted = data.onboarding_completed;
      }
      if (typeof data.onboarding_step === 'number') {
        step = data.onboarding_step;
      }
      if (data.workspace_name) workspaceName = data.workspace_name;
      if (data.creator_type) creatorType = data.creator_type;
      if (data.content_types) contentTypes = data.content_types;
      if (data.publish_frequency) publishFrequency = data.publish_frequency;
      if (data.completed_at) completedAt = data.completed_at;
    }
  } catch {
    // Database table or RLS check optional; user_metadata is primary source of truth
  }

  const defaultWsName = workspaceName || `${meta.full_name || meta.name || sbUser.email?.split('@')[0] || 'Creator'}'s Workspace`;

  const onboardingState: OnboardingState = {
    userId: sbUser.id,
    step: isCompleted ? 4 : step,
    status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
    workspaceName: defaultWsName,
    creatorType,
    contentTypes,
    publishFrequency,
    completedAt,
    updatedAt: new Date().toISOString(),
  };

  return {
    onboarding: onboardingState,
    isCompleted,
    workspaceName: defaultWsName,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('LOADING');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncUserState = useCallback(async (session: any) => {
    if (!session || !session.user) {
      setUser(null);
      setOrganization(null);
      setMembership(null);
      setWorkspaces([]);
      setOnboarding(null);
      setStoredToken(null);
      setAuthStatus('UNAUTHENTICATED');
      setIsLoading(false);
      return;
    }

    const sbUser = session.user;
    const email = (sbUser.email || '').toLowerCase();
    const displayName = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0] || 'Creator';

    const authenticatedUser: User = {
      id: sbUser.id,
      email: email,
      fullName: displayName,
      displayName: displayName,
      emailVerified: Boolean(sbUser.email_confirmed_at),
      createdAt: sbUser.created_at || new Date().toISOString(),
      updatedAt: sbUser.updated_at || new Date().toISOString(),
    };

    setUser(authenticatedUser);
    setStoredToken(session.access_token || null);

    const { onboarding: resolvedOnboarding, isCompleted, workspaceName } = await resolvePersistentOnboarding(sbUser);
    setOnboarding(resolvedOnboarding);

    const wsId = `ws_${sbUser.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userWorkspace: Organization = {
      id: wsId,
      name: workspaceName,
      slug: workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdById: sbUser.id,
      ownerId: sbUser.id,
      memberCount: 1,
      createdAt: sbUser.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrganization(userWorkspace);
    setStoredWorkspaceId(userWorkspace.id);
    setWorkspaces([{ ...userWorkspace, role: 'OWNER' }]);
    setMembership({
      id: `mem_${sbUser.id}`,
      userId: sbUser.id,
      organizationId: userWorkspace.id,
      role: 'OWNER',
      joinedAt: sbUser.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (isCompleted) {
      setAuthStatus('AUTHENTICATED_READY');
    } else {
      setAuthStatus('AUTHENTICATED_ONBOARDING');
    }
    setIsLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        await syncUserState(null);
      } else {
        await syncUserState(session);
      }
    } catch {
      await syncUserState(null);
    }
  }, [syncUserState]);

  useEffect(() => {
    // Initial session load
    refreshSession();

    // Listen to Supabase auth state changes (OAuth redirects, token refreshes, sign in, sign out)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      await syncUserState(session);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshSession, syncUserState]);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    const wsId = `ws_${user.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const wsName = onboarding?.workspaceName || `${user.fullName}'s Workspace`;
    const defaultWs: Organization = {
      id: wsId,
      name: wsName,
      slug: wsName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdById: user.id,
      ownerId: user.id,
      memberCount: 1,
      createdAt: user.createdAt,
      updatedAt: new Date().toISOString(),
    };
    setWorkspaces([{ ...defaultWs, role: 'OWNER' }]);
  }, [user, onboarding?.workspaceName]);

  const switchWorkspace = async (workspaceId: string) => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (target) {
      setOrganization(target);
      setStoredWorkspaceId(target.id);
    }
  };

  const createWorkspace = async (name: string): Promise<Organization> => {
    if (!user) throw new Error('Must be logged in to create a workspace.');
    const newWs: Organization = {
      id: `ws_${Date.now()}`,
      name: name.trim() || 'New Workspace',
      slug: (name.trim() || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdById: user.id,
      ownerId: user.id,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrganization(newWs);
    setStoredWorkspaceId(newWs.id);
    setWorkspaces((prev) => [...prev, { ...newWs, role: 'OWNER' }]);
    return newWs;
  };

  const login = async (credentials: {
    email: string;
    password?: string;
  }): Promise<{ unverified?: boolean; email?: string; isCompleted?: boolean }> => {
    const rawEmail = credentials.email.trim();
    if (!rawEmail) {
      throw new Error('Please enter your email.');
    }
    if (!credentials.password) {
      throw new Error('Please enter your password.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: rawEmail,
      password: credentials.password,
    });

    if (error) {
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error('Check your email and confirm your account before logging in.');
    }

    await syncUserState(data.session);

    const isCompleted = data.user.user_metadata?.onboarding_completed === true;
    return {
      unverified: false,
      isCompleted,
      email: data.user.email,
    };
  };

  const loginWithGoogle = async (): Promise<void> => {
    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      throw error;
    }
  };

  const signup = async (payload: {
    fullName?: string;
    email: string;
    password?: string;
    termsAccepted?: boolean;
  }) => {
    const rawEmail = payload.email.trim();
    if (!rawEmail) {
      throw new Error('Please enter an email address.');
    }
    if (!payload.password) {
      throw new Error('Please enter a password.');
    }

    const fullName = payload.fullName?.trim() || rawEmail.split('@')[0] || 'Creator';

    const { data, error } = await supabase.auth.signUp({
      email: rawEmail,
      password: payload.password,
      options: {
        data: {
          full_name: fullName,
          onboarding_completed: false,
          onboarding_step: 1,
        },
      },
    });

    if (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setStoredToken(null);
      setStoredWorkspaceId(null);
    } catch {
      // Ignore signOut cleanup errors
    } finally {
      setUser(null);
      setOrganization(null);
      setMembership(null);
      setWorkspaces([]);
      setOnboarding(null);
      setAuthStatus('UNAUTHENTICATED');
    }
  };

  const verifyEmail = async (payload: string | { code?: string; token?: string; email?: string }) => {
    let email = '';
    let token = '';

    if (typeof payload === 'string') {
      token = payload.trim();
    } else {
      email = payload.email?.trim() || '';
      token = payload.code?.trim() || payload.token?.trim() || '';
    }

    if (!email && user?.email) {
      email = user.email;
    }

    if (!email || !token) {
      throw new Error('Email address and verification code are required.');
    }

    // Attempt OTP verification with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) {
      const { data: retryData, error: retryError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (retryError) {
        throw retryError;
      }
      if (retryData.session) {
        await syncUserState(retryData.session);
      }
      return;
    }

    if (data.session) {
      await syncUserState(data.session);
    }
  };

  const resendVerification = async (targetEmail?: string) => {
    const email = targetEmail?.trim() || user?.email;
    if (!email) {
      throw new Error('Please provide an email address.');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `A fresh verification link has been sent to ${email}. Please check your inbox.`,
    };
  };

  const forgotPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }

    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `Password reset instructions sent to ${cleanEmail}. Please check your inbox.`,
    };
  };

  const resetPassword = async (payload: { token?: string; newPassword: string }) => {
    if (!payload.newPassword) {
      throw new Error('Please provide a new password.');
    }

    const { error } = await supabase.auth.updateUser({
      password: payload.newPassword,
    });

    if (error) {
      throw error;
    }
  };

  const updateOnboardingStep = async (data: Partial<OnboardingState>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const sbUser = session.user;

    const metaUpdates: Record<string, any> = {
      ...(data.step !== undefined ? { onboarding_step: data.step } : {}),
      ...(data.creatorType !== undefined ? { creator_type: data.creatorType } : {}),
      ...(data.contentTypes !== undefined ? { content_types: data.contentTypes } : {}),
      ...(data.publishFrequency !== undefined ? { publish_frequency: data.publishFrequency } : {}),
      ...(data.workspaceName !== undefined ? { workspace_name: data.workspaceName } : {}),
    };

    // Update Supabase user_metadata
    await supabase.auth.updateUser({ data: metaUpdates }).catch(() => {});

    // Update Supabase profiles table if it exists
    try {
      await supabase.from('profiles').upsert({
        id: sbUser.id,
        ...metaUpdates,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Profile table optional
    }

    setOnboarding((prev) => (prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null));
  };

  const completeOnboarding = async (payload: {
    workspaceName: string;
    creatorType?: string;
    contentTypes?: string[];
    publishFrequency?: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Must be logged in to complete onboarding.');
    }
    const sbUser = session.user;

    const completedAt = new Date().toISOString();
    const updatePayload = {
      onboarding_completed: true,
      onboarding_step: 4,
      workspace_name: payload.workspaceName.trim(),
      creator_type: payload.creatorType,
      content_types: payload.contentTypes,
      publish_frequency: payload.publishFrequency,
      completed_at: completedAt,
    };

    // 1. Update Supabase Auth user_metadata (persistent in Supabase Auth across sessions and devices)
    const { error: metaError } = await supabase.auth.updateUser({
      data: updatePayload,
    });
    if (metaError) {
      console.warn('Notice updating user metadata:', metaError.message);
    }

    // 2. Try updating Supabase profiles table if present
    try {
      await supabase.from('profiles').upsert({
        id: sbUser.id,
        ...updatePayload,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Optional profiles table
    }

    const wsId = `ws_${sbUser.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newWs: Organization = {
      id: wsId,
      name: payload.workspaceName.trim() || `${user?.fullName || 'Creator'}'s Workspace`,
      slug: (payload.workspaceName.trim() || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdById: sbUser.id,
      ownerId: sbUser.id,
      memberCount: 1,
      createdAt: completedAt,
      updatedAt: completedAt,
    };

    setOrganization(newWs);
    setStoredWorkspaceId(newWs.id);
    setWorkspaces([{ ...newWs, role: 'OWNER' }]);
    setMembership({
      id: `mem_${sbUser.id}`,
      userId: sbUser.id,
      organizationId: newWs.id,
      role: 'OWNER',
      joinedAt: completedAt,
      updatedAt: completedAt,
    });

    setOnboarding({
      userId: sbUser.id,
      step: 4,
      status: 'COMPLETED',
      workspaceName: newWs.name,
      creatorType: payload.creatorType,
      contentTypes: payload.contentTypes,
      publishFrequency: payload.publishFrequency,
      completedAt,
      updatedAt: completedAt,
    });

    setAuthStatus('AUTHENTICATED_READY');
  };

  const updateProfile = async (payload: { displayName: string }) => {
    if (!user) return;
    const cleanName = payload.displayName.trim();
    if (!cleanName) return;

    await supabase.auth.updateUser({
      data: { full_name: cleanName },
    }).catch(() => {});

    setUser((prev) => (prev ? { ...prev, fullName: cleanName, displayName: cleanName, updatedAt: new Date().toISOString() } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        membership,
        workspaces,
        onboarding,
        authStatus,
        isLoading,
        login,
        loginWithGoogle,
        signInWithGoogle: loginWithGoogle,
        signup,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        updateOnboardingStep,
        completeOnboarding,
        refreshSession,
        refreshWorkspaces,
        switchWorkspace,
        createWorkspace,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

