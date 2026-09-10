import { ButtonHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      onCheckedChange,
      label,
      description,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const switchId = id || generatedId;

    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <div className={cn('flex items-center justify-between gap-4', disabled && 'opacity-60 cursor-not-allowed', className)}>
        {(label || description) && (
          <div className="flex-1 text-sm select-none">
            {label && (
              <label
                htmlFor={switchId}
                className={cn('font-medium text-neutral-800 cursor-pointer', disabled && 'cursor-not-allowed')}
                onClick={handleClick}
              >
                {label}
              </label>
            )}
            {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
          </div>
        )}
        <button
          id={switchId}
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleClick}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
            checked ? 'bg-neutral-900' : 'bg-neutral-200'
          )}
          {...props}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
              checked ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
