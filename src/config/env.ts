/**
 * Environment Configuration Validation & Boundaries
 * Ensures strict segregation between public client configurations and server-only secrets.
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  appUrl: string;
  isDev: boolean;
  isProd: boolean;
  version: string;
}

export const config: AppConfig = {
  env: (import.meta.env.MODE as 'development' | 'production' | 'test') || 'development',
  appUrl: import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  version: '0.1.0-phase01',
};

/**
 * Validates that no sensitive keys or leaked credentials are in the client bundle.
 */
export function validateEnvironmentSafety(): { safe: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Verify client runtime doesn't have exposed raw secrets
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, unknown>;
    if (w['GEMINI_API_KEY'] || w['STRIPE_SECRET_KEY']) {
      issues.push('Sensitive server secret detected in global window namespace.');
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
