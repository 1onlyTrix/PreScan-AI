import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, CreditCard, Shield, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../router/routes';

interface AccountMenuProps {
  onNavigate?: (route: string) => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ onNavigate }) => {
  const { user, organization, membership, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
    onNavigate?.(ROUTES.LOGIN);
  };

  const displayName = user?.displayName || user?.fullName || 'Creator';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'CR';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2.5 p-2 rounded-lg border border-transparent hover:bg-neutral-100/80 transition-colors text-left group"
        aria-label="Account options"
      >
        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-neutral-900 truncate">
            {displayName}
          </p>
          <p className="text-[10px] text-neutral-400 font-mono truncate">
            {user?.email || 'Authenticated'}
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 p-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100 min-w-[200px]">
          <div className="px-2.5 py-2 border-b border-neutral-100">
            <p className="text-xs font-bold text-neutral-900 truncate">{displayName}</p>
            <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{membership?.role || 'Owner'} Role • Verified</span>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate?.(ROUTES.SETTINGS);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors text-left"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              <span>Profile & Workspace Settings</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate?.(ROUTES.BILLING);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors text-left"
            >
              <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
              <span>Billing & Subscription</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onNavigate?.(ROUTES.HOME);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors text-left"
            >
              <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
              <span>Public Marketing Site</span>
            </button>
          </div>

          <div className="my-1 border-t border-neutral-100" />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
