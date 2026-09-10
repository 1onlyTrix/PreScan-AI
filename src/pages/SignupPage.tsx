import React, { useState } from 'react';
import { Sparkles, ArrowLeft, Shield, Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';
import { supabase, signInWithGoogle } from '../supabaseClient';

interface SignupPageProps {
  onNavigate: (route: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { loginWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const { error: supabaseError } = await signInWithGoogle();
      if (supabaseError) {
        setError(supabaseError.message);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to sign up with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Compute password criteria
  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const passwordsMatch = password !== '' && password === confirmPassword;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-rose-500';
  let strengthWidth = 'w-1/4';

  const score = [hasMinLength, hasNumberOrSymbol, hasLetter, password.length >= 12].filter(Boolean).length;
  if (score >= 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthWidth = 'w-full';
  } else if (score >= 2) {
    strengthLabel = 'Moderate';
    strengthColor = 'bg-amber-500';
    strengthWidth = 'w-2/3';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter an email and password.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }

      const targetEmail = encodeURIComponent(email.trim());
      onNavigate(`${ROUTES.LOGIN}?registered=true&email=${targetEmail}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create your account.');
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
            Create your PreScan Account
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Pre-screen video dialogue, copyright signals, and metadata before you publish.
          </p>
        </div>

        {error && (
          <Alert variant="error" title="Registration Error">
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
              onClick={handleGoogleSignup}
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
                or sign up with email
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                required
                autoFocus
              />

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
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
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

                {password && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Strength: {strengthLabel}</span>
                      <span className="font-mono text-[10px] text-neutral-400">{password.length} chars</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strengthColor} ${strengthWidth} transition-all duration-300`} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Confirm Password
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                />
                {confirmPassword && (
                  <div className="flex items-center gap-1.5 text-[11px] pt-1">
                    {passwordsMatch ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (error) setError(null);
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    required
                  />
                  <span className="text-xs text-neutral-600 leading-normal">
                    I agree to the PreScan{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate(ROUTES.TERMS)}
                      className="underline text-neutral-900 hover:text-black font-medium"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate(ROUTES.PRIVACY)}
                      className="underline text-neutral-900 hover:text-black font-medium"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
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
                disabled={loading || !termsAccepted}
              >
                Create Account & Continue
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center text-xs text-neutral-500 pt-2 pb-5 border-t border-neutral-100">
            <p>
              Already have an account?{' '}
              <button
                onClick={() => onNavigate(ROUTES.LOGIN)}
                className="font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
              >
                <span>Sign in</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </p>
          </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Shield className="w-3.5 h-3.5" />
          <span>Server-Side Hashing • Zero Plaintext Storage</span>
        </div>
      </div>
    </div>
  );
};
