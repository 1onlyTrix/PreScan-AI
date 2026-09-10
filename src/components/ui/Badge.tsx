import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { RiskLevel } from '../../types';
import { RISK_CONFIG } from '../../config/theme';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
  riskLevel?: RiskLevel;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  riskLevel,
  size = 'md',
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles = {
    default: 'bg-neutral-900 text-white border-transparent',
    neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  let appliedStyle = variantStyles[variant];

  if (riskLevel) {
    appliedStyle = RISK_CONFIG[riskLevel].badgeClass;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border leading-none shrink-0 select-none whitespace-nowrap',
        sizeStyles[size],
        appliedStyle,
        className
      )}
      {...props}
    >
      {riskLevel && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full ring-2',
            RISK_CONFIG[riskLevel].indicatorDotClass
          )}
          aria-hidden="true"
        />
      )}
      {children || (riskLevel ? RISK_CONFIG[riskLevel].label : null)}
    </span>
  );
};
