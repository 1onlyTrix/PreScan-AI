import React, { useState } from 'react';
import { Sparkles, ArrowLeft, Shield, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { ROUTES } from '../router/routes';

interface PublicAuthPageProps {
  mode: 'login' | 'signup';
  onNavigate: (route: string) => void;
}

export const PublicAuthPage: React.FC<PublicAuthPageProps> = ({ mode, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(ROUTES.DASHBOARD);
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
            className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm mx-auto mb-3 cursor-pointer"
            onClick={() => onNavigate(ROUTES.HOME)}
          >
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            {mode === 'login' ? 'Sign in to PreScan' : 'Create your PreScan workspace'}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {mode === 'login'
              ? 'Access your workspace review queues and scan reports'
              : 'Pre-screen video dialogue and metadata before you publish'}
          </p>
        </div>

        <Alert variant="info" title="Auth Service Boundary Notice">
          Authentication and OAuth session exchanges are non-functional placeholders in Phase 02. Submitting below initializes and enters your workspace shell immediately.
        </Alert>

        <Card className="bg-white shadow-sm border-neutral-200">
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <Input
                  label="Full Name"
                  placeholder="Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}

              <Input
                label="Creator Email"
                type="email"
                placeholder="creator@channel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center"
              >
                {mode === 'login' ? 'Enter Workspace' : 'Start Scanning Free'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 text-center text-xs text-neutral-500 pt-2 pb-5 border-t border-neutral-100">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => onNavigate(ROUTES.SIGNUP)}
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Create free workspace
                </button>
              </p>
            ) : (
              <p>
                Already have a workspace?{' '}
                <button
                  onClick={() => onNavigate(ROUTES.LOGIN)}
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}

            <div className="text-[11px] text-neutral-400 pt-1">
              By continuing, you acknowledge our{' '}
              <button
                onClick={() => onNavigate(ROUTES.TERMS)}
                className="underline hover:text-neutral-700"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                onClick={() => onNavigate(ROUTES.PRIVACY)}
                className="underline hover:text-neutral-700"
              >
                Privacy Policy
              </button>
              .
            </div>
          </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <Shield className="w-3.5 h-3.5" />
          <span>Tenant Isolation & Encrypted Foundation</span>
        </div>
      </div>
    </div>
  );
};
