import React, { useState, useEffect, useCallback } from 'react';
import {
  Users2,
  UserPlus,
  Shield,
  UserCheck,
  Eye,
  Edit3,
  Mail,
  MoreVertical,
  Trash2,
  Send,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Building2,
  ArrowRight,
  ShieldAlert,
  Settings,
  RefreshCw,
  Loader2,
  CheckCircle2,
  UserX,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Alert } from '../components/ui/Alert';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/ui/Toast';

interface TeamMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface TeamInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  invitedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface AuditLogItem {
  id: string;
  organizationId?: string;
  actorUserId: string;
  action: string;
  targetResourceType?: string;
  targetResourceId?: string;
  metadataJson?: string;
  createdAt: string;
}

interface TeamPageProps {
  onNavigate: (route: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ onNavigate }) => {
  const { user, organization, membership, refreshWorkspaces, refreshSession } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'audit' | 'roles'>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ rawToken?: string; inviteLink?: string } | null>(null);

  // Rename Workspace Modal State
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState(organization?.name || '');
  const [isRenaming, setIsRenaming] = useState(false);

  // Remove/Leave confirmation
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Role promotion/demotion loading state
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Copy link tracking
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const currentUserRole = membership?.role || 'MEMBER';
  const canManageTeam = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const isOwner = currentUserRole === 'OWNER';

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    try {
      setIsLoading(true);
      const [membersRes, invitesRes, auditRes] = await Promise.all([
        apiFetch(`/api/workspaces/${organization.id}/members`),
        canManageTeam ? apiFetch(`/api/workspaces/${organization.id}/invitations`) : Promise.resolve(null),
        apiFetch(`/api/workspaces/${organization.id}/audit-logs`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (invitesRes && invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations || []);
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, canManageTeam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      showToast({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.' });
      return;
    }

    try {
      setIsInviting(true);
      const res = await apiFetch(`/api/workspaces/${organization?.id}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation.');
      }

      showToast({
        type: 'success',
        title: 'Invitation Sent',
        message: `An invitation has been dispatched to ${inviteEmail}.`,
      });

      if (data.inviteLink) {
        setInviteResult({
          rawToken: data.invitation?.token,
          inviteLink: data.inviteLink,
        });
      } else {
        setIsInviteOpen(false);
        setInviteEmail('');
      }

      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Invitation Error', message: err.message || 'Failed to send invitation.' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvite = async (invitationId: string, email: string) => {
    try {
      const res = await apiFetch(`/api/workspaces/${organization?.id}/invitations/${invitationId}/resend`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend invitation.');

      showToast({
        type: 'success',
        title: 'Invitation Resent',
        message: `A fresh invitation was sent to ${email}.`,
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Resend Error', message: err.message });
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      const res = await apiFetch(`/api/workspaces/${organization?.id}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invitation.');

      showToast({
        type: 'success',
        title: 'Invitation Cancelled',
        message: 'The invitation has been revoked.',
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Cancel Error', message: err.message });
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      setUpdatingRoleId(targetUserId);
      const res = await apiFetch(`/api/workspaces/${organization?.id}/members/${targetUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member role.');

      showToast({
        type: 'success',
        title: 'Role Updated',
        message: `Member permission level changed to ${newRole}.`,
      });
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Role Update Error', message: err.message });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setIsRemoving(true);
      const isLeaving = memberToRemove.userId === user?.id;
      const res = await apiFetch(`/api/workspaces/${organization?.id}/members/${memberToRemove.userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member.');

      showToast({
        type: 'success',
        title: isLeaving ? 'Left Workspace' : 'Member Removed',
        message: isLeaving ? 'You have left the workspace.' : 'Member was removed from the workspace.',
      });

      setMemberToRemove(null);

      if (isLeaving) {
        await refreshSession();
        onNavigate('/app/dashboard');
      } else {
        loadData();
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Removal Error', message: err.message });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || newWorkspaceName.trim().length < 2) {
      showToast({ type: 'error', title: 'Invalid Name', message: 'Workspace name must be at least 2 characters.' });
      return;
    }

    try {
      setIsRenaming(true);
      const res = await apiFetch(`/api/workspaces/${organization?.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update workspace name.');

      showToast({
        type: 'success',
        title: 'Workspace Renamed',
        message: `Workspace renamed to "${newWorkspaceName.trim()}".`,
      });

      setIsRenameOpen(false);
      await refreshSession();
      await refreshWorkspaces();
      loadData();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Update Error', message: err.message });
    } finally {
      setIsRenaming(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInviteId(id);
    showToast({ type: 'success', title: 'Link Copied', message: 'Invitation link copied to clipboard.' });
    setTimeout(() => setCopiedInviteId(null), 3000);
  };

  const formatRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white">
            <Shield className="w-3 h-3 text-emerald-400" />
            Owner
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UserCheck className="w-3 h-3 text-indigo-600" />
            Admin
          </span>
        );
      case 'MEMBER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
            <Users2 className="w-3 h-3 text-neutral-500" />
            Member
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-neutral-900">{organization?.name || 'Workspace'}</h2>
              {formatRoleBadge(currentUserRole)}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Multi-tenant isolated team workspace • {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canManageTeam && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Settings className="w-3.5 h-3.5" />}
              onClick={() => {
                setNewWorkspaceName(organization?.name || '');
                setIsRenameOpen(true);
              }}
              id="workspace-settings-btn"
            >
              Settings
            </Button>
          )}
          {canManageTeam ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => {
                setInviteResult(null);
                setInviteEmail('');
                setInviteRole('MEMBER');
                setIsInviteOpen(true);
              }}
              id="invite-member-btn"
            >
              Invite Member
            </Button>
          ) : (
            <span className="text-xs text-neutral-400 font-medium px-2 py-1 bg-neutral-50 rounded border border-neutral-200/60">
              Member View
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'members'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
            id="tab-members"
          >
            <Users2 className="w-4 h-4" />
            <span>Members</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 font-bold">
              {members.length}
            </span>
          </button>

          {canManageTeam && (
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'invitations'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
              id="tab-invitations"
            >
              <Mail className="w-4 h-4" />
              <span>Pending Invitations</span>
              {invitations.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
                  {invitations.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
            id="tab-audit"
          >
            <Clock className="w-4 h-4" />
            <span>Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
            id="tab-roles"
          >
            <Shield className="w-4 h-4" />
            <span>Roles & Permissions</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Members Table */}
      {activeTab === 'members' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Active Members</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                People with access to collaborative video scans and pre-publish risk reports.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-3 h-3" />}
              onClick={loadData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
                <span className="text-xs font-medium">Loading workspace team...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No members found for this workspace.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-neutral-200/80 bg-neutral-50/50 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {members.map((member) => {
                      const isCurrentUser = member.userId === user?.id;
                      const isMemberOwner = member.role === 'OWNER';
                      const canEditThisMember =
                        canManageTeam &&
                        !isMemberOwner &&
                        (!isCurrentUser || !isOwner);

                      const initials = (member.user?.fullName || member.user?.displayName || 'User')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr key={member.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                                  {member.user?.fullName || member.user?.displayName || 'PreScan User'}
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-medium">
                                      You
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-neutral-600">
                            {member.user?.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {canEditThisMember && isOwner ? (
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.userId, e.target.value as 'ADMIN' | 'MEMBER')
                                }
                                disabled={updatingRoleId === member.userId}
                                className="text-xs bg-white border border-neutral-300 rounded-md px-2 py-1 font-medium focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="MEMBER">Member</option>
                              </select>
                            ) : (
                              formatRoleBadge(member.role)
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-neutral-500">
                            {new Date(member.joinedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isMemberOwner ? (
                              <span className="text-[11px] text-neutral-400 font-medium">Workspace Owner</span>
                            ) : isCurrentUser ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberToRemove(member)}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              >
                                Leave
                              </Button>
                            ) : canManageTeam ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMemberToRemove(member)}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              >
                                Remove
                              </Button>
                            ) : (
                              <span className="text-[11px] text-neutral-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Pending Invitations */}
      {activeTab === 'invitations' && canManageTeam && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Pending Invitations</CardTitle>
              <CardDescription className="text-xs text-neutral-500">
                Invitations sent to collaborators awaiting acceptance.
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => {
                setInviteResult(null);
                setInviteEmail('');
                setInviteRole('MEMBER');
                setIsInviteOpen(true);
              }}
            >
              New Invitation
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {invitations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-neutral-500">
                <Mail className="w-8 h-8 text-neutral-300 mb-1" />
                <p className="text-sm font-semibold text-neutral-700">No Pending Invitations</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Invite teammates by email to give them access to scans, transcripts, and compliance reports.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-neutral-200/80 bg-neutral-50/50 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Recipient Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Expires</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {invitations.map((inv) => {
                      const expiresDate = new Date(inv.expiresAt);
                      const isExpired = expiresDate <= new Date();

                      return (
                        <tr key={inv.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-neutral-900">
                            {inv.email}
                          </td>

                          <td className="py-3.5 px-4">
                            {formatRoleBadge(inv.role)}
                          </td>

                          <td className="py-3.5 px-4">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                Expired
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-neutral-500">
                            {expiresDate.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvite(inv.id, inv.email)}
                                title="Resend invitation email"
                              >
                                Resend
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelInvite(inv.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                title="Cancel invitation"
                              >
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Audit Log */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Workspace Audit Trail</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Immutable event log tracking security, membership, and scan activities.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No audit events recorded yet for this workspace.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 text-xs">
                {auditLogs.map((log) => {
                  let meta: any = {};
                  try {
                    if (log.metadataJson) meta = JSON.parse(log.metadataJson);
                  } catch {
                    // ignore
                  }

                  return (
                    <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-neutral-50/50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700 mt-0.5">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-neutral-500 text-[11px] mt-0.5">
                            {log.targetResourceType && (
                              <span className="font-mono text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded mr-2">
                                {log.targetResourceType}: {log.targetResourceId || 'N/A'}
                              </span>
                            )}
                            {meta.email && `Email: ${meta.email} • `}
                            {meta.role && `Role: ${meta.role} • `}
                            {meta.name && `Name: ${meta.name}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-400 shrink-0">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Roles Reference Matrix */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-neutral-900 text-white">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <CardTitle className="text-sm font-bold">Owner</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-neutral-600 space-y-2">
                <p>Full authority across workspace governance, billing, member promotions, and destruction.</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
                  <li>Rename & delete workspace</li>
                  <li>Invite, promote & remove admins & members</li>
                  <li>Perform all video scans & compliance audits</li>
                  <li>Access audit logs & export reports</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-sm font-bold">Admin</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-neutral-600 space-y-2">
                <p>Operational control over collaborative scans, reports, and team invitations.</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
                  <li>Invite new team members</li>
                  <li>Rename workspace settings</li>
                  <li>Upload & analyze videos / YouTube URLs</li>
                  <li>View collaborative reports & findings</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                    <Users2 className="w-4 h-4 text-neutral-600" />
                  </div>
                  <CardTitle className="text-sm font-bold">Member</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-neutral-600 space-y-2">
                <p>Collaborator access to scan videos, view results, and review compliance feedback.</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
                  <li>Trigger PreScan AI on media files & YouTube</li>
                  <li>View real-time transcription & evidence</li>
                  <li>Inspect risk scorecards & remediation advice</li>
                  <li>Cannot manage team members or workspace settings</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal 1: Invite Member */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={() => !isInviting && setIsInviteOpen(false)}
        title="Invite Team Member"
        description={`Send an invitation to join ${organization?.name || 'this workspace'}.`}
      >
        {inviteResult ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Invitation generated and email notification queued.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">Direct Invitation Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteResult.inviteLink || ''}
                  className="flex-1 text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700 font-mono select-all focus:outline-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={copiedInviteId === 'result' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={() => copyToClipboard(inviteResult.inviteLink || '', 'result')}
                >
                  {copiedInviteId === 'result' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsInviteOpen(false);
                  setInviteResult(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4">
            <Input
              label="Recipient Email Address"
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={isInviting}
              required
              autoFocus
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">Role & Access Level</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInviteRole('MEMBER')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inviteRole === 'MEMBER'
                      ? 'border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <p className="font-bold text-xs text-neutral-900">Member</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Can run scans and view shared workspace reports.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setInviteRole('ADMIN')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    inviteRole === 'ADMIN'
                      ? 'border-neutral-900 bg-neutral-50/80 ring-1 ring-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <p className="font-bold text-xs text-neutral-900">Admin</p>
                  <p className="text-[11px] text-neutral-500 mt-1">Can invite teammates and manage workspace settings.</p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInviteOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isInviting}
                disabled={!inviteEmail.trim()}
              >
                Send Invitation
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Modal 2: Rename Workspace Settings */}
      <Dialog
        isOpen={isRenameOpen}
        onClose={() => !isRenaming && setIsRenameOpen(false)}
        title="Workspace Settings"
        description="Update your workspace display name."
      >
        <form onSubmit={handleRenameWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            disabled={isRenaming}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRenameOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isRenaming}
              disabled={!newWorkspaceName.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal 3: Remove Member / Leave Confirmation */}
      <Dialog
        isOpen={!!memberToRemove}
        onClose={() => !isRemoving && setMemberToRemove(null)}
        title={memberToRemove?.userId === user?.id ? 'Leave Workspace' : 'Remove Member'}
        description={
          memberToRemove?.userId === user?.id
            ? `Are you sure you want to leave ${organization?.name}? You will lose access to its scans and reports.`
            : `Are you sure you want to remove ${memberToRemove?.user?.fullName || memberToRemove?.user?.email} from ${organization?.name}?`
        }
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMemberToRemove(null)}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRemoveMember}
            isLoading={isRemoving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {memberToRemove?.userId === user?.id ? 'Leave Workspace' : 'Remove Member'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
