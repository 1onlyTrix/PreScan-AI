import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Organization, Membership } from '../types';
import { AuthStatus, OnboardingState, AuthContextType, WorkspaceWithRole } from '../types/auth';
import { getStoredWorkspaceId, setStoredWorkspaceId, setStoredToken } from '../lib/api';
import { supabase } from '../supabaseClient';

const DEMO_ONBOARDING_KEY = 'prescan_demo_onboarding_db';
const DEMO_WORKSPACES_KEY = 'prescan_demo_workspaces_db';

interface StoredOnboardingEntry {
  completed: boolean;
  step: number;
  workspaceName?: string;
  creatorType?: string;
  contentTypes?: string[];
  publishFrequency?: string;
  completedAt?: string;
  updatedAt?: string;
}

function getLocalOnboardingDB(): Record<string, StoredOnboardingEntry> {
  try {
    const raw = localStorage.getItem(DEMO_ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalOnboardingDB(data: Record<string, StoredOnboardingEntry>): void {
  try {
    localStorage.setItem(DEMO_ONBOARDING_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

function getLocalWorkspacesDB(): Record<string, Organization[]> {
  try {
    const raw = localStorage.getItem(DEMO_WORKSPACES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalWorkspacesDB(data: Record<string, Organization[]>): void {
  try {
    localStorage.setItem(DEMO_WORKSPACES_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('LOADING');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    const wsDb = getLocalWorkspacesDB();
    const userWorkspaces = wsDb[user.email.toLowerCase()] || [];
    if (userWorkspaces.length > 0) {
      setWorkspaces(userWorkspaces.map(w => ({ ...w, role: 'OWNER' })));
    }
  }, [user]);

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email?.toLowerCase() || '';
        const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.fullName || email.split('@')[0] || 'Creator';
        const supabaseUser: User = {
          id: session.user.id,
          email,
          fullName,
          displayName: fullName,
          emailVerified: !!session.user.email_confirmed_at,
          createdAt: session.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setUser(supabaseUser);
        setStoredToken(session.access_token);

        const wsDb = getLocalWorkspacesDB();
        let userWorkspaces = wsDb[email] || [];
        if (userWorkspaces.length === 0) {
          const defaultWs: Organization = {
            id: `ws_${session.user.id}`,
            name: `${fullName}'s Workspace`,
            slug: 'workspace',
            createdById: session.user.id,
            ownerId: session.user.id,
            memberCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          userWorkspaces = [defaultWs];
          wsDb[email] = userWorkspaces;
          saveLocalWorkspacesDB(wsDb);
        }

        const activeWorkspace = userWorkspaces[0];
        setOrganization(activeWorkspace);
        setStoredWorkspaceId(activeWorkspace.id);
        setWorkspaces(userWorkspaces.map(w => ({ ...w, role: 'OWNER' })));
        setMembership({
          id: `mem_${session.user.id}`,
          userId: session.user.id,
          organizationId: activeWorkspace.id,
          role: 'OWNER',
          joinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setAuthStatus('AUTHENTICATED_READY');
        setIsLoading(false);
        return;
      }

      setUser(null);
      setOrganization(null);
      setMembership(null);
      setWorkspaces([]);
      setOnboarding(null);
      setAuthStatus('UNAUTHENTICATED');
    } catch {
      setUser(null);
      setOrganization(null);
      setMembership(null);
      setWorkspaces([]);
      setOnboarding(null);
      setAuthStatus('UNAUTHENTICATED');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const switchWorkspace = async (workspaceId: string) => {
    const target = workspaces.find(w => w.id === workspaceId);
    if (target) {
      setOrganization(target);
      setStoredWorkspaceId(target.id);
    }
  };

  const createWorkspace = async (name: string): Promise<Organization> => {
    if (!user) throw new Error('Must be logged in to create a workspace.');
    const email = user.email.toLowerCase();
    const wsDb = getLocalWorkspacesDB();
    const newWs: Organization = {
      id: `ws_${Date.now()}`,
      name: name.trim() || 'New Workspace',
      slug: (name.trim() || 'workspace').toLowerCase().replace(/\s+/g, '-'),
      createdById: user.id,
      ownerId: user.id,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentList = wsDb[email] || [];
    const updatedList = [...currentList, newWs];
    wsDb[email] = updatedList;
    saveLocalWorkspacesDB(wsDb);

    setOrganization(newWs);
    setStoredWorkspaceId(newWs.id);
    setWorkspaces(updatedList.map(w => ({ ...w, role: 'OWNER' })));
    return newWs;
  };

  const login = async (credentials: { email: string; password?: string }): Promise<{ unverified?: boolean; email?: string; isCompleted?: boolean }> => {
    const rawEmail = credentials.email.trim();
    if (!rawEmail || !credentials.password) {
      throw new Error('Please enter your email and password.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: rawEmail,
      password: credentials.password,
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('Check your email and confirm your account before logging in.');
    }

    await refreshSession();
    return { unverified: false, isCompleted: true };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
  };

  const signup = async (payload: { fullName?: string; email: string; password?: string; termsAccepted?: boolean }) => {
    const rawEmail = payload.email.trim();
    if (!rawEmail || !payload.password) {
      throw new Error('Please enter an email and password.');
    }

    const { error } = await supabase.auth.signUp({
      email: rawEmail,
      password: payload.password,
      options: {
        data: {
          fullName: payload.fullName,
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
    } finally {
      setUser(null);
      setOrganization(null);
      setMembership(null);
      setWorkspaces([]);
      setOnboarding(null);
      setAuthStatus('UNAUTHENTICATED');
    }
  };

  const verifyEmail = async () => {
    await refreshSession();
  };

  const resendVerification = async (targetEmail?: string) => {
    if (!targetEmail) return { success: false, message: 'Email address is required.' };
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
    });
    if (error) throw error;
    return {
      success: true,
      message: 'Verification email has been sent.',
    };
  };

  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    if (error) throw error;
    return {
      success: true,
      message: `If an account exists with ${email}, password reset instructions have been sent.`,
    };
  };

  const resetPassword = async (payload: { token?: string; newPassword: string }) => {
    const { error } = await supabase.auth.updateUser({
      password: payload.newPassword,
    });
    if (error) throw error;
  };

  const updateOnboardingStep = async (data: Partial<OnboardingState>) => {
    if (!user) return;
    const email = user.email.toLowerCase();
    const onboardingDb = getLocalOnboardingDB();
    const existing = onboardingDb[email] || { completed: false, step: 1 };
    
    onboardingDb[email] = {
      ...existing,
      step: data.step || existing.step,
      creatorType: data.creatorType !== undefined ? data.creatorType : existing.creatorType,
      contentTypes: data.contentTypes !== undefined ? data.contentTypes : existing.contentTypes,
      publishFrequency: data.publishFrequency !== undefined ? data.publishFrequency : existing.publishFrequency,
      workspaceName: data.workspaceName !== undefined ? data.workspaceName : existing.workspaceName,
      updatedAt: new Date().toISOString(),
    };
    saveLocalOnboardingDB(onboardingDb);

    setOnboarding(prev => prev ? { ...prev, ...data, updatedAt: new Date().toISOString() } : null);
  };

  const completeOnboarding = async (payload: {
    workspaceName: string;
    creatorType?: string;
    contentTypes?: string[];
    publishFrequency?: string;
  }) => {
    if (!user) throw new Error('Must be logged in to complete onboarding.');
    const email = user.email.toLowerCase();
    const onboardingDb = getLocalOnboardingDB();

    onboardingDb[email] = {
      completed: true,
      step: 4,
      workspaceName: payload.workspaceName,
      creatorType: payload.creatorType,
      contentTypes: payload.contentTypes,
      publishFrequency: payload.publishFrequency,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveLocalOnboardingDB(onboardingDb);

    const newWs: Organization = {
      id: `ws_${Date.now()}`,
      name: payload.workspaceName.trim() || `${user.fullName || 'Creator'}'s Workspace`,
      slug: (payload.workspaceName.trim() || 'workspace').toLowerCase().replace(/\s+/g, '-'),
      createdById: user.id,
      ownerId: user.id,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const wsDb = getLocalWorkspacesDB();
    wsDb[email] = [newWs];
    saveLocalWorkspacesDB(wsDb);

    setOrganization(newWs);
    setStoredWorkspaceId(newWs.id);
    setWorkspaces([{ ...newWs, role: 'OWNER' }]);
    setMembership({
      id: `mem_${user.id}`,
      userId: user.id,
      organizationId: newWs.id,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setOnboarding({
      userId: user.id,
      step: 4,
      status: 'COMPLETED',
      workspaceName: newWs.name,
      creatorType: payload.creatorType,
      contentTypes: payload.contentTypes,
      publishFrequency: payload.publishFrequency,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setAuthStatus('AUTHENTICATED_READY');
  };

  const updateProfile = async (payload: { displayName: string }) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      fullName: payload.displayName.trim() || user.fullName,
      displayName: payload.displayName.trim() || user.displayName,
      updatedAt: new Date().toISOString(),
    };
    setUser(updatedUser);
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

