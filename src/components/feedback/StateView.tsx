import React, { ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { EmptyState, EmptyStateProps } from '../ui/EmptyState';
import { Button } from '../ui/Button';

export interface StateViewProps {
  state: 'loading' | 'empty' | 'error' | 'success';
  loadingText?: string;
  emptyProps?: EmptyStateProps;
  errorMessage?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({
  state,
  loadingText = 'Loading data...',
  emptyProps,
  errorMessage = 'Failed to load content. Please try again.',
  onRetry,
  children,
}) => {
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500 mb-3" />
        <p className="text-xs text-neutral-500 font-medium">{loadingText}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-neutral-900 mb-1">Unable to load data</p>
        <p className="text-xs text-neutral-500 mb-4">{errorMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (state === 'empty' && emptyProps) {
    return <EmptyState {...emptyProps} />;
  }

  return <>{children}</>;
};
