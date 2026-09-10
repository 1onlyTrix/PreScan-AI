import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  FileCheck2,
  FolderKanban,
  Users2,
  Plug2,
  CreditCard,
  Settings,
  Sparkles,
  Palette,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { AccountMenu } from './AccountMenu';
import { IconButton } from '../ui/IconButton';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const workspaceNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/app/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'new-scan',
      label: 'New Scan',
      href: '/app/new-scan',
      icon: <PlusCircle className="w-4 h-4" />,
    },
    {
      id: 'scans',
      label: 'Scan History',
      href: '/app/scans',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      href: '/app/reports',
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      id: 'projects',
      label: 'Projects',
      href: '/app/projects',
      icon: <FolderKanban className="w-4 h-4" />,
    },
  ];

  const managementNavItems: NavItem[] = [
    {
      id: 'team',
      label: 'Team & Access',
      href: '/app/team',
      icon: <Users2 className="w-4 h-4" />,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      href: '/app/integrations',
      icon: <Plug2 className="w-4 h-4" />,
      badge: 'YouTube',
    },
    {
      id: 'billing',
      label: 'Billing & Plans',
      href: '/app/billing',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/app/settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const developerNavItems: NavItem[] = [
    {
      id: 'design-system',
      label: 'Design System & UI',
      href: '/app/design-system',
      icon: <Palette className="w-4 h-4" />,
      badge: 'Phase 01',
    },
  ];

  const renderNavList = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = currentRoute === item.href;
        return (
          <li key={item.id}>
            <button
              onClick={() => {
                onNavigate(item.href);
                onClose();
              }}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none group',
                isActive
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-800')}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-tight',
                    isActive ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo and Brand Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <button
            onClick={() => {
              onNavigate('/app/dashboard');
              onClose();
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tighter text-sm shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-neutral-900">
                  Pre<span className="text-neutral-500">Scan</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded border border-neutral-200">
                  v0.1
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">
                QA for YouTube Creators
              </p>
            </div>
          </button>

          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Close sidebar"
            onClick={onClose}
            className="lg:hidden -mr-1"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </IconButton>
        </div>

        {/* Workspace Dropdown */}
        <div className="p-3 border-b border-neutral-100">
          <WorkspaceSwitcher />
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Workspace
            </div>
            {renderNavList(workspaceNavItems)}
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Workspace Management
            </div>
            {renderNavList(managementNavItems)}
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Foundation Inspection
            </div>
            {renderNavList(developerNavItems)}
          </div>
        </div>

        {/* Footer Account Section */}
        <div className="p-3 border-t border-neutral-100 bg-neutral-50/50">
          <AccountMenu onNavigate={onNavigate} />
        </div>
      </aside>
    </>
  );
};
