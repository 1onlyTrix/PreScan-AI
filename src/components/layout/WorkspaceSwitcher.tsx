import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check, Plus, Building2, Shield, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const WorkspaceSwitcher: React.FC = () => {
  const { organization, membership, workspaces, switchWorkspace, createWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeWsName = organization?.name || 'Workspace';
  const role = membership?.role || 'OWNER';

  const handleSelectWorkspace = async (wsId: string) => {
    if (wsId === organization?.id) {
      setIsOpen(false);
      return;
    }
    try {
      setIsSwitching(wsId);
      await switchWorkspace(wsId);
      setIsOpen(false);
    } catch (err: any) {
      console.error('Failed to switch workspace:', err);
    } finally {
      setIsSwitching(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      setCreateError('Please enter a workspace name.');
      return;
    }
    try {
      setIsCreating(true);
      setCreateError(null);
      await createWorkspace(newWorkspaceName.trim());
      setIsCreateModalOpen(false);
      setNewWorkspaceName('');
      setIsOpen(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2.5 p-2 rounded-lg border border-neutral-200/80 bg-white hover:bg-neutral-50/80 transition-colors text-left group"
          aria-label="Select workspace"
          id="workspace-switcher-button"
        >
          <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-900 truncate">
              {activeWsName}
            </p>
            <p className="text-[10px] text-neutral-500 font-medium">
              {role.toUpperCase()} • Multi-Tenant
            </p>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Workspaces ({workspaces.length || 1})
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {workspaces.length > 0 ? (
                workspaces.map((ws) => {
                  const isActive = ws.id === organization?.id;
                  const isCurrentSwitching = isSwitching === ws.id;

                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws.id)}
                      disabled={isCurrentSwitching}
                      className={`w-full flex items-center justify-between p-2 rounded-md text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-neutral-900 text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{ws.name}</span>
                          {ws.role && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 uppercase ${
                                isActive
                                  ? 'bg-neutral-800 text-neutral-300'
                                  : 'bg-neutral-200/80 text-neutral-600'
                              }`}
                            >
                              {ws.role}
                            </span>
                          )}
                        </div>
                      </div>
                      {isCurrentSwitching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : isActive ? (
                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="flex items-center justify-between p-2 rounded-md bg-neutral-900 text-white text-xs font-medium">
                  <span className="truncate">{activeWsName}</span>
                  <Check className="w-3.5 h-3.5 text-white shrink-0" />
                </div>
              )}
            </div>

            <div className="my-1 border-t border-neutral-100" />

            <button
              onClick={() => {
                setIsCreateModalOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors text-left"
              id="create-workspace-menu-item"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-500" />
              <span>Create New Workspace</span>
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        title="Create Workspace"
        description="Workspaces provide dedicated, isolated environments for team members, scans, and reports."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="e.g. Media Production Team, Studio Alpha"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            error={createError || undefined}
            disabled={isCreating}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreating}
              disabled={!newWorkspaceName.trim()}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

