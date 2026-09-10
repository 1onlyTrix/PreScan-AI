import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, disabled, checked, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <div className={cn('flex items-start gap-2.5', disabled && 'opacity-60 cursor-not-allowed', className)}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-4.5 h-4.5 rounded border border-neutral-300 bg-white transition-all flex items-center justify-center',
              'peer-checked:bg-neutral-900 peer-checked:border-neutral-900',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900/20 peer-focus-visible:ring-offset-1',
              'hover:border-neutral-400 cursor-pointer peer-disabled:cursor-not-allowed'
            )}
          >
            <Check className="w-3 h-3 text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="text-sm select-none">
            {label && (
              <label
                htmlFor={checkboxId}
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

Checkbox.displayName = 'Checkbox';
