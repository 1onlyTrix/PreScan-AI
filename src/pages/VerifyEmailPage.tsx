import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CheckCircle2, RefreshCw, ArrowLeft, ArrowRight, ShieldCheck, Mail, AlertCircle, Edit2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardFooter } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';

interface VerifyEmailPageProps {
  onNavigate: (route: string) => void;
}

/**
 * Mask an email address for privacy display (e.g. j***e@domain.com)
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || 'your email';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onNavigate }) => {
  const { user, verifyEmail, resendVerification, refreshSession } = useAuth();

  // Read email from URL query param, local auth user, or allow manual entry
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const queryEmail = urlParams.get('email');
  const [emailInput, setEmailInput] = useState<string>(queryEmail || user?.email || '');
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(!queryEmail && !user?.email);

  const targetEmail = emailInput.trim();

  // 6 individual digit input states
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(Boolean(user?.emailVerified));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendSuccessMessage, setResendSuccessMessage] = useState<string | null>(null);

  // 60-second cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus the first empty digit box on mount
  useEffect(() => {
    if (!isVerified && !isEditingEmail) {
      const firstEmptyIndex = otpDigits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [isVerified, isEditingEmail]);

  const otpCode = otpDigits.join('');
  const isComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  // Handle single digit change
  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    setIsTokenExpired(false);

    // If pasted full string into single input box
    const cleanNumbers = value.replace(/\D/g, '');
    if (cleanNumbers.length > 1) {
      handlePastedCode(cleanNumbers);
      return;
    }

    const singleDigit = cleanNumbers.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);

    // Auto-advance to next input if digit entered
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keyboard backspace and arrow navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && isComplete && !isVerifying) {
      handleVerify(otpDigits.join(''));
    }
  };

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleanNumbers = pastedText.replace(/\D/g, '');
    if (cleanNumbers.length > 0) {
      handlePastedCode(cleanNumbers);
    }
  };

  const handlePastedCode = (numbers: string) => {
    const digits = numbers.slice(0, 6).split('');
    const newDigits = [...otpDigits];
    digits.forEach((digit, i) => {
      if (i < 6) newDigits[i] = digit;
    });
    setOtpDigits(newDigits);

    const nextFocusIndex = Math.min(digits.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();

    if (newDigits.join('').length === 6 && /^\d{6}$/.test(newDigits.join(''))) {
      handleVerify(newDigits.join(''));
    }
  };

  // Submit 6-digit OTP verification
  const handleVerify = async (codeToSubmit?: string) => {
    const code = (codeToSubmit || otpCode).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage('Please enter a complete 6-digit verification code.');
      return;
    }

    if (!targetEmail) {
      setErrorMessage('Please provide the email address associated with your account.');
      setIsEditingEmail(true);
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMessage(null);
      setIsTokenExpired(false);

      await verifyEmail({
        email: targetEmail,
        code,
      });

      // Successful verification
      setIsVerified(true);
      if (refreshSession) {
        try {
          await refreshSession();
        } catch {
          // ignore background sync error
        }
      }

      // Redirect successful verification to the Onboarding process
      setTimeout(() => {
        onNavigate(ROUTES.ONBOARDING);
      }, 1000);
    } catch (err: any) {
      const rawMsg = err.message || '';
      const lowerMsg = rawMsg.toLowerCase();

      if (lowerMsg.includes('expired') || err.code === 'EXPIRED_CODE') {
        setIsTokenExpired(true);
        setErrorMessage('This verification code has expired. Please request a new 6-digit code below.');
      } else if (lowerMsg.includes('invalid') || lowerMsg.includes('incorrect') || err.code === 'INVALID_CODE') {
        setErrorMessage('Invalid verification code. Please check your email and enter the correct 6 digits.');
      } else if (lowerMsg.includes('too many') || lowerMsg.includes('rate') || err.code === 'RATE_LIMIT') {
        setErrorMessage('Too many incorrect attempts. Please wait a moment or request a new code.');
      } else {
        setErrorMessage(rawMsg || 'Verification failed. Please check the code and try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend 6-digit OTP code
  const handleResend = async () => {
    if (!targetEmail) {
      setErrorMessage('Please enter your email address to receive a code.');
      setIsEditingEmail(true);
      return;
    }

    try {
      setResending(true);
      setErrorMessage(null);
      setIsTokenExpired(false);
      setResendSuccessMessage(null);

      const res = await resendVerification(targetEmail);

      setResendSuccessMessage(res?.message || `A fresh 6-digit code has been sent to ${targetEmail}. Please check your inbox.`);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      if (err.code === 'RESEND_COOLDOWN') {
        setResendCooldown(err.remainingSeconds || 60);
        setErrorMessage(err.message || 'Please wait before requesting another code.');
      } else {
        setErrorMessage(err.message || 'Unable to resend verification code. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
      <div className="w-full max-w-md space-y-6">
        {/* Top return navigation */}
        <button
          id="verify-back-to-login"
          type="button"
          onClick={() => onNavigate(ROUTES.LOGIN)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </button>

        {/* Header branding */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Mail className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Verify your email
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Enter the 6-digit confirmation code sent to{' '}
            <span className="font-semibold text-neutral-900">
              {targetEmail ? maskEmail(targetEmail) : 'your email'}
            </span>
            .
          </p>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <Alert variant="error" title="Verification Error">
            <div className="space-y-1 text-left">
              <p>{errorMessage}</p>
              {isTokenExpired && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendCooldown > 0}
                  className="text-xs font-semibold text-rose-700 underline hover:text-rose-900 block mt-1 cursor-pointer"
                >
                  Request a new code now
                </button>
              )}
            </div>
          </Alert>
        )}

        {resendSuccessMessage && (
          <Alert variant="success" title="Code Sent">
            {resendSuccessMessage}
          </Alert>
        )}

        {/* Verification Card */}
        <Card className="bg-white shadow-sm border-neutral-200">
          <CardContent className="pt-6 pb-6 space-y-6">
            {isVerified ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-900">Email Verified Successfully</h3>
                  <p className="text-xs text-neutral-500">Redirecting you to the onboarding setup...</p>
                </div>
                <Button
                  id="verify-continue-btn"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                  onClick={() => onNavigate(ROUTES.ONBOARDING)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue to Onboarding
                </Button>
              </div>
            ) : (
              <>
                {/* Email Display / Change Bar */}
                {isEditingEmail ? (
                  <div className="space-y-2 pb-2 border-b border-neutral-100">
                    <Input
                      label="Account Email Address"
                      type="email"
                      placeholder="creator@channel.com"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(false)}
                        disabled={!targetEmail}
                        className="text-xs font-medium text-neutral-600 hover:text-neutral-900 underline"
                      >
                        Done editing
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="font-medium text-neutral-700 truncate">{targetEmail || 'No email specified'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors shrink-0 ml-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                  </div>
                )}

                {/* 6-Digit OTP Input Boxes */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700 text-center mb-2">
                    6-Digit Confirmation Code
                  </label>
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        id={`otp-digit-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={digit}
                        disabled={isVerifying}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                          errorMessage
                            ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-200'
                            : digit
                            ? 'border-neutral-900 text-neutral-900 shadow-xs'
                            : 'border-neutral-200 text-neutral-900 hover:border-neutral-300'
                        } disabled:opacity-50 disabled:bg-neutral-50`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-neutral-400 text-center mt-1">
                    Tip: You can paste the complete 6-digit code directly.
                  </p>
                </div>

                {/* Small error text under form if active */}
                {errorMessage && (
                  <p className="text-xs text-rose-600 font-medium text-center">
                    {errorMessage}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    id="verify-submit-btn"
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center text-xs font-semibold"
                    onClick={() => handleVerify()}
                    isLoading={isVerifying}
                    disabled={isVerifying || !isComplete}
                  >
                    Verify & Continue to Onboarding
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <button
                      id="verify-resend-btn"
                      type="button"
                      onClick={handleResend}
                      disabled={resending || resendCooldown > 0 || isVerifying}
                      className="font-medium text-neutral-600 hover:text-neutral-900 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      <span>
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend code'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate(ROUTES.SIGNUP)}
                      disabled={isVerifying}
                      className="font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      Create another account
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between text-xs text-neutral-500 pt-3 pb-4 border-t border-neutral-100">
            <span className="flex items-center gap-1 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secure Email OTP Verification</span>
            </span>

            <button
              id="verify-footer-login"
              type="button"
              onClick={() => onNavigate(ROUTES.LOGIN)}
              className="text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
            >
              Sign In
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

