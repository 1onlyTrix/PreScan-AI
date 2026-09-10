import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, disabled, checked, ...props }, ref) => {
    const generatedId = useId();
    const radioId = id || generatedId;

    return (
      <div className={cn('flex items-start gap-2.5', disabled && 'opacity-60 cursor-not-allowed', className)}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={radioId}
            ref={ref}
            type="radio"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-4.5 h-4.5 rounded-full border border-neutral-300 bg-white transition-all flex items-center justify-center',
              'peer-checked:border-neutral-900',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900/20 peer-focus-visible:ring-offset-1',
              'hover:border-neutral-400 cursor-pointer peer-disabled:cursor-not-allowed'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-neutral-900 opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="text-sm select-none">
            {label && (
              <label
                htmlFor={radioId}
                className={cn('font-medium text-neutral-800 cursor-pointer', disabled && 'cursor-not-allowed')}
              >
                {label}
              </label>
            )}
            {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
