import type { DiaryFont, EmbedKind, MediaAttachment } from '../types';

export function normalizeTag(raw: string): string {
  return raw.replace(/^#+/, '').replace(/[^\p{L}\p{N}_-]/gu, '').trim();
}

export function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeShortsToWatchUrl(url: string): string {
  if (!url) return '';
  if (url.includes('/shorts/')) {
    const parts = url.split('/shorts/');
    const rest = parts[1] || '';
    const videoId = rest.split('?')[0].split('/')[0];
    const search = rest.includes('?') ? '?' + rest.split('?')[1] : '';
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}${search ? '&' + search.replace(/^\?/, '') : ''}`;
    }
  }
  return url;
}

export function extractInlineHashtags(title: string, bodyHtml: string): string[] {
  const plainBody = stripHtml(bodyHtml);
  const combined = `${title}\n${plainBody}`;
  const regex = /(?:^|[\s(>])#([\p{L}\p{N}_-]{2,40})/gu;
  const seen = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(combined)) !== null) {
    const tag = match[1];
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, tag);
    }
  }
  return Array.from(seen.values());
}

export function getMergedPostTags(post: { manualTags: string[]; inlineTags: string[] }): string[] {
  const seen = new Map<string, string>();
  for (const raw of [...(post.inlineTags || []), ...(post.manualTags || [])]) {
    const clean = normalizeTag(raw);
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (!seen.has(lower)) seen.set(lower, clean);
  }
  return Array.from(seen.values());
}

export function sanitizeRichHtml(input: string): string {
  if (!input) return '';
  if (typeof DOMParser === 'undefined') {
    return input;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const allowedTags = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
    'SPAN', 'DIV', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'A', 'FONT'
  ]);

  function walk(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const el = node as HTMLElement;
    let tagName = el.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      const frag = document.createDocumentFragment();
      el.childNodes.forEach((child) => {
        const cleaned = walk(child);
        if (cleaned) frag.appendChild(cleaned);
      });
      return frag;
    }

    if (tagName === 'FONT') {
      tagName = 'SPAN';
    }

    const out = document.createElement(tagName.toLowerCase());
    if (tagName === 'A') {
      const href = el.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href) || href.startsWith('/')) {
        out.setAttribute('href', href);
        out.setAttribute('target', '_blank');
        out.setAttribute('rel', 'noopener noreferrer');
      }
    }

    const colorAttr = el.getAttribute('color');
    const styleColor = el.style?.color;
    const styleFont = el.style?.fontFamily;
    const styleParts: string[] = [];
    if (styleColor) {
      styleParts.push(`color: ${styleColor}`);
    } else if (colorAttr) {
      styleParts.push(`color: ${colorAttr}`);
    }
    if (styleFont) {
      styleParts.push(`font-family: ${styleFont}`);
    }
    if (el.style?.textDecoration && el.style.textDecoration.includes('underline')) {
      styleParts.push('text-decoration: underline');
    }
    if (styleParts.length > 0) {
      out.setAttribute('style', styleParts.join('; '));
    }

    el.childNodes.forEach((child) => {
      const cleaned = walk(child);
      if (cleaned) out.appendChild(cleaned);
    });
    return out;
  }

  const container = document.createElement('div');
  doc.body.childNodes.forEach((child) => {
    const cleaned = walk(child);
    if (cleaned) container.appendChild(cleaned);
  });
  return container.innerHTML;
}

export function parsePlayableMediaUrl(rawUrl: string): {
  kind: EmbedKind | null;
  embedUrl: string | null;
  suggestedType: MediaAttachment['type'];
  defaultTitle: string;
} {
  const trimmed = rawUrl.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: null, embedUrl: null, suggestedType: 'link', defaultTitle: trimmed };
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube Playlist or Video
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    const listId = url.searchParams.get('list');
    let videoId = url.searchParams.get('v');
    if (host === 'youtu.be') {
      videoId = url.pathname.replace(/^\//, '').split('/')[0] || null;
    } else if (url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.split('/')[2] || null;
    } else if (url.pathname.startsWith('/embed/')) {
      videoId = url.pathname.split('/')[2] || null;
    }

    if (listId && !videoId) {
      return {
        kind: 'youtube-playlist',
        embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(listId)}`,
        suggestedType: 'embed',
        defaultTitle: 'YouTube Playlist',
      };
    }

    if (videoId) {
      const playlistParam = listId ? `?list=${encodeURIComponent(listId)}` : '';
      return {
        kind: listId ? 'youtube-playlist' : 'youtube-video',
        embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}${playlistParam}`,
        suggestedType: 'embed',
        defaultTitle: listId ? 'YouTube Video & Playlist' : 'YouTube Video',
      };
    }
  }

  // Vimeo
  if (host === 'vimeo.com') {
    const id = url.pathname.replace(/^\//, '').split('/')[0];
    if (id && /^\d+$/.test(id)) {
      return {
        kind: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${id}`,
        suggestedType: 'embed',
        defaultTitle: 'Vimeo Video',
      };
    }
  }

  // Spotify
  if (host === 'open.spotify.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return {
        kind: 'spotify',
        embedUrl: `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`,
        suggestedType: 'embed',
        defaultTitle: `Spotify ${parts[0]}`,
      };
    }
  }

  // SoundCloud
  if (host === 'soundcloud.com') {
    return {
      kind: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(trimmed)}&color=%230284c7&auto_play=false&hide_related=true&show_comments=false`,
      suggestedType: 'embed',
      defaultTitle: 'SoundCloud Track',
    };
  }

  // Direct GIF / Image / Video / Audio URLs
  const lowerPath = url.pathname.toLowerCase();
  if (lowerPath.endsWith('.gif')) {
    return { kind: null, embedUrl: null, suggestedType: 'gif', defaultTitle: 'Animated GIF' };
  }
  if (/\.(png|jpe?g|webp|avif)$/i.test(lowerPath)) {
    return { kind: null, embedUrl: null, suggestedType: 'image', defaultTitle: 'Image' };
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(lowerPath)) {
    return { kind: null, embedUrl: null, suggestedType: 'video', defaultTitle: 'Video' };
  }
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(lowerPath)) {
    return { kind: null, embedUrl: null, suggestedType: 'audio', defaultTitle: 'Audio Track' };
  }

  return {
    kind: null,
    embedUrl: null,
    suggestedType: 'link',
    defaultTitle: url.hostname.replace(/^www\./, ''),
  };
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFontClass(font: DiaryFont): string {
  switch (font) {
    case 'serif':
      return '[font-family:var(--font-serif)]';
    case 'mono':
      return '[font-family:var(--font-mono)] text-[14px]';
    case 'hand':
      return '[font-family:var(--font-hand)] text-[20px] leading-snug';
    default:
      return '[font-family:var(--font-body)]';
  }
}

export function formatDateYmd(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return typeof input === 'string' ? input : '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate());
  return `${y}.${m}.${d}`;
}

export function formatHourMinute12h(hour24: number, minute = 0): string {
  const normalizedHour = ((Math.floor(hour24) % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? 'pm' : 'am';
  const hour12 = normalizedHour % 12 || 12;
  const min = String(Math.max(0, Math.min(59, Math.floor(minute)))).padStart(2, '0');
  return `${hour12}:${min} ${period}`;
}

export function formatPostTimestamp(iso: string, includeTime = true): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const datePart = formatDateYmd(date);
  if (!includeTime) return datePart;
  return `${datePart} ${formatHourMinute12h(date.getHours(), date.getMinutes())}`;
}

export function getMonthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  if (!y || !m) return monthKey;
  const date = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
