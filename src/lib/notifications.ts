import type { EventCountdown, Post } from '../types';
import { formatDateYmd, stripHtml } from './mediaUtils';
import {
  isNativeAndroidBridgeAvailable,
  notifyNativeEvent,
} from './widgetBridge';

export const MD_MEMO_BLOG_URL = 'https://officialmdmemo.blogspot.com';
const BLOGGER_FEED_JSONP_BASE =
  'https://officialmdmemo.blogspot.com/feeds/posts/default?alt=json-in-script';

const STORAGE_ITEMS_KEY = 'md_notifications_items_v1';
const STORAGE_SEEN_KEY = 'md_notifications_seen_keys_v1';
const STORAGE_KNOWN_FUTURE_KEY = 'md_notifications_known_future_v1';
const STORAGE_BLOGGER_STATE_KEY = 'md_notifications_blogger_state_v1';

const RECENT_CATCHUP_WINDOW_MS = 48 * 3600 * 1000;
const MAX_STORED_ITEMS = 30;

export type AppNotificationKind = 'scheduled' | 'countdown' | 'blogger';

export interface AppNotificationItem {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  url: string;
  openExternal?: boolean;
}

export interface BloggerPostEntry {
  id: string;
  title: string;
  publishedAt: string;
  publishedMs: number;
  url: string;
}

interface BloggerBaselineState {
  initialized: boolean;
  lastPublishedMs: number;
  lastCheckedAt: string | null;
  latestTitle?: string;
  latestUrl?: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

export function loadStoredNotifications(): AppNotificationItem[] {
  const list = readJson<AppNotificationItem[]>(STORAGE_ITEMS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveStoredNotifications(
  items: AppNotificationItem[]
): AppNotificationItem[] {
  const trimmed = items.slice(0, MAX_STORED_ITEMS);
  writeJson(STORAGE_ITEMS_KEY, trimmed);
  return trimmed;
}

function loadStringSet(key: string): Set<string> {
  const arr = readJson<string[]>(key, []);
  return new Set(Array.isArray(arr) ? arr : []);
}

function saveStringSet(key: string, set: Set<string>): void {
  const arr = Array.from(set).slice(-250);
  writeJson(key, arr);
}

export function loadBloggerBaseline(): BloggerBaselineState {
  return readJson<BloggerBaselineState>(STORAGE_BLOGGER_STATE_KEY, {
    initialized: false,
    lastPublishedMs: 0,
    lastCheckedAt: null,
  });
}

async function dispatchSystemNotification(
  item: AppNotificationItem
): Promise<void> {
  if (isNativeAndroidBridgeAvailable()) {
    await notifyNativeEvent({
      key: item.id,
      title: item.title,
      body: item.body,
      url: item.url,
      openExternal: Boolean(item.openExternal),
    });
    return;
  }

  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification.permission === 'granted'
  ) {
    try {
      const n = new window.Notification(item.title, {
        body: item.body,
        icon: '/pwa-192x192.png',
        tag: item.id,
      });
      n.onclick = () => {
        try {
          window.focus();
          if (item.openExternal) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
          } else if (item.url) {
            window.location.href = item.url;
          }
          n.close();
        } catch {
          // ignore
        }
      };
    } catch {
      // Fallback to in-app notification center if browser blocks Notification constructor
    }
  }
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}

/**
 * Evaluates scheduled posts (when due) and countdown target dates (showing ONLY Event Title & date).
 */
export async function evaluateDashboardAlerts(params: {
  posts: Post[];
  countdowns: EventCountdown[];
  nowMs: number;
}): Promise<{ items: AppNotificationItem[]; newlyAdded: AppNotificationItem[] }> {
  const { posts, countdowns, nowMs } = params;
  const seen = loadStringSet(STORAGE_SEEN_KEY);
  const knownFuture = loadStringSet(STORAGE_KNOWN_FUTURE_KEY);
  const existing = loadStoredNotifications();
  const newlyAdded: AppNotificationItem[] = [];

  // 1. Scheduled posts when due
  for (const post of posts) {
    if (post.isDraft || !post.scheduledFor) continue;
    const schedMs = new Date(post.scheduledFor).getTime();
    if (Number.isNaN(schedMs)) continue;

    const key = `post:${post.id}:${post.scheduledFor}`;
    if (schedMs <= nowMs) {
      const withinCatchup = nowMs - schedMs <= RECENT_CATCHUP_WINDOW_MS;
      if (!seen.has(key) && (withinCatchup || knownFuture.has(key))) {
        const cleanTitle = (post.title || '').trim();
        const body =
          cleanTitle && cleanTitle.toLowerCase() !== 'diary entry'
            ? cleanTitle
            : stripHtml(post.bodyHtml).slice(0, 110) ||
              'A scheduled post is now live.';
        const item: AppNotificationItem = {
          id: key,
          kind: 'scheduled',
          title: 'Scheduled Post Published',
          body,
          createdAt: new Date(nowMs).toISOString(),
          read: false,
          url: `/?post=${encodeURIComponent(post.id)}`,
          openExternal: false,
        };
        newlyAdded.push(item);
        seen.add(key);
        await dispatchSystemNotification(item);
      }
      knownFuture.delete(key);
    } else {
      knownFuture.add(key);
    }
  }

  // 2. Countdown target date reached — ONLY Event Title and date
  for (const cd of countdowns) {
    const targetMs = new Date(cd.targetAt).getTime();
    if (Number.isNaN(targetMs)) continue;

    const key = `cd:${cd.id}:${cd.targetAt}`;
    if (targetMs <= nowMs) {
      const withinCatchup = nowMs - targetMs <= RECENT_CATCHUP_WINDOW_MS;
      if (!seen.has(key) && (withinCatchup || knownFuture.has(key))) {
        const dateOnly = formatDateYmd(cd.targetAt, cd.timeZone);
        const item: AppNotificationItem = {
          id: key,
          kind: 'countdown',
          title: cd.title,
          body: dateOnly,
          createdAt: new Date(nowMs).toISOString(),
          read: false,
          url: `/?countdown=${encodeURIComponent(cd.id)}#/next`,
          openExternal: false,
        };
        newlyAdded.push(item);
        seen.add(key);
        await dispatchSystemNotification(item);
      }
      knownFuture.delete(key);
    } else {
      knownFuture.add(key);
    }
  }

  saveStringSet(STORAGE_SEEN_KEY, seen);
  saveStringSet(STORAGE_KNOWN_FUTURE_KEY, knownFuture);

  if (newlyAdded.length === 0) {
    return { items: existing, newlyAdded: [] };
  }

  const deduped = [
    ...newlyAdded,
    ...existing.filter((e) => !newlyAdded.some((n) => n.id === e.id)),
  ];
  const saved = saveStoredNotifications(deduped);
  return { items: saved, newlyAdded };
}

/**
 * Fetches recent posts from https://officialmdmemo.blogspot.com via Blogger JSONP feed
 * (works cross-origin on Web, PWA, and Capacitor WebView without requiring CORS headers).
 */
export function fetchBloggerFeedPostsJsonp(
  maxResults = 5,
  timeoutMs = 10000
): Promise<BloggerPostEntry[]> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const cbName = `__mdBloggerFeedCb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const win = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      try {
        delete win[cbName];
      } catch {
        win[cbName] = undefined;
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('MD Memo feed request timed out'));
    }, timeoutMs);

    win[cbName] = (data: {
      feed?: {
        entry?: Array<{
          id?: { $t?: string };
          title?: { $t?: string };
          published?: { $t?: string };
          link?: Array<{ rel?: string; href?: string }>;
        }>;
      };
    }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();

      const rawEntries = data?.feed?.entry || [];
      const parsed: BloggerPostEntry[] = [];
      for (const e of rawEntries) {
        const id = (e.id?.$t || '').trim();
        if (!id) continue;
        const title = (e.title?.$t || '').trim() || 'New MD Memo post';
        const publishedAt = (e.published?.$t || '').trim();
        const publishedMs = new Date(publishedAt).getTime();
        const altLink = (e.link || []).find((l) => l.rel === 'alternate')?.href;
        parsed.push({
          id,
          title,
          publishedAt,
          publishedMs: Number.isNaN(publishedMs) ? 0 : publishedMs,
          url: altLink || MD_MEMO_BLOG_URL,
        });
      }
      parsed.sort((a, b) => a.publishedMs - b.publishedMs);
      resolve(parsed);
    };

    script.src = `${BLOGGER_FEED_JSONP_BASE}&callback=${encodeURIComponent(cbName)}&max-results=${maxResults}`;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Unable to load MD Memo Blogger feed'));
    };

    document.head.appendChild(script);
  });
}

export async function checkBloggerFeedAlerts(): Promise<{
  items: AppNotificationItem[];
  newlyAdded: AppNotificationItem[];
  baseline: BloggerBaselineState;
}> {
  const existing = loadStoredNotifications();
  const seen = loadStringSet(STORAGE_SEEN_KEY);
  const prevState = loadBloggerBaseline();

  const entries = await fetchBloggerFeedPostsJsonp(5);
  if (entries.length === 0) {
    const nextState: BloggerBaselineState = {
      ...prevState,
      lastCheckedAt: new Date().toISOString(),
    };
    writeJson(STORAGE_BLOGGER_STATE_KEY, nextState);
    return { items: existing, newlyAdded: [], baseline: nextState };
  }

  const latest = entries[entries.length - 1];
  let maxPublishedMs = prevState.lastPublishedMs || 0;

  // On very first run, record current posts as baseline without spamming historical entries
  if (!prevState.initialized) {
    for (const entry of entries) {
      seen.add(`blog:${entry.id}`);
      if (entry.publishedMs > maxPublishedMs) {
        maxPublishedMs = entry.publishedMs;
      }
    }
    saveStringSet(STORAGE_SEEN_KEY, seen);
    const nextState: BloggerBaselineState = {
      initialized: true,
      lastPublishedMs: maxPublishedMs,
      lastCheckedAt: new Date().toISOString(),
      latestTitle: latest.title,
      latestUrl: latest.url,
    };
    writeJson(STORAGE_BLOGGER_STATE_KEY, nextState);
    return { items: existing, newlyAdded: [], baseline: nextState };
  }

  const newlyAdded: AppNotificationItem[] = [];
  for (const entry of entries) {
    const key = `blog:${entry.id}`;
    if (
      !seen.has(key) &&
      (entry.publishedMs === 0 || entry.publishedMs > maxPublishedMs)
    ) {
      const item: AppNotificationItem = {
        id: key,
        kind: 'blogger',
        title: 'New on MD Memo',
        body: entry.title,
        createdAt: entry.publishedAt || new Date().toISOString(),
        read: false,
        url: entry.url,
        openExternal: true,
      };
      newlyAdded.push(item);
      seen.add(key);
      if (entry.publishedMs > maxPublishedMs) {
        maxPublishedMs = entry.publishedMs;
      }
      await dispatchSystemNotification(item);
    }
  }

  saveStringSet(STORAGE_SEEN_KEY, seen);
  const nextState: BloggerBaselineState = {
    initialized: true,
    lastPublishedMs: maxPublishedMs,
    lastCheckedAt: new Date().toISOString(),
    latestTitle: latest.title,
    latestUrl: latest.url,
  };
  writeJson(STORAGE_BLOGGER_STATE_KEY, nextState);

  if (newlyAdded.length === 0) {
    return { items: existing, newlyAdded: [], baseline: nextState };
  }

  const deduped = [
    ...newlyAdded.reverse(),
    ...existing.filter((e) => !newlyAdded.some((n) => n.id === e.id)),
  ];
  const saved = saveStoredNotifications(deduped);
  return { items: saved, newlyAdded, baseline: nextState };
}
