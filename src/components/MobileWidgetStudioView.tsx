import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Pin,
  Rss,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import type { EventCountdown, Post } from '../types';
import { formatPostTimestamp, getMergedPostTags, stripHtml } from '../lib/mediaUtils';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileWidgetStudioViewProps {
  posts: Post[];
  countdowns: EventCountdown[];
  nowMs: number;
}

interface DiagnosticResult {
  name: string;
  ok: boolean;
  detail: string;
}

export const MobileWidgetStudioView: React.FC<MobileWidgetStudioViewProps> = ({
  posts,
  countdowns,
  nowMs,
}) => {
  const [copiedKey, setCopiedKey] = useState<'rss' | 'json' | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const rssUrl = `${origin}/api/rss.xml`;
  const jsonUrl = `${origin}/api/widget-feed.json`;

  const copyText = async (key: 'rss' | 'json', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const runDiagnostics = async () => {
    setIsTesting(true);
    const results: DiagnosticResult[] = [];

    try {
      const stateRes = await fetch('/api/state');
      results.push({
        name: 'Dashboard API (/api/state)',
        ok: stateRes.ok,
        detail: stateRes.ok ? 'Connected and returning saved entries' : `HTTP ${stateRes.status}`,
      });
    } catch {
      results.push({
        name: 'Dashboard API (/api/state)',
        ok: false,
        detail: 'Server unreachable',
      });
    }

    try {
      const rssRes = await fetch('/api/rss.xml');
      const rssText = await rssRes.text();
      const validRss = rssRes.ok && rssText.includes('<rss');
      results.push({
        name: 'Android RSS Feed (/api/rss.xml)',
        ok: validRss,
        detail: validRss ? 'Valid RSS 2.0 XML feed ready for Feeder/RSS Widget' : 'Invalid RSS output',
      });
    } catch {
      results.push({
        name: 'Android RSS Feed (/api/rss.xml)',
        ok: false,
        detail: 'Failed to fetch RSS feed',
      });
    }

    try {
      const jsonRes = await fetch('/api/widget-feed.json');
      const jsonData = (await jsonRes.json()) as { items?: unknown[] };
      const okJson = jsonRes.ok && Array.isArray(jsonData.items);
      results.push({
        name: 'KWGT Widget JSON (/api/widget-feed.json)',
        ok: okJson,
        detail: okJson
          ? `Serving ${jsonData.items?.length ?? 0} live timeline cards`
          : 'Invalid JSON feed',
      });
    } catch {
      results.push({
        name: 'KWGT Widget JSON (/api/widget-feed.json)',
        ok: false,
        detail: 'Failed to fetch JSON feed',
      });
    }

    const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    results.push({
      name: 'PWA Service Worker Support',
      ok: hasSW,
      detail: hasSW
        ? 'Browser supports offline caching and home-screen install'
        : 'Service workers unavailable in this browser',
    });

    setDiagnostics(results);
    setIsTesting(false);
  };

  const widgetPosts = posts.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Pre-Install Testing & Health Check */}
      <div className="aero-glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Pre-Install Test & Bug Check
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Verify your API storage, Android RSS/JSON widget feeds, and PWA service worker before installing on your phone.
            </p>
          </div>
          <button
            type="button"
            disabled={isTesting}
            onClick={runDiagnostics}
            className="aero-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isTesting ? 'Running Checks...' : 'Run Pre-Install Check'}
          </button>
        </div>

        {diagnostics.length > 0 && (
          <div className="mt-4 divide-y divide-slate-200/70 rounded-2xl border border-slate-200/80 bg-white/75 px-4 dark:divide-slate-700/60 dark:border-slate-700 dark:bg-slate-900/60">
            {diagnostics.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-3 py-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {d.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {d.name}
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-300 text-right">
                  {d.detail}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free Online Publishing & Mobile App Install */}
      <div className="aero-glass rounded-3xl p-6">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Mobile App & Android Home Screen Widget
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Zero app-store fees: install MY DIARIES DASHBOARD as a mobile web app for posting/scheduling, and connect a free open-source Android widget using the live feed URLs below.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-slate-700/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Smartphone className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>1. Phone App for Posting & Scheduling</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Open your published Shared App URL in Android Chrome (or iOS Safari) and install it to your home screen for full-screen mobile posting, uploads, and scheduling.
            </p>
            <div className="mt-4">
              <PWAInstallButton variant="full" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-5 dark:border-slate-700/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Rss className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>2. Android Home Screen Widget Feeds</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Paste the RSS feed into <strong>Feeder</strong> / <strong>RSS Widget</strong> (free & open source on F-Droid), or paste the JSON feed into <strong>KWGT</strong> for custom wide-screen image & GIF cards.
            </p>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300 flex-1">
                  {rssUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copyText('rss', rssUrl)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'rss' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy RSS
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300 flex-1">
                  {jsonUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copyText('json', jsonUrl)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'json' ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Android Widget Simulator */}
      <div className="aero-glass rounded-3xl p-6">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Live Android Home Screen Widget Preview (4×4 Card Stack)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Previewing live wide-screen images, animated GIFs, pinned entries, and event tags served by your feed endpoints.
          </p>
        </div>

        <div className="mt-5 mx-auto max-w-md rounded-[36px] border-4 border-slate-900/90 bg-gradient-to-br from-sky-200 via-cyan-100 to-emerald-100 p-4 shadow-2xl dark:border-slate-700 dark:from-slate-900 dark:via-cyan-950 dark:to-slate-900">
          <div className="mb-3 flex items-center justify-between px-2 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <span>MY DIARIES WIDGET</span>
            {countdowns[0] && (
              <span className="tabular-nums">{countdowns[0].title}</span>
            )}
          </div>

          <div className="space-y-3">
            {widgetPosts.map((post) => {
              const visual = post.attachments.find(
                (a) => a.type === 'image' || a.type === 'gif'
              );
              const isPinned =
                !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
              const tags = getMergedPostTags(post);

              return (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/85"
                >
                  {visual && (
                    <div className="relative h-36 w-full bg-slate-200">
                      <img
                        src={visual.url}
                        alt={visual.title || post.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3.5">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 tabular-nums dark:text-slate-400">
                      <span>{formatPostTimestamp(post.publishedAt)}</span>
                      {isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 font-sans font-semibold text-sky-700 dark:text-sky-300">
                            <Pin className="h-2.5 w-2.5" />
                            Pinned
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {post.title || 'Diary Entry'}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {stripHtml(post.bodyHtml)}
                    </p>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        {tags.slice(0, 3).map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
