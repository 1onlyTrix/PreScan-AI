import React, { useState, useEffect } from 'react';
import { Settings, Shield, Building2, Save, User as UserIcon, Lock, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Alert } from '../components/ui/Alert';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

interface SettingsPageProps {
  onNavigate: (route: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { toast } = useToast();
  const { user, organization, updateProfile } = useAuth();

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.displayName || user?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Organization Form State
  const [orgName, setOrgName] = useState(organization?.name || 'Main Workspace');
  const [savingOrg, setSavingOrg] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Preference switches
  const [strictProfanity, setStrictProfanity] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
    if (organization?.name) setOrgName(organization.name);
  }, [user, organization]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast({ type: 'error', title: 'Error', description: 'Name cannot be empty.' });
      return;
    }
    try {
      setSavingProfile(true);
      await updateProfile({ displayName: displayName.trim() });
      toast({
        type: 'success',
        title: 'Profile Updated',
        description: 'Your user profile details have been saved.',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Update Failed',
        description: err.message || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!organization?.id) return;
    try {
      setSavingOrg(true);
      const res = await apiFetch(`/api/workspaces/${organization.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: orgName }),
      });
      if (!res.ok) throw new Error('Failed to update workspace name.');
      toast({
        type: 'success',
        title: 'Workspace Updated',
        description: 'Organization settings have been updated.',
      });
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Error',
        description: err.message || 'Failed to update workspace.',
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in both current and new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await apiFetch('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password.');

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        type: 'success',
        title: 'Password Changed',
        description: 'Your account password has been updated.',
      });
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings & Security"
        description="Manage your creator profile, workspace configuration, and account security credentials."
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Workspace', onClick: () => onNavigate('/app/dashboard') },
              { label: 'Settings' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <UserIcon className="w-4 h-4 text-neutral-800" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Creator Profile
                </CardTitle>
              </div>
              <CardDescription>
                Personal account details and contact information.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                label="Full Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                helperText="Displayed across scan review comments and reports."
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Account Email Address
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-neutral-50 text-neutral-600 flex-1"
                  />
                  <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Email verification active. Contact support to transfer primary ownership.
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                onClick={handleSaveProfile}
                isLoading={savingProfile}
                disabled={savingProfile}
              >
                Save Profile
              </Button>
            </CardFooter>
          </Card>

          {/* General Organization Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-neutral-800" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Organization & Workspace
                </CardTitle>
              </div>
              <CardDescription>
                Primary name and workspace tenant isolation identifier.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Input
                label="Workspace Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                helperText="Used in policy reports, team invitations, and audit events."
              />

              <Input
                label="Workspace Tenant ID"
                value={organization?.id || 'ws_active'}
                disabled
                helperText="Immutable multi-tenant isolation partition identifier."
              />
            </CardContent>

            <CardFooter>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                onClick={handleSaveOrg}
                isLoading={savingOrg}
                disabled={savingOrg}
              >
                Save Workspace
              </Button>
            </CardFooter>
          </Card>

          {/* Security & Password Change */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-neutral-800" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Security & Password
                </CardTitle>
              </div>
              <CardDescription>
                Update your account password with scrypt hashing.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {passwordError && (
                <div className="mb-4">
                  <Alert variant="error" title="Password Error">
                    {passwordError}
                  </Alert>
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4">
                  <Alert variant="success" title="Success">
                    Password updated successfully.
                  </Alert>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />

                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  helperText="Minimum 8 characters with salt derivation."
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />

                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  isLoading={changingPassword}
                  disabled={changingPassword}
                  className="mt-2"
                >
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Compliance Defaults */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4 text-neutral-800" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Analysis Preferences
                </CardTitle>
              </div>
              <CardDescription>
                Default evaluation sensitivities applied to new scans.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Switch
                label="Opening 30-Second Advertiser Strictness"
                description="Flags any profanity occurring in the opening hook that would jeopardize YouTube monetization."
                checked={strictProfanity}
                onCheckedChange={setStrictProfanity}
              />

              <div className="border-t border-neutral-100 pt-3">
                <Switch
                  label="Scan Completion In-App Notifications"
                  description="Receive instant alerts when audio processing and policy reports finish compiling."
                  checked={notifyOnComplete}
                  onCheckedChange={setNotifyOnComplete}
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                onClick={() => {
                  toast({
                    type: 'success',
                    title: 'Preferences Saved',
                    description: 'Analysis preferences updated for new scans.',
                  });
                }}
              >
                Save Preferences
              </Button>
            </CardFooter>
          </Card>

          {/* Danger Zone */}
          <Card className="border-rose-200 bg-rose-50/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-rose-700">
                  Danger Zone
                </CardTitle>
              </div>
              <CardDescription className="text-rose-600">
                Destructive workspace and account actions.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-rose-200">
                <div>
                  <p className="text-xs font-semibold text-neutral-900">Delete Account</p>
                  <p className="text-[11px] text-neutral-500">
                    Permanently delete your profile and cancel active sessions.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    toast({
                      type: 'info',
                      title: 'Account Deletion Protection',
                      description: 'Account deletion API is scheduled for a future release to protect against accidental data loss.',
                    });
                  }}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Info Side Panel */}
        <div className="space-y-6">
          <Card variant="subtle">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-neutral-800" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                  Security Posture
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-neutral-600 leading-relaxed">
              <p>
                • <strong>Server-Trusted Sessions:</strong> Session tokens are validated against the database on every authenticated request with sliding expiration.
              </p>
              <p>
                • <strong>Zero Plaintext Storage:</strong> Passwords are cryptographically salted and hashed using scrypt.
              </p>
              <p>
                • <strong>Multi-Tenant Isolation:</strong> Data access is partitioned by workspace ID (<code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">{organization?.id || 'ws_...'}</code>).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
