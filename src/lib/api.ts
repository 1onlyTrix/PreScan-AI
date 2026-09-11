import { supabase } from '../supabaseClient';

export const TOKEN_STORAGE_KEY = 'prescan_auth_token';
export const WORKSPACE_STORAGE_KEY = 'prescan_active_workspace';

/**
 * Retrieve the configured production API base URL.
 * Checks VITE_API_BASE_URL. Returns empty string if not set (defaults to relative same-origin calls in dev/container).
 */
export function getApiBaseUrl(): string {
  try {
    let url = '';
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      url = import.meta.env.VITE_API_BASE_URL || '';
    }
    if (!url && typeof process !== 'undefined' && process.env) {
      url = process.env.VITE_API_BASE_URL || '';
    }
    if (!url) return '';
    return url.trim().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * Safely constructs an absolute or relative API URL without double slashes.
 */
export function getApiUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Retrieve the active session token from client localStorage
 */
export function getStoredToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const directToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (directToken && directToken.trim()) return directToken.trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * Asynchronously retrieve a fresh, valid authentication token from Supabase session,
 * syncing with localStorage and falling back to stored token.
 */
export async function getValidAuthToken(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && supabase?.auth) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        setStoredToken(data.session.access_token);
        return data.session.access_token;
      }
    }
  } catch {
    // Fall back to stored token
  }
  return getStoredToken();
}

/**
 * Persist or clear the active session token
 */
export function setStoredToken(token: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in sandboxed environments
  }
}

/**
 * Retrieve the active workspace ID from client localStorage
 */
export function getStoredWorkspaceId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist or clear the active workspace ID
 */
export function setStoredWorkspaceId(workspaceId: string | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (workspaceId) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generate standard request headers with Authorization Bearer and Workspace headers
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const activeWsId = getStoredWorkspaceId();
  if (activeWsId) {
    headers['x-workspace-id'] = activeWsId;
    headers['x-organization-id'] = activeWsId;
  }
  return headers;
}

/**
 * Authenticated fetch helper that automatically attaches credentials, Bearer token, and active workspace ID
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const targetUrl = getApiUrl(url);
  const token = (await getValidAuthToken()) || getStoredToken();
  const activeWsId = getStoredWorkspaceId();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (token?.startsWith('demo_')) {
    const raw = token.replace('demo_', '');
    if (!headers.has('x-demo-user')) {
      headers.set('x-demo-user', raw);
    }
  }

  if (activeWsId && !headers.has('x-workspace-id')) {
    headers.set('x-workspace-id', activeWsId);
    headers.set('x-organization-id', activeWsId);
  }

  try {
    const res = await fetch(targetUrl, {
      ...options,
      headers,
      credentials: options.credentials || 'include',
    });

    // Detect HTML response when an API endpoint was requested
    const contentType = res.headers.get('content-type') || '';
    if (url.includes('/api/') && contentType.includes('text/html')) {
      const errorBody = JSON.stringify({
        success: false,
        error: 'PreScan backend service is unavailable or returned an invalid HTML response. Please verify VITE_API_BASE_URL points to your deployed Express backend.',
        code: 'BACKEND_UNAVAILABLE',
        isHtmlFallback: true,
      });
      return new Response(errorBody, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return res;
  } catch (netErr: any) {
    const errorBody = JSON.stringify({
      success: false,
      error: 'Unable to connect to the PreScan backend service. Please verify network connectivity and CORS configuration on your backend.',
      code: 'NETWORK_ERROR',
    });
    return new Response(errorBody, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


