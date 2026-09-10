import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, KeyRound, Eye, EyeOff, Check, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';
import { apiFetch } from '../lib/api';

interface ResetPasswordPageProps {
  onNavigate: (route: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth();
  
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token = urlParams.get('token') || '';

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        setValidatingToken(true);

        if (token) {
          const res = await apiFetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.valid) {
            setTokenValid(true);
            setTokenEmail(data.email || '');
          } else {
            setTokenValid(false);
            setTokenError(data.error || 'This password reset link is invalid or has expired.');
          }
        } else {
          setTokenValid(false);
          setTokenError('No valid password reset link or token was found.');
        }
      } catch {
        setTokenValid(false);
        setTokenError('Failed to validate password reset link. Please try requesting a new one.');
      } finally {
        setValidatingToken(false);
      }
    };

    checkToken();
  }, [token]);

  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await resetPassword({ token: token || undefined, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 text-neutral-900">
        <Card className="w-full max-w-md bg-white text-center p-8 border-neutral-200">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 animate-spin">
            <KeyRound className="w-5 h-5 text-neutral-600" />
          </div>
          <p className="text-sm font-semibold text-neutral-800">Validating password reset link...</p>
        </Card>
      </div>
    );
  }

  if (!tokenValid && !success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
        <div className="w-full max-w-md space-y-6">
          <Card className="bg-white shadow-sm border-neutral-200 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Invalid or Expired Link</h2>
            <p className="text-xs text-neutral-600 mb-6">
              {tokenError || 'This password reset link is invalid or has expired.'}
            </p>
            <div className="space-y-2">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                onClick={() => onNavigate(ROUTES.FORGOT_PASSWORD)}
              >
                Request New Reset Link
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full justify-center text-neutral-600"
                onClick={() => onNavigate(ROUTES.LOGIN)}
              >
                Return to Login
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
        <div className="w-full max-w-md space-y-6">
          <Card className="bg-white shadow-sm border-neutral-200 text-center p-8">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Password Reset Complete</h2>
            <p className="text-xs text-neutral-600 mb-6">
              Your password has been updated. You can now log in with your new credentials.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              onClick={() => onNavigate(ROUTES.LOGIN)}
            >
              Sign In to Workspace
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm mx-auto mb-3">
            <KeyRound className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Set a new password
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Setting new password for <span className="font-semibold text-neutral-800">{tokenEmail}</span>
          </p>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <Card className="bg-white shadow-sm border-neutral-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Confirm New Password
                </label>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center mt-2"
                isLoading={loading}
                disabled={loading}
              >
                Update Password
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center text-xs text-neutral-500 pt-2 pb-4 border-t border-neutral-100">
            <button
              onClick={() => onNavigate(ROUTES.LOGIN)}
              className="text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
