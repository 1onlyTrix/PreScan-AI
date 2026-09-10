import React, { useState, useEffect } from 'react';
import { ROUTES } from './routes';
import { useAuth } from '../context/AuthContext';

import { AppShell } from '../components/layout/AppShell';
import { DashboardPage } from '../pages/DashboardPage';
import { NewScanPage } from '../pages/NewScanPage';
import { ScansPage } from '../pages/ScansPage';
import { ScanDetailPage } from '../pages/ScanDetailPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { TeamPage } from '../pages/TeamPage';
import { IntegrationsPage } from '../pages/IntegrationsPage';
import { BillingPage } from '../pages/BillingPage';
import { SettingsPage } from '../pages/SettingsPage';
import { DesignSystemPage } from '../pages/DesignSystemPage';

// Public Marketing Pages
import { PublicLandingPage } from '../pages/PublicLandingPage';
import { PublicFeaturesPage } from '../pages/PublicFeaturesPage';
import { PublicHowItWorksPage } from '../pages/PublicHowItWorksPage';
import { PublicPricingPage } from '../pages/PublicPricingPage';
import { PublicSecurityPage } from '../pages/PublicSecurityPage';
import { PublicAboutPage } from '../pages/PublicAboutPage';
import { PublicContactPage } from '../pages/PublicContactPage';
import { PublicPrivacyPage } from '../pages/PublicPrivacyPage';
import { PublicTermsPage } from '../pages/PublicTermsPage';

// Phase 03 Real Auth & Onboarding Pages
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { AccountSuspendedPage } from '../pages/AccountSuspendedPage';
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const Router: React.FC = () => {
  const { authStatus, isLoading } = useAuth();

  const getInitialRoute = (): string => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (pathname && pathname !== '/') {
        return `${pathname}${search}${hash}`;
      }
      if (hash) {
        return hash.replace('#', '');
      }
    }
    return ROUTES.HOME;
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getInitialRoute);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', route);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname + window.location.search + window.location.hash;
        setCurrentRoute(path || ROUTES.HOME);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Extract base route path without query params or hash fragment for matching
  const routePath = currentRoute.split('?')[0].split('#')[0];

  // Protect private pages with supabase.auth.getSession() — if no session, redirect to /login
  useEffect(() => {
    const isPrivate = routePath.startsWith('/app') || routePath === ROUTES.ONBOARDING;
    if (isPrivate) {
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (!session) {
          navigate(ROUTES.LOGIN);
        }
      });
    }
  }, [routePath]);

  // Global Loading Splash during initial auth verification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
            <span>Initializing PreScan session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Account Suspended Gate
  if (authStatus === 'SUSPENDED') {
    return <AccountSuspendedPage onNavigate={navigate} />;
  }

  // 1. Standalone Public Marketing Pages
  if (routePath === ROUTES.HOME || routePath === '') {
    return <PublicLandingPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.FEATURES) {
    return <PublicFeaturesPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.HOW_IT_WORKS) {
    return <PublicHowItWorksPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.PRICING) {
    return <PublicPricingPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.SECURITY) {
    return <PublicSecurityPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.ABOUT) {
    return <PublicAboutPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.CONTACT) {
    return <PublicContactPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.PRIVACY) {
    return <PublicPrivacyPage onNavigate={navigate} />;
  }
  if (routePath === ROUTES.TERMS) {
    return <PublicTermsPage onNavigate={navigate} />;
  }

  // 2. Authentication Flow Pages with Smart Redirection
  if (routePath === ROUTES.LOGIN) {
    if (authStatus === 'AUTHENTICATED_READY') {
      return <DashboardPage onNavigate={navigate} />;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  if (routePath === ROUTES.SIGNUP) {
    if (authStatus === 'AUTHENTICATED_READY') {
      return <DashboardPage onNavigate={navigate} />;
    }
    if (authStatus === 'AUTHENTICATED_ONBOARDING' || authStatus === 'AUTHENTICATED_UNVERIFIED') {
      return <OnboardingPage onNavigate={navigate} />;
    }
    return <SignupPage onNavigate={navigate} />;
  }

  if (routePath === ROUTES.VERIFY_EMAIL) {
    if (authStatus === 'AUTHENTICATED_READY') {
      return <DashboardPage onNavigate={navigate} />;
    }
    return <OnboardingPage onNavigate={navigate} />;
  }

  if (routePath === ROUTES.FORGOT_PASSWORD) {
    return <ForgotPasswordPage onNavigate={navigate} />;
  }

  if (routePath === ROUTES.RESET_PASSWORD) {
    return <ResetPasswordPage onNavigate={navigate} />;
  }

  // Invite Token Page (/invite/:token or /invite?token=...)
  if (routePath.startsWith('/invite')) {
    let token = '';
    if (routePath.startsWith('/invite/')) {
      token = routePath.replace('/invite/', '').split('?')[0];
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      token = urlParams.get('token') || '';
    }
    return <AcceptInvitationPage token={token} onNavigate={navigate} />;
  }

  if (routePath === ROUTES.ONBOARDING) {
    if (authStatus === 'UNAUTHENTICATED') {
      return <LoginPage onNavigate={navigate} returnTo={ROUTES.ONBOARDING} />;
    }
    if (authStatus === 'AUTHENTICATED_READY') {
      return <DashboardPage onNavigate={navigate} />;
    }
    return <OnboardingPage onNavigate={navigate} />;
  }

  // 3. Protected Application Shell Routes (/app/*)
  if (routePath.startsWith('/app')) {
    // If not authenticated, redirect to Login
    if (authStatus === 'UNAUTHENTICATED') {
      return <LoginPage onNavigate={navigate} returnTo={currentRoute} />;
    }
    // If onboarding incomplete, redirect to Onboarding
    if (authStatus === 'AUTHENTICATED_ONBOARDING' || authStatus === 'AUTHENTICATED_UNVERIFIED') {
      return <OnboardingPage onNavigate={navigate} />;
    }

    // Authenticated Ready Shell Rendering
    const renderAppContent = () => {
      // Dynamic scan detail route check: /app/scans/:id
      if (routePath.startsWith('/app/scans/') && routePath !== ROUTES.SCANS) {
        const scanId = routePath.replace('/app/scans/', '');
        return <ScanDetailPage scanId={scanId} onNavigate={navigate} />;
      }

      switch (routePath) {
        case ROUTES.APP_ROOT:
        case ROUTES.DASHBOARD:
          return <DashboardPage onNavigate={navigate} />;
        case ROUTES.NEW_SCAN:
          return <NewScanPage onNavigate={navigate} />;
        case ROUTES.SCANS:
          return <ScansPage onNavigate={navigate} />;
        case ROUTES.REPORTS:
          return <ReportsPage onNavigate={navigate} />;
        case ROUTES.PROJECTS:
          return <ProjectsPage onNavigate={navigate} />;
        case ROUTES.TEAM:
          return <TeamPage onNavigate={navigate} />;
        case ROUTES.INTEGRATIONS:
          return <IntegrationsPage onNavigate={navigate} />;
        case ROUTES.BILLING:
          return <BillingPage onNavigate={navigate} />;
        case ROUTES.SETTINGS:
          return <SettingsPage onNavigate={navigate} />;
        case ROUTES.DESIGN_SYSTEM:
          return <DesignSystemPage onNavigate={navigate} />;
        default:
          return <DashboardPage onNavigate={navigate} />;
      }
    };

    return (
      <AppShell currentRoute={currentRoute} onNavigate={navigate}>
        {renderAppContent()}
      </AppShell>
    );
  }

  // Fallback to Home
  return <PublicLandingPage onNavigate={navigate} />;
};
