import React from 'react';
import { ShieldAlert, LogOut, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../router/routes';

interface AccountSuspendedPageProps {
  onNavigate: (route: string) => void;
}

export const AccountSuspendedPage: React.FC<AccountSuspendedPageProps> = ({ onNavigate }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onNavigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4 text-neutral-900">
      <div className="w-full max-w-md space-y-6">
        <Card className="bg-white shadow-sm border-neutral-200 text-center p-8">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Account Suspended</h2>
          <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
            Your account has been temporarily restricted. If you believe this is an error or require assistance recovering access, please reach out to our security team.
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              size="md"
              className="w-full justify-center"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={() => onNavigate(ROUTES.CONTACT)}
            >
              Contact Support
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full justify-center text-neutral-600"
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
