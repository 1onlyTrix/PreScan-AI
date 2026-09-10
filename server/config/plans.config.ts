export interface PlanConfig {
  id: string;
  key: 'FREE' | 'PRO' | 'BUSINESS';
  name: string;
  description: string;
  monthlyPrice: number;
  currency: string;
  scanLimit: number;
  maxVideoDurationSeconds: number; // in seconds: 600 (10 min), 3600 (60 min), 10800 (180 min)
  maxMembers: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  badge?: string;
  isPopular?: boolean;
}

export const PLANS_CONFIG: Record<'FREE' | 'PRO' | 'BUSINESS', PlanConfig> = {
  FREE: {
    id: 'plan_free',
    key: 'FREE',
    name: 'Free',
    description: 'For creators exploring pre-upload risk detection and testing short content.',
    monthlyPrice: 0,
    currency: 'USD',
    scanLimit: 5,
    maxVideoDurationSeconds: 600, // 10 minutes
    maxMembers: 3,
    features: [
      'basic_analysis',
      'basic_reports',
      'scan_history',
    ],
    isActive: true,
    displayOrder: 1,
  },
  PRO: {
    id: 'plan_pro',
    key: 'PRO',
    name: 'Pro',
    description: 'For active creators publishing regular high-risk or monetized content.',
    monthlyPrice: 19,
    currency: 'USD',
    scanLimit: 100,
    maxVideoDurationSeconds: 3600, // 60 minutes
    maxMembers: 10,
    features: [
      'basic_analysis',
      'full_analysis',
      'basic_reports',
      'full_reports',
      'scan_history',
      'team_collaboration',
      'priority_processing',
    ],
    isActive: true,
    displayOrder: 2,
    badge: 'MOST POPULAR',
    isPopular: true,
  },
  BUSINESS: {
    id: 'plan_business',
    key: 'BUSINESS',
    name: 'Business',
    description: 'For studios, agencies, and high-volume media production teams.',
    monthlyPrice: 49,
    currency: 'USD',
    scanLimit: 500,
    maxVideoDurationSeconds: 10800, // 180 minutes
    maxMembers: 25,
    features: [
      'basic_analysis',
      'full_analysis',
      'basic_reports',
      'full_reports',
      'scan_history',
      'team_collaboration',
      'priority_processing',
      'advanced_analytics',
    ],
    isActive: true,
    displayOrder: 3,
  },
};

export const DEFAULT_PLAN_KEY: 'FREE' = 'FREE';
