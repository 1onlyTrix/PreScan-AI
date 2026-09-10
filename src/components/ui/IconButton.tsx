import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      ariaLabel,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0';

    const sizeStyles = {
      sm: 'w-8 h-8 p-1 text-xs',
      md: 'w-9.5 h-9.5 p-2 text-sm',
      lg: 'w-11 h-11 p-2.5 text-base',
    };

    const variantStyles = {
      primary:
        'bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:ring-neutral-900 border border-transparent shadow-xs',
      secondary:
        'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 focus-visible:ring-neutral-400 border border-transparent',
      outline:
        'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-400 shadow-xs',
      ghost:
        'bg-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-400 border border-transparent',
      destructive:
        'bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-500 border border-rose-200',
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
