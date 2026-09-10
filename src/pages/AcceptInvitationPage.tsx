import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Users2,
  Sparkles,
  Mail,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { apiFetch, setStoredWorkspaceId } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface AcceptInvitationPageProps {
  token: string;
  onNavigate: (route: string) => void;
}

interface InvitationDetails {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  inviter?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({ token, onNavigate }) => {
  const { user, authStatus, refreshSession } = useAuth();
  const { showToast } = useToast();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError('Missing invitation token.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const res = await apiFetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'This invitation is invalid or has expired.');
          return;
        }

        setInvitation(data.invitation);
      } catch (err: any) {
        setError(err.message || 'Failed to verify invitation.');
      } finally {
        setIsLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    // If user is not logged in, redirect to login/signup with returnTo
    if (authStatus === 'UNAUTHENTICATED' || !user) {
      onNavigate(`/signup?invite=${token}&email=${encodeURIComponent(invitation?.email || '')}`);
      return;
    }

    try {
      setIsAccepting(true);
      const res = await apiFetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invitation.');
      }

      setSuccess(true);
      showToast({
        type: 'success',
        title: 'Joined Workspace',
        message: `You are now a member of ${invitation?.workspace?.name || 'the workspace'}!`,
      });

      if (data.workspace?.id) {
        setStoredWorkspaceId(data.workspace.id);
      }

      await refreshSession();

      setTimeout(() => {
        onNavigate('/app/dashboard');
      }, 1500);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Acceptance Error', message: err.message });
      setError(err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm mb-3">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">PreScan Workspace Invitation</h1>
          <p className="text-xs text-neutral-500 mt-1">Collaborative pre-publish video compliance & analysis</p>
        </div>

        <Card className="shadow-lg border-neutral-200/80">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
                <span className="text-xs font-medium">Verifying invitation credentials...</span>
              </div>
            ) : error ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900">Invitation Unavailable</h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">{error}</p>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('/')}
                    className="w-full"
                  >
                    Go to PreScan Home
                  </Button>
                </div>
              </div>
            ) : success ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900">Welcome to the Team!</h3>
                  <p className="text-xs text-neutral-500">
                    You have joined <span className="font-semibold text-neutral-800">{invitation?.workspace?.name}</span>. Redirecting to workspace dashboard...
                  </p>
                </div>
                <div className="flex justify-center pt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-neutral-400 font-medium">Invited to join</p>
                    <p className="text-sm font-bold text-neutral-900 truncate">
                      {invitation?.workspace?.name}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-neutral-200/80 text-neutral-700">
                    {invitation?.role}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-neutral-600">
                  <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                    <span className="text-neutral-400">Invited Email:</span>
                    <span className="font-semibold text-neutral-800">{invitation?.email}</span>
                  </div>
                  {invitation?.inviter && (
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-400">Invited By:</span>
                      <span className="font-medium text-neutral-700">
                        {invitation.inviter.fullName || invitation.inviter.email}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-neutral-400">Access Level:</span>
                    <span className="font-medium text-neutral-700">
                      {invitation?.role === 'ADMIN'
                        ? 'Workspace Admin (Full team & scan management)'
                        : 'Team Member (Scans & shared risk reports)'}
                    </span>
                  </div>
                </div>

                {user && user.email.toLowerCase() !== invitation?.email?.toLowerCase() && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    You are currently logged in as <span className="font-semibold">{user.email}</span>. Accepting will add this account to {invitation?.workspace?.name}.
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center"
                    onClick={handleAccept}
                    isLoading={isAccepting}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    id="accept-invitation-btn"
                  >
                    {user ? 'Accept & Join Workspace' : 'Sign Up or Sign In to Join'}
                  </Button>

                  {!user && (
                    <p className="text-center text-[11px] text-neutral-400 pt-1">
                      Already have an account?{' '}
                      <button
                        onClick={() => onNavigate(`/login?invite=${token}`)}
                        className="text-neutral-800 font-semibold hover:underline"
                      >
                        Log in here
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
