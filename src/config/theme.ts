import { RiskLevel } from '../types';

/**
 * Design System Tokens & Semantic Color Mappings
 * Strict, restrained professional palette with semantic risk indicators.
 */

export const THEME_COLORS = {
  // Neutral Canvas
  background: 'bg-neutral-50',
  surface: 'bg-white',
  surfaceSubtle: 'bg-neutral-100/70',
  border: 'border-neutral-200',
  borderSubtle: 'border-neutral-100',
  borderHover: 'hover:border-neutral-300',
  
  // Typography
  textPrimary: 'text-neutral-900',
  textSecondary: 'text-neutral-600',
  textMuted: 'text-neutral-400',
  textInverse: 'text-white',

  // Primary Accent (Deep Indigo/Slate)
  accent: {
    base: 'bg-neutral-900 hover:bg-neutral-800 text-white',
    ring: 'focus-visible:ring-neutral-900',
    subtle: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  },
};

/**
 * Semantic Risk Configuration
 * GREEN = Low risk / positive
 * YELLOW = Review required
 * RED = Important review
 * GRAY = Insufficient / Not analyzed
 */
export const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    badgeClass: string;
    indicatorDotClass: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
    iconColor: string;
  }
> = {
  [RiskLevel.LOW]: {
    label: 'Low Risk',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indicatorDotClass: 'bg-emerald-500 ring-emerald-100',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50/50',
    iconColor: 'text-emerald-600',
  },
  [RiskLevel.REVIEW_REQUIRED]: {
    label: 'Review Required',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    indicatorDotClass: 'bg-amber-500 ring-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50/50',
    iconColor: 'text-amber-600',
  },
  [RiskLevel.IMPORTANT]: {
    label: 'Important Review',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    indicatorDotClass: 'bg-rose-500 ring-rose-100',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    bgClass: 'bg-rose-50/50',
    iconColor: 'text-rose-600',
  },
  [RiskLevel.INSUFFICIENT_DATA]: {
    label: 'Not Analyzed',
    badgeClass: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    indicatorDotClass: 'bg-neutral-400 ring-neutral-100',
    textClass: 'text-neutral-600',
    borderClass: 'border-neutral-200',
    bgClass: 'bg-neutral-50',
    iconColor: 'text-neutral-400',
  },
};
