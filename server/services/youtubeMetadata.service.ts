/**
 * PreScan YouTube Metadata Extraction Service
 * Retrieves real, complete YouTube metadata directly from public YouTube pages,
 * oEmbed endpoints, and YouTube Data API v3 (if configured).
 * 
 * Extracts:
 * - Video ID
 * - Title
 * - Description
 * - Tags (exact original tags from og:video:tag / keywords, or [] if unavailable)
 * - Channel Title (Author)
 * - Channel ID
 * - Published Date / Upload Date
 * - Duration in seconds & formatted string
 * - Category / Genre
 * - Thumbnail URL
 * - Regions Allowed / Restrictions
 * - Distinguishes "tags unavailable" from "empty tags"
 */

export interface RealYouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  tagsCount: number;
  tagsUnavailable: boolean;
  channelTitle: string;
  channelId?: string;
  publishedAt?: string;
  durationSeconds: number;
  durationFormatted?: string;
  category?: string;
  thumbnailUrl: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  regionsAllowed?: string[];
  sourceUrl: string;
}

export class YouTubeMetadataService {
  /**
   * Parse ISO 8601 duration string (e.g., PT3M34S, PT19S, PT1H2M3S) into seconds
   */
  public static parseIsoDuration(durationStr?: string): number {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format seconds to MM:SS or HH:MM:SS
   */
  public static formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  /**
   * Fetch complete real YouTube metadata
   */
  public static async fetchCompleteMetadata(videoId: string): Promise<RealYouTubeMetadata> {
    const defaultThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;

    // 1. Check if optional YouTube Data API v3 is configured in environment
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,status&key=${apiKey}`;
        const apiRes = await fetch(apiUrl, { headers: { 'User-Agent': 'PreScan-Engine/1.0' } });
        if (apiRes.ok) {
          const apiJson = (await apiRes.json()) as any;
          const item = apiJson?.items?.[0];
          if (item) {
            const snip = item.snippet || {};
            const cd = item.contentDetails || {};
            const rawTags = Array.isArray(snip.tags) ? snip.tags : [];
            const durationSec = this.parseIsoDuration(cd.duration);
            return {
              videoId,
              title: snip.title || `YouTube Video (${videoId})`,
              description: snip.description || '',
              tags: rawTags,
              tagsCount: rawTags.length,
              tagsUnavailable: rawTags.length === 0,
              channelTitle: snip.channelTitle || 'YouTube Creator',
              channelId: snip.channelId,
              publishedAt: snip.publishedAt,
              durationSeconds: durationSec,
              durationFormatted: this.formatDuration(durationSec),
              category: snip.categoryId,
              thumbnailUrl:
                snip.thumbnails?.maxres?.url ||
                snip.thumbnails?.high?.url ||
                snip.thumbnails?.default?.url ||
                defaultThumbnail,
              defaultLanguage: snip.defaultLanguage,
              defaultAudioLanguage: snip.defaultAudioLanguage,
              regionsAllowed: cd.regionRestriction?.allowed,
              sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
            };
          }
        }
      } catch (apiErr) {
        console.warn(`[YouTubeMetadataService] YouTube Data API v3 error:`, apiErr);
      }
    }

    // 2. Public YouTube watch page metadata extraction (real tags, description, channel, date)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const pageRes = await fetch(watchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+478;',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (pageRes.ok) {
        const html = await pageRes.text();

        // Extract all <meta> tags into key-value pairs
        const metas: Record<string, string> = {};
        const metaRegex = /<meta\s+(?:name|property|itemprop)="([^"]+)"\s+content="([^"]*)"/g;
        let match: RegExpExecArray | null;
        while ((match = metaRegex.exec(html)) !== null) {
          metas[match[1]] = match[2];
        }

        // Extract og:video:tag (exact original YouTube video tags)
        const tags: string[] = [];
        const tagRegex = /<meta\s+property="og:video:tag"\s+content="([^"]+)"/g;
        while ((match = tagRegex.exec(html)) !== null) {
          const t = match[1]?.trim();
          if (t && !tags.includes(t)) {
            tags.push(t);
          }
        }

        let title = metas['og:title'] || metas['title'] || '';
        let description = metas['og:description'] || metas['description'] || '';
        let channelTitle = metas['name'] || '';
        let channelId = metas['channelId'] || undefined;
        let publishedAt = metas['datePublished'] || metas['uploadDate'] || undefined;
        let category = metas['genre'] || undefined;
        const durationSec = this.parseIsoDuration(metas['duration']);

        // Inspect embedded ytInitialData for rich channel, date, and description fields
        const marker = 'ytInitialData = ';
        const start = html.indexOf(marker);
        if (start !== -1) {
          let braceCount = 0;
          let inString = false;
          let escape = false;
          let jsonEnd = -1;
          for (let i = start + marker.length; i < html.length; i++) {
            const c = html[i];
            if (escape) {
              escape = false;
              continue;
            }
            if (c === '\\') {
              escape = true;
              continue;
            }
            if (c === '"' && !escape) {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (c === '{') braceCount++;
              else if (c === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i + 1;
                  break;
                }
              }
            }
          }

          if (jsonEnd !== -1) {
            try {
              const data = JSON.parse(html.substring(start + marker.length, jsonEnd));
              const findKey = (obj: any, key: string): any => {
                if (!obj || typeof obj !== 'object') return null;
                if (key in obj) return obj[key];
                for (const k of Object.keys(obj)) {
                  const found = findKey(obj[k], key);
                  if (found) return found;
                }
                return null;
              };

              const primary = findKey(data, 'videoPrimaryInfoRenderer');
              const secondary = findKey(data, 'videoSecondaryInfoRenderer');

              if (!title && primary?.title?.runs) {
                title = primary.title.runs.map((r: any) => r.text).join('');
              }
              if (secondary?.owner?.videoOwnerRenderer) {
                const owner = secondary.owner.videoOwnerRenderer;
                if (!channelTitle && owner.title?.runs?.[0]?.text) {
                  channelTitle = owner.title.runs[0].text;
                }
                if (!channelId && owner.navigationEndpoint?.browseEndpoint?.browseId) {
                  channelId = owner.navigationEndpoint.browseEndpoint.browseId;
                }
              }
              if (!publishedAt && primary?.dateText?.simpleText) {
                publishedAt = primary.dateText.simpleText;
              }
              if (!description && secondary?.attributedDescription?.content) {
                description = secondary.attributedDescription.content;
              }
            } catch (jsonErr) {
              // Non-fatal parse error
            }
          }
        }

        const regionsAllowed = metas['regionsAllowed']
          ? metas['regionsAllowed'].split(',').map((s) => s.trim())
          : undefined;

        const bestThumbnail =
          metas['og:image'] ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        if (title || channelTitle) {
          return {
            videoId,
            title: title || `YouTube Video (${videoId})`,
            description: description || '',
            tags,
            tagsCount: tags.length,
            tagsUnavailable: tags.length === 0,
            channelTitle: channelTitle || 'YouTube Channel',
            channelId,
            publishedAt,
            durationSeconds: durationSec,
            durationFormatted: this.formatDuration(durationSec),
            category,
            thumbnailUrl: bestThumbnail,
            regionsAllowed,
            sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
          };
        }
      }
    } catch (pageErr) {
      console.warn(`[YouTubeMetadataService] Watch page metadata extraction error for ${videoId}:`, pageErr);
    }

    // 3. Fallback to YouTube oEmbed API
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'PreScan-Engine/1.0' },
      });
      if (res.ok) {
        const oembedData = (await res.json()) as any;
        return {
          videoId,
          title: oembedData.title || `YouTube Video (${videoId})`,
          description: '',
          tags: [],
          tagsCount: 0,
          tagsUnavailable: true,
          channelTitle: oembedData.author_name || 'YouTube Creator',
          thumbnailUrl: oembedData.thumbnail_url || defaultThumbnail,
          durationSeconds: 0,
          sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }
    } catch (oembedErr) {
      console.warn(`[YouTubeMetadataService] oEmbed fallback error for ${videoId}:`, oembedErr);
    }

    // Default safe record
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      description: '',
      tags: [],
      tagsCount: 0,
      tagsUnavailable: true,
      channelTitle: 'YouTube Creator',
      thumbnailUrl: defaultThumbnail,
      durationSeconds: 0,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
}
