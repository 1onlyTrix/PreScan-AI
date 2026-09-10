import React from 'react';
import { Menu, Plus, HelpCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface TopbarProps {
  onToggleSidebar: () => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleSidebar,
  onNavigate,
  currentRoute,
}) => {
  return (
    <header className="h-14 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <IconButton
          variant="ghost"
          size="sm"
          ariaLabel="Toggle navigation menu"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5 text-neutral-700" />
        </IconButton>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="hidden sm:inline font-medium text-neutral-700">PreScan Engine</span>
          <span className="hidden sm:inline text-neutral-300">•</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Phase 01 Active</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<HelpCircle className="w-4 h-4 text-neutral-500" />}
          onClick={() => onNavigate('/features')}
          className="hidden sm:inline-flex text-neutral-600"
        >
          Documentation
        </Button>

        {currentRoute !== '/app/new-scan' && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => onNavigate('/app/new-scan')}
          >
            New Scan
          </Button>
        )}
      </div>
    </header>
  );
};
