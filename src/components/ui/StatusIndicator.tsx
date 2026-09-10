import React from 'react';
import { RiskLevel } from '../../types';
import { RISK_CONFIG } from '../../config/theme';
import { cn } from '../../utils/cn';

export interface StatusIndicatorProps {
  level: RiskLevel;
  showText?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  level,
  showText = true,
  className,
  size = 'md',
}) => {
  const config = RISK_CONFIG[level];

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'rounded-full ring-4 shrink-0 transition-colors',
          dotSizes[size],
          config.indicatorDotClass
        )}
        aria-hidden="true"
      />
      {showText && (
        <span className={cn('text-xs font-medium tracking-tight', config.textClass)}>
          {config.label}
        </span>
      )}
    </div>
  );
};
