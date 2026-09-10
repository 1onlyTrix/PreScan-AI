import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Organization, Membership } from '../types';
import { AuthStatus, OnboardingState, AuthContextType, WorkspaceWithRole } from '../types/auth';
import { getStoredWorkspaceId, setStoredWorkspaceId, setStoredToken } from '../lib/api';
import { supabase } from '../supabaseClient';

const DEMO_SESSION_KEY = 'prescan_demo_session';
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

      // Check Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        // Check fallback demo session if any
        const rawSession = localStorage.getItem(DEMO_SESSION_KEY);
        if (!rawSession) {
          setUser(null);
          setOrganization(null);
          setMembership(null);
          setWorkspaces([]);
          setOnboarding(null);
          setAuthStatus('UNAUTHENTICATED');
          setIsLoading(false);
          return;
        }

        const parsedSession: User & { isSignupFlow?: boolean } = JSON.parse(rawSession);
        const email = parsedSession.email.toLowerCase();
        const onboardingDb = getLocalOnboardingDB();
        const userOnboarding = onboardingDb[email];

        setUser(parsedSession);
        setStoredToken(`demo_${email}`);

        if (parsedSession.isSignupFlow === true && (!userOnboarding || !userOnboarding.completed)) {
          setOrganization(null);
          setWorkspaces([]);
          setMembership(null);
          setOnboarding({
            userId: parsedSession.id,
            step: userOnboarding?.step || 1,
            status: 'IN_PROGRESS',
            creatorType: userOnboarding?.creatorType,
            contentTypes: userOnboarding?.contentTypes,
            publishFrequency: userOnboarding?.publishFrequency,
            workspaceName: userOnboarding?.workspaceName,
            updatedAt: new Date().toISOString(),
          });
          setAuthStatus('AUTHENTICATED_ONBOARDING');
        } else {
          const wsDb = getLocalWorkspacesDB();
          let userWorkspaces = wsDb[email] || [];
          
          if (userWorkspaces.length === 0) {
            const defaultWs: Organization = {
              id: `ws_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
              name: userOnboarding?.workspaceName || `${parsedSession.fullName || parsedSession.displayName || 'Creator'}'s Workspace`,
              slug: 'workspace',
              createdById: parsedSession.id,
              ownerId: parsedSession.id,
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
            id: `mem_${parsedSession.id}`,
            userId: parsedSession.id,
            organizationId: activeWorkspace.id,
            role: 'OWNER',
            joinedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setOnboarding({
            userId: parsedSession.id,
            step: 4,
            status: 'COMPLETED',
            workspaceName: activeWorkspace.name,
            creatorType: userOnboarding?.creatorType,
            contentTypes: userOnboarding?.contentTypes,
            publishFrequency: userOnboarding?.publishFrequency,
            completedAt: userOnboarding?.completedAt,
            updatedAt: new Date().toISOString(),
          });
          setAuthStatus('AUTHENTICATED_READY');
        }
        setIsLoading(false);
        return;
      }

      // Real Supabase User
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
      setStoredToken(session.access_token);

      const onboardingDb = getLocalOnboardingDB();
      const userOnboarding = onboardingDb[email];
      const wsDb = getLocalWorkspacesDB();
      let userWorkspaces = wsDb[email] || [];

      if (userWorkspaces.length === 0) {
        const defaultWs: Organization = {
          id: `ws_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: userOnboarding?.workspaceName || `${displayName}'s Workspace`,
          slug: 'workspace',
          createdById: authenticatedUser.id,
          ownerId: authenticatedUser.id,
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
        id: `mem_${authenticatedUser.id}`,
        userId: authenticatedUser.id,
        organizationId: activeWorkspace.id,
        role: 'OWNER',
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setOnboarding({
        userId: authenticatedUser.id,
        step: 4,
        status: 'COMPLETED',
        workspaceName: activeWorkspace.name,
        creatorType: userOnboarding?.creatorType,
        contentTypes: userOnboarding?.contentTypes,
        publishFrequency: userOnboarding?.publishFrequency,
        completedAt: userOnboarding?.completedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setAuthStatus('AUTHENTICATED_READY');
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user) {
        refreshSession();
      } else if (!localStorage.getItem(DEMO_SESSION_KEY)) {
        setUser(null);
        setOrganization(null);
        setMembership(null);
        setWorkspaces([]);
        setOnboarding(null);
        setAuthStatus('UNAUTHENTICATED');
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
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
    if (!rawEmail) {
      throw new Error('Please enter your email.');
    }

    const email = rawEmail.toLowerCase();
    const displayName = email.split('@')[0] || 'Creator';

    const demoUser: User & { isSignupFlow?: boolean } = {
      id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: email,
      fullName: displayName,
      displayName: displayName,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSignupFlow: false,
    };

    // Save demo user session in localStorage (password is NEVER stored)
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
    setStoredToken(`demo_${email}`);
    setUser(demoUser);

    const onboardingDb = getLocalOnboardingDB();
    const userOnboarding = onboardingDb[email];

    // Ensure workspace exists for this demo user
    const wsDb = getLocalWorkspacesDB();
    let userWorkspaces = wsDb[email] || [];
    if (userWorkspaces.length === 0) {
      const defaultWs: Organization = {
        id: `ws_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: userOnboarding?.workspaceName || `${displayName}'s Workspace`,
        slug: 'workspace',
        createdById: demoUser.id,
        ownerId: demoUser.id,
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
      id: `mem_${demoUser.id}`,
      userId: demoUser.id,
      organizationId: activeWorkspace.id,
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setOnboarding({
      userId: demoUser.id,
      step: 4,
      status: 'COMPLETED',
      workspaceName: activeWorkspace.name,
      creatorType: userOnboarding?.creatorType,
      contentTypes: userOnboarding?.contentTypes,
      publishFrequency: userOnboarding?.publishFrequency,
      completedAt: userOnboarding?.completedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Login ALWAYS marks session ready for Dashboard
    setAuthStatus('AUTHENTICATED_READY');
    return { unverified: false, isCompleted: true };
  };

  const loginWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) {
      throw error;
    }
  };

  const signup = async (payload: { fullName?: string; email: string; password?: string; termsAccepted?: boolean }) => {
    const rawEmail = payload.email.trim();
    if (!rawEmail) {
      throw new Error('Please enter an email address.');
    }

    const email = rawEmail.toLowerCase();
    const fullName = payload.fullName?.trim() || email.split('@')[0] || 'Creator';

    const demoUser: User & { isSignupFlow?: boolean } = {
      id: `usr_${Date.now()}`,
      email: email,
      fullName: fullName,
      displayName: fullName,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSignupFlow: true,
    };

    // Save demo user session in localStorage (password is NEVER stored)
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
    setStoredToken(`demo_${email}`);
    setUser(demoUser);

    // Initialize in-progress onboarding state for newly registered user
    const onboardingDb = getLocalOnboardingDB();
    onboardingDb[email] = {
      completed: false,
      step: 1,
      workspaceName: `${fullName.split(' ')[0]}'s Workspace`,
      updatedAt: new Date().toISOString(),
    };
    saveLocalOnboardingDB(onboardingDb);

    setOnboarding({
      userId: demoUser.id,
      step: 1,
      status: 'IN_PROGRESS',
      workspaceName: `${fullName.split(' ')[0]}'s Workspace`,
      updatedAt: new Date().toISOString(),
    });
    setOrganization(null);
    setWorkspaces([]);
    setMembership(null);
    setAuthStatus('AUTHENTICATED_ONBOARDING');
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem(DEMO_SESSION_KEY);
      setStoredToken(null);
      setStoredWorkspaceId(null);
    } catch {
      // Ignore signOut errors on client cleanup
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
    // In demo mode, verification immediately succeeds
    setAuthStatus('AUTHENTICATED_ONBOARDING');
  };

  const resendVerification = async (targetEmail?: string) => {
    return {
      success: true,
      message: 'Demo mode: Email verification is bypassed.',
    };
  };

  const forgotPassword = async (email: string) => {
    return {
      success: true,
      message: `Demo mode: Password reset instructions simulated for ${email}.`,
    };
  };

  const resetPassword = async (payload: { token?: string; newPassword: string }) => {
    // In demo mode, reset immediately succeeds
    return;
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

    // Mark session as ready for Dashboard
    try {
      const currentSessionRaw = localStorage.getItem(DEMO_SESSION_KEY);
      if (currentSessionRaw) {
        const parsed = JSON.parse(currentSessionRaw);
        parsed.isSignupFlow = false;
        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(parsed));
      }
    } catch {}

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
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(updatedUser));
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

