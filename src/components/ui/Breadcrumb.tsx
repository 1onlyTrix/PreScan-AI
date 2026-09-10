import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-neutral-500', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />}
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className={cn(
                    'flex items-center gap-1.5 hover:text-neutral-900 transition-colors',
                    isLast ? 'font-medium text-neutral-900 pointer-events-none' : 'text-neutral-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              ) : item.href ? (
                <a
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 hover:text-neutral-900 transition-colors',
                    isLast ? 'font-medium text-neutral-900 pointer-events-none' : 'text-neutral-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </a>
              ) : (
                <span
                  className={cn('flex items-center gap-1.5', isLast ? 'font-medium text-neutral-900' : 'text-neutral-500')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
