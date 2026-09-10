/**
 * Input and schema validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateVideoMetadata(metadata: {
  title: string;
  description?: string;
  tags?: string[];
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!metadata.title || metadata.title.trim().length === 0) {
    errors.title = 'Video title is required';
  } else if (metadata.title.length > 100) {
    errors.title = 'Video title cannot exceed 100 characters';
  }

  if (metadata.description && metadata.description.length > 5000) {
    errors.description = 'Description cannot exceed 5,000 characters';
  }

  if (metadata.tags && metadata.tags.length > 50) {
    errors.tags = 'Cannot exceed 50 tags';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateOrganizationName(name: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Workspace name must be at least 2 characters';
  } else if (name.length > 50) {
    errors.name = 'Workspace name cannot exceed 50 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Extracts YouTube 11-character video ID from common URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Prepend https:// if missing to enable standard URL parsing
  const urlToParse = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(urlToParse);
    const hostname = parsed.hostname.toLowerCase();

    // Standard youtube.com domains
    if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    ) {
      // 1. /watch?v=VIDEO_ID
      if (parsed.pathname === '/watch') {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
          return v;
        }
      }
      // 2. /shorts/VIDEO_ID
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) {
        return shortsMatch[1];
      }
      // 3. /embed/VIDEO_ID
      const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) {
        return embedMatch[1];
      }
      // 4. /v/VIDEO_ID
      const vMatch = parsed.pathname.match(/^\/v\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) {
        return vMatch[1];
      }
    }

    // Short domain: youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const match = parsed.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
      if (match) {
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function validateYouTubeUrl(input: string): {
  isValid: boolean;
  videoId?: string;
  error?: string;
} {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Enter a valid YouTube video URL.',
    };
  }

  const videoId = extractYouTubeVideoId(trimmed);
  if (!videoId) {
    return {
      isValid: false,
      error: 'Enter a valid YouTube video URL.',
    };
  }

  return {
    isValid: true,
    videoId,
  };
}

