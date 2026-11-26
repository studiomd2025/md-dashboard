import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const RENDER_API_BASE = 'https://mddashboard.onrender.com';

export interface PlaylistTrackResult {
  videoId: string;
  title: string;
  thumbnail: string;
  url?: string;
  published?: string;
}

export interface PlaylistFetchResult {
  playlistId: string;
  title: string;
  items: PlaylistTrackResult[];
}

export function isNativeCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // ignore
  }
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:'
  );
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  if (isNativeCapacitor()) {
    return RENDER_API_BASE;
  }
  const host = window.location.hostname;
  if (
    host === 'mddashboard.onrender.com' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0'
  ) {
    return '';
  }
  return RENDER_API_BASE;
}

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonPayload<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as T;
  }
  return raw as T;
}

export async function fetchJsonWithRetry<T>(
  pathOrUrl: string,
  options: { timeoutMs?: number; retries?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const { timeoutMs = 45000, retries = 3, headers = {} } = options;
  const url = buildApiUrl(pathOrUrl);
  const native = isNativeCapacitor();
  let lastErr: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (native) {
        const res = await CapacitorHttp.get({
          url,
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            ...headers,
          },
          connectTimeout: timeoutMs,
          readTimeout: timeoutMs,
        });
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`HTTP ${res.status}`);
        }
        return parseJsonPayload<T>(res.data);
      }

      const controller =
        typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : null;
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            ...headers,
          },
          signal: controller ? controller.signal : undefined,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as T;
      } finally {
        if (timer !== null) window.clearTimeout(timer);
      }
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(1500 * attempt);
      }
    }
  }

  const formattedMsg =
    lastErr instanceof Error
      ? lastErr.message
      : typeof lastErr === 'object' && lastErr !== null
      ? (lastErr as any).message || (() => { try { return JSON.stringify(lastErr); } catch { return String(lastErr); } })()
      : String(lastErr);

  console.warn(`[apiClient] Fetch failed after ${retries} attempts for ${url}: ${formattedMsg}`);
  throw lastErr instanceof Error ? lastErr : new Error(formattedMsg);
}

function extractYtTitle(titleObj: unknown): string {
  if (!titleObj) return '';
  if (typeof titleObj === 'string') return titleObj;
  if (typeof titleObj !== 'object') return '';
  const obj = titleObj as Record<string, unknown>;
  if (typeof obj.content === 'string') return obj.content;
  if (Array.isArray(obj.runs)) {
    return obj.runs
      .map((r) => (r && typeof r === 'object' && typeof (r as any).text === 'string' ? (r as any).text : ''))
      .join('');
  }
  if (typeof obj.simpleText === 'string') return obj.simpleText;
  return '';
}

function parseYouTubeRssXml(xmlText: string, playlistId: string): PlaylistFetchResult | null {
  if (!xmlText || typeof DOMParser === 'undefined') return null;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const feedTitleEl =
    xmlDoc.getElementsByTagName('title')[0] ||
    xmlDoc.querySelector('feed > title, channel > title');
  const feedTitle = feedTitleEl?.textContent?.trim() || 'YouTube Playlist';

  const entries = Array.from(xmlDoc.getElementsByTagName('entry'));
  const items: PlaylistTrackResult[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const ytNs = 'http://www.youtube.com/xml/schemas/2015';
    const videoIdEl =
      entry.getElementsByTagNameNS(ytNs, 'videoId')[0] ||
      entry.getElementsByTagName('yt:videoId')[0] ||
      entry.getElementsByTagName('videoId')[0];
    const titleEl = entry.getElementsByTagName('title')[0];
    const pubEl = entry.getElementsByTagName('published')[0];

    const videoId = videoIdEl?.textContent?.trim() || '';
    const title = titleEl?.textContent?.trim() || '';
    const published = pubEl?.textContent?.trim() || '';

    if (videoId && title && !seen.has(videoId)) {
      seen.add(videoId);
      items.push({
        videoId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        ...(published ? { published } : {}),
      });
    }
  }

  return items.length > 0 ? { playlistId, title: feedTitle, items } : null;
}

async function fetchYouTubePlaylistNativeDirect(
  playlistId: string
): Promise<PlaylistFetchResult | null> {
  const items: PlaylistTrackResult[] = [];
  const seen = new Set<string>();
  let playlistTitle = 'YouTube Playlist';

  const pushItem = (rawId: unknown, rawTitle: unknown) => {
    const videoId = typeof rawId === 'string' ? rawId.trim() : '';
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    if (videoId && title && title !== 'Private video' && title !== 'Deleted video' && !seen.has(videoId)) {
      seen.add(videoId);
      items.push({
        videoId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  };

  try {
    const pageRes = await CapacitorHttp.get({
      url: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAI;',
      },
      responseType: 'text',
      connectTimeout: 20000,
      readTimeout: 20000,
    });

    if (pageRes.status >= 200 && pageRes.status < 300 && typeof pageRes.data === 'string') {
      const html = pageRes.data;
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        playlistTitle = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim() || playlistTitle;
      }

      const match =
        html.match(/var ytInitialData\s*=\s*({[\s\S]*?});\s*<\/script>/) ||
        html.match(/var ytInitialData\s*=\s*({[\s\S]*?});/);

      if (match) {
        const data = JSON.parse(match[1]) as any;
        const metaTitle = data?.metadata?.playlistMetadataRenderer?.title;
        if (typeof metaTitle === 'string' && metaTitle.trim()) {
          playlistTitle = metaTitle.trim();
        }

        const seenTokens = new Set<string>();
        const queueTokens: string[] = [];

        const findContinuationToken = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          if (typeof obj.continuationCommand?.token === 'string') {
            return obj.continuationCommand.token;
          }
          for (const k of Object.keys(obj)) {
            const found = findContinuationToken(obj[k]);
            if (found) return found;
          }
          return null;
        };

        const enqueueToken = (token: string | null) => {
          if (token && !seenTokens.has(token)) {
            seenTokens.add(token);
            queueTokens.push(token);
          }
        };

        const processEntries = (entries: any) => {
          if (!Array.isArray(entries)) return;
          for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            if (entry.playlistVideoListRenderer?.contents) {
              processEntries(entry.playlistVideoListRenderer.contents);
              continue;
            }
            if (entry.lockupViewModel) {
              const lvm = entry.lockupViewModel;
              if (!lvm.contentType || lvm.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
                const vid =
                  lvm.contentId ||
                  lvm.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId ||
                  '';
                const title = extractYtTitle(lvm.metadata?.lockupMetadataViewModel?.title);
                pushItem(vid, title);
              }
              continue;
            }
            if (entry.playlistVideoRenderer) {
              pushItem(entry.playlistVideoRenderer.videoId, extractYtTitle(entry.playlistVideoRenderer.title));
              continue;
            }
            if (entry.playlistPanelVideoRenderer) {
              pushItem(
                entry.playlistPanelVideoRenderer.videoId,
                extractYtTitle(entry.playlistPanelVideoRenderer.title)
              );
              continue;
            }
            if (entry.continuationItemRenderer) {
              enqueueToken(findContinuationToken(entry.continuationItemRenderer));
              continue;
            }
            if (entry.continuationItemViewModel) {
              enqueueToken(findContinuationToken(entry.continuationItemViewModel));
              continue;
            }
          }
        };

        const extractRecursive = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.lockupViewModel) {
            processEntries([{ lockupViewModel: obj.lockupViewModel }]);
            return;
          }
          if (obj.playlistVideoRenderer) {
            processEntries([{ playlistVideoRenderer: obj.playlistVideoRenderer }]);
            return;
          }
          if (obj.playlistPanelVideoRenderer) {
            processEntries([{ playlistPanelVideoRenderer: obj.playlistPanelVideoRenderer }]);
            return;
          }
          if (obj.continuationItemRenderer || obj.continuationItemViewModel) {
            enqueueToken(findContinuationToken(obj.continuationItemRenderer || obj.continuationItemViewModel));
            return;
          }
          for (const k of Object.keys(obj)) {
            extractRecursive(obj[k]);
          }
        };

        const primary =
          data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        if (Array.isArray(primary)) {
          processEntries(primary);
        } else {
          extractRecursive(data);
        }

        let pages = 0;
        while (queueTokens.length > 0 && pages < 8) {
          const token = queueTokens.shift()!;
          pages += 1;
          try {
            const postRes = await CapacitorHttp.post({
              url: 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+999; SOCS=CAI;',
              },
              data: {
                context: {
                  client: {
                    clientName: 'WEB',
                    clientVersion: '2.20240101.00.00',
                    hl: 'en',
                    gl: 'US',
                  },
                },
                continuation: token,
              },
              connectTimeout: 20000,
              readTimeout: 20000,
            });
            if (postRes.status < 200 || postRes.status >= 300) break;
            const postData = parseJsonPayload<any>(postRes.data);
            const actions = Array.isArray(postData?.onResponseReceivedActions)
              ? postData.onResponseReceivedActions
              : [];
            let handled = false;
            for (const action of actions) {
              const contItems =
                action?.appendContinuationItemsAction?.continuationItems ||
                action?.reloadContinuationItemsCommand?.continuationItems;
              if (Array.isArray(contItems)) {
                handled = true;
                processEntries(contItems);
              }
            }
            if (!handled) {
              extractRecursive(postData);
            }
          } catch {
            break;
          }
        }
      }
    }
  } catch {
    // Fall through to RSS
  }

  if (items.length > 0) {
    return { playlistId, title: playlistTitle, items };
  }

  try {
    const rssRes = await CapacitorHttp.get({
      url: `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyDiariesBot/1.0)',
      },
      responseType: 'text',
      connectTimeout: 15000,
      readTimeout: 15000,
    });
    if (rssRes.status >= 200 && rssRes.status < 300 && typeof rssRes.data === 'string') {
      return parseYouTubeRssXml(rssRes.data, playlistId);
    }
  } catch {
    // Ignore
  }

  return null;
}

async function fetchYouTubePlaylistWebFallback(
  playlistId: string
): Promise<PlaylistFetchResult | null> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const xmlText = await res.text();
    return parseYouTubeRssXml(xmlText, playlistId);
  } catch {
    return null;
  }
}

export async function fetchYouTubePlaylist(
  playlistId: string
): Promise<PlaylistFetchResult | null> {
  const native = isNativeCapacitor();

  // Primary: Backend /api/youtube-playlist (uses YOUTUBE_API_KEY + full ytInitialData scraper)
  try {
    const data = await fetchJsonWithRetry<{
      playlistId?: string;
      title?: string;
      items?: PlaylistTrackResult[];
      error?: string;
    }>(`/api/youtube-playlist?list=${encodeURIComponent(playlistId)}&_t=${Date.now()}`, {
      timeoutMs: 45000,
      retries: 2,
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length > 0) {
      return {
        playlistId,
        title: data.title || 'YouTube Playlist',
        items,
      };
    }
  } catch {
    // Fall through to direct fallback
  }

  // Fallback: On native Capacitor, scrape full YouTube playlist directly without CORS or 15-item limit
  if (native) {
    const direct = await fetchYouTubePlaylistNativeDirect(playlistId);
    if (direct && direct.items.length > 0) {
      return direct;
    }
  } else {
    const webFallback = await fetchYouTubePlaylistWebFallback(playlistId);
    if (webFallback && webFallback.items.length > 0) {
      return webFallback;
    }
  }

  return null;
}
