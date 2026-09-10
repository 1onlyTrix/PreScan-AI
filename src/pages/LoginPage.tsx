import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Shield, Eye, EyeOff, Lock, AlertCircle, ArrowRight, Mail, RefreshCw, MailCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';
import { supabase } from '../supabaseClient';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  initialEmail?: string;
  verificationMessage?: string;
  returnTo?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, initialEmail, verificationMessage, returnTo }) => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationBanner, setVerificationBanner] = useState<string | null>(verificationMessage || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL parameters for registered email & verification message
    const searchString = typeof window !== 'undefined' ? window.location.search : '';
    const urlParams = new URLSearchParams(searchString);
    const emailParam = urlParams.get('email') || initialEmail || '';
    const isRegistered = urlParams.get('registered') === 'true' || Boolean(verificationMessage);
    const msgParam = urlParams.get('msg') || verificationMessage;

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    setPassword(''); // Password must remain completely empty

    if (isRegistered || msgParam) {
      setVerificationBanner(
        msgParam
          ? decodeURIComponent(msgParam)
          : 'Your account has been created. Please check your email and verify your address before logging in.'
      );
    }
  }, [initialEmail, verificationMessage]);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Unable to sign in. Please check your credentials and try again.');
        return;
      }

      // Only redirect when a real session exists after login
      if (!data?.session) {
        setError('Check your email and confirm your account before logging in.');
        return;
      }

      // Redirect the user to the Home page ("/")
      onNavigate(ROUTES.HOME);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
      <div className="w-full max-w-md space-y-6">
        <button
          onClick={() => onNavigate(ROUTES.HOME)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to PreScan Home</span>
        </button>

        <div className="text-center">
          <div
            className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm mx-auto mb-3 cursor-pointer hover:bg-neutral-800 transition-colors"
            onClick={() => onNavigate(ROUTES.HOME)}
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Sign in to PreScan
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Access your creator QA workspace, upload reviews, and policy reports.
          </p>
        </div>

        {verificationBanner && (
          <div className="bg-emerald-50 border border-emerald-300/80 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                <MailCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Email Verification Required
                </h4>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {verificationBanner}
                </p>
                <p className="text-[11px] text-emerald-800 pt-0.5">
                  We prefilled your email below. Enter your password once verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="error" title="Authentication Error">
            {error}
          </Alert>
        )}

        <Card className="bg-white shadow-sm border-neutral-200">
          <CardContent className="pt-6 space-y-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full justify-center text-xs font-semibold border-neutral-300 hover:bg-neutral-50 text-neutral-800"
              onClick={handleGoogleLogin}
              isLoading={googleLoading}
              disabled={loading || googleLoading}
              leftIcon={
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              }
            >
              {googleLoading ? 'Connecting to Google...' : 'Continue with Google'}
            </Button>

            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative bg-white px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                or sign in with email
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                label="Creator Email"
                type="email"
                placeholder="creator@channel.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoFocus
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate(ROUTES.FORGOT_PASSWORD)}
                    className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-600 font-medium pt-1">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center mt-2"
                isLoading={loading}
                disabled={loading}
              >
                Sign In to Workspace
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center text-xs text-neutral-500 pt-2 pb-5 border-t border-neutral-100">
            <p>
              Don't have a PreScan account?{' '}
              <button
                onClick={() => onNavigate(ROUTES.SIGNUP)}
                className="font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Create free account</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </p>

            <div className="text-[11px] text-neutral-400 pt-1">
              Protected by server-trusted session tokens & tenant isolation.
            </div>
          </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Shield className="w-3.5 h-3.5" />
          <span>Encrypted Session & Password Hashing</span>
        </div>
      </div>
    </div>
  );
};
