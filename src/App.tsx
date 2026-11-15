/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Home,
  Search,
  Settings as SettingsIcon,
  Smartphone,
  Tv,
  X,
} from 'lucide-react';
import type {
  ActiveView,
  BackendTab,
  BannerSchedule,
  CountdownFormat,
  DesignSettings,
  DiaryFont,
  EventCountdown,
  IntranetState,
  MediaAttachment,
  Post,
} from './types';
import { getMergedPostTags, getMonthKey, stripHtml } from './lib/mediaUtils';
import { Header } from './components/Header';
import { ScheduledBanner } from './components/ScheduledBanner';
import { TimelineCard } from './components/TimelineCard';
import { Sidebar } from './components/Sidebar';
import { RichComposerModal } from './components/RichComposerModal';
import { BackendConsoleView } from './components/BackendConsoleView';
import {
  LiveTvView,
  STATIONS,
  type BroadcastChannel,
  type PlayEventItem,
} from './components/LiveTvView';
import { MobileWidgetStudioView } from './components/MobileWidgetStudioView';
import { OfflineIndicator } from './components/PWAInstallButton';

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [banners, setBanners] = useState<BannerSchedule[]>([]);
  const [countdowns, setCountdowns] = useState<EventCountdown[]>([]);
  const [design, setDesign] = useState<DesignSettings>({
    theme: 'aero-daylight',
    surfaceStyle: 'aero-glass',
    customBackdropUrl: '',
    customThemes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeView, setActiveView] = useState<ActiveView>('timeline');
  const [activeStation, setActiveStation] = useState<BroadcastChannel>(STATIONS[0]);
  const [activeEvent, setActiveEvent] = useState<PlayEventItem | null>(null);
  const [settingsTab, setSettingsTab] = useState<BackendTab>('compose');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; title?: string } | null>(
    null
  );

  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeCustomTheme = useMemo(
    () => (design.customThemes || []).find((t) => t.id === design.theme) || null,
    [design.customThemes, design.theme]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', design.theme);
    root.setAttribute('data-surface', design.surfaceStyle);

    const isDark = activeCustomTheme
      ? activeCustomTheme.isDark
      : design.theme === 'twilight-lagoon' || design.theme === 'metro-eclipse-dark';
    root.classList.toggle('dark', isDark);

    if (activeCustomTheme) {
      root.style.setProperty('--accent-start', activeCustomTheme.accentStart);
      root.style.setProperty('--accent-end', activeCustomTheme.accentEnd);
      root.style.setProperty('--accent-shadow', 'rgba(15, 23, 42, 0.25)');
    } else {
      root.style.removeProperty('--accent-start');
      root.style.removeProperty('--accent-end');
      root.style.removeProperty('--accent-shadow');
    }
  }, [design.theme, design.surfaceStyle, activeCustomTheme]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchState = async () => {
    try {
      setLoadError('');
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to load dashboard state');
      const data = (await res.json()) as IntranetState;
      setPosts(data.posts || []);
      setBanners(data.banners || []);
      setCountdowns(data.countdowns || []);
      if (data.design) {
        setDesign(data.design);
      }
    } catch {
      setLoadError('Unable to reach dashboard server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);

  const { livePosts, scheduledPosts } = useMemo(() => {
    const live: Post[] = [];
    const scheduled: Post[] = [];
    for (const p of posts) {
      const target = p.scheduledFor || p.publishedAt;
      const ts = new Date(target).getTime();
      if (!Number.isNaN(ts) && ts > nowMs) {
        scheduled.push(p);
      } else {
        live.push(p);
      }
    }

    live.sort((a, b) => {
      const aPinned = a.pinnedUntil && new Date(a.pinnedUntil).getTime() > nowMs ? 1 : 0;
      const bPinned = b.pinnedUntil && new Date(b.pinnedUntil).getTime() > nowMs ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    scheduled.sort(
      (a, b) =>
        new Date(a.scheduledFor || a.publishedAt).getTime() -
        new Date(b.scheduledFor || b.publishedAt).getTime()
    );

    return { livePosts: live, scheduledPosts: scheduled };
  }, [posts, nowMs]);

  const { tagCounts, monthCounts, allTagNames } = useMemo(() => {
    const tagMap = new Map<string, { tag: string; count: number }>();
    const monthMap = new Map<string, number>();

    for (const p of livePosts) {
      for (const tag of getMergedPostTags(p)) {
        const key = tag.toLowerCase();
        const existing = tagMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          tagMap.set(key, { tag, count: 1 });
        }
      }
      const mk = getMonthKey(p.publishedAt);
      monthMap.set(mk, (monthMap.get(mk) || 0) + 1);
    }

    const sortedTags = Array.from(tagMap.values()).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
    );
    const sortedMonths = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      tagCounts: sortedTags,
      monthCounts: sortedMonths,
      allTagNames: sortedTags.map((t) => t.tag),
    };
  }, [livePosts]);

  const allBackendTagCounts = useMemo(() => {
    const tagMap = new Map<string, { tag: string; count: number }>();
    for (const p of posts) {
      for (const tag of getMergedPostTags(p)) {
        const key = tag.toLowerCase();
        const existing = tagMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          tagMap.set(key, { tag, count: 1 });
        }
      }
    }
    return Array.from(tagMap.values()).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
    );
  }, [posts]);

  const filteredTimelinePosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return livePosts.filter((p) => {
      if (activeTag) {
        const tags = getMergedPostTags(p).map((t) => t.toLowerCase());
        if (!tags.includes(activeTag.toLowerCase())) return false;
      }
      if (activeMonth) {
        if (getMonthKey(p.publishedAt) !== activeMonth) return false;
      }
      const postTs = new Date(p.publishedAt).getTime();
      if (fromMs !== null && !Number.isNaN(fromMs) && postTs < fromMs) {
        return false;
      }
      if (toMs !== null && !Number.isNaN(toMs) && postTs > toMs) {
        return false;
      }
      if (q) {
        const hay = `${p.title} ${stripHtml(p.bodyHtml)} ${getMergedPostTags(p).join(
          ' '
        )}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [livePosts, activeTag, activeMonth, dateFrom, dateTo, searchQuery]);

  const handleSavePost = async (payload: {
    id?: string;
    title: string;
    bodyHtml: string;
    font: Post['font'];
    manualTags: string[];
    inlineTags: string[];
    attachments: Post['attachments'];
    scheduledFor: string | null;
    pinnedUntil: string | null;
  }) => {
    if (payload.id) {
      const res = await fetch(`/api/posts/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = (await res.json()) as Post;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create failed');
      const created = (await res.json()) as Post;
      setPosts((prev) => [created, ...prev]);
    }
  };

  const handleDeletePost = async (id: string) => {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleTogglePin = async (post: Post) => {
    const currentlyPinned =
      !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
    const nextPinnedUntil = currentlyPinned
      ? null
      : new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinnedUntil: nextPinnedUntil }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Post;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handlePublishScheduledNow = async (post: Post) => {
    const nowIso = new Date().toISOString();
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledFor: null, publishedAt: nowIso }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Post;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    const res = await fetch('/api/tags/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldTag, newTag }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        posts: Post[];
        countdowns: EventCountdown[];
      };
      setPosts(data.posts);
      setCountdowns(data.countdowns);
      if (activeTag && activeTag.toLowerCase() === oldTag.toLowerCase()) {
        setActiveTag(newTag);
      }
    }
  };

  const handleDeleteTag = async (tag: string) => {
    const res = await fetch('/api/tags/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        posts: Post[];
        countdowns: EventCountdown[];
      };
      setPosts(data.posts);
      setCountdowns(data.countdowns);
      if (activeTag && activeTag.toLowerCase() === tag.toLowerCase()) {
        setActiveTag(null);
      }
    }
  };

  const handleAddBanner = async (payload: Omit<BannerSchedule, 'id'>) => {
    const res = await fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = (await res.json()) as BannerSchedule;
      setBanners((prev) => [created, ...prev]);
    }
  };

  const handleUpdateBanner = async (
    id: string,
    patch: Partial<BannerSchedule>
  ) => {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = (await res.json()) as BannerSchedule;
      setBanners((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  const handleDeleteBanner = async (id: string) => {
    const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBanners((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleAddCountdown = async (payload: {
    title: string;
    targetAt: string;
    tag?: string;
    bodyHtml?: string;
    font?: DiaryFont;
    displayFormat?: CountdownFormat;
    attachments?: MediaAttachment[];
    milestoneBodyHtml?: string;
    milestoneFont?: DiaryFont;
    milestoneAttachments?: MediaAttachment[];
  }) => {
    const res = await fetch('/api/countdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created = (await res.json()) as EventCountdown;
      setCountdowns((prev) => [...prev, created]);
    }
  };

  const handleDeleteCountdown = async (id: string) => {
    const res = await fetch(`/api/countdowns/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCountdowns((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleUpdateDesign = async (next: Partial<DesignSettings>) => {
    const merged: DesignSettings = { ...design, ...next };
    setDesign(merged);
    await fetch('/api/design', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
  };

  const openNewComposer = () => {
    setEditingPost(null);
    setComposerOpen(true);
  };

  const openEditComposer = (post: Post) => {
    setEditingPost(post);
    setComposerOpen(true);
  };

  const handleSelectTag = (tag: string | null) => {
    setActiveTag((prev) =>
      tag && prev?.toLowerCase() === tag.toLowerCase() ? null : tag
    );
    setActiveView('timeline');
  };

  const handleSelectMonth = (month: string | null) => {
    setActiveMonth((prev) => (prev === month ? null : month));
    setActiveView('timeline');
  };

  const hasAnyFilter = Boolean(activeTag || activeMonth || searchQuery || dateFrom || dateTo);

  const effectiveBackdropUrl =
    design.customBackdropUrl || activeCustomTheme?.backdropImageUrl || '';
  const isEffectiveDark = activeCustomTheme
    ? activeCustomTheme.isDark
    : design.theme === 'twilight-lagoon' || design.theme === 'metro-eclipse-dark';

  const wrapperStyle: React.CSSProperties | undefined = effectiveBackdropUrl
    ? {
        backgroundColor: activeCustomTheme?.canvasBg,
        backgroundImage: isEffectiveDark
          ? `linear-gradient(rgba(4,11,20,0.52), rgba(4,11,20,0.52)), url(${effectiveBackdropUrl})`
          : `linear-gradient(rgba(255,255,255,0.34), rgba(255,255,255,0.34)), url(${effectiveBackdropUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : activeCustomTheme
    ? {
        backgroundColor: activeCustomTheme.canvasBg,
        backgroundImage: 'none',
        color: activeCustomTheme.isDark ? '#f1f5f9' : '#0f172a',
      }
    : undefined;

  return (
    <div style={wrapperStyle} className="min-h-screen pb-20 md:pb-12">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenComposer={openNewComposer}
      />

      {activeView !== 'live' && (
        <ScheduledBanner
          banners={banners}
          now={nowDate}
          onManageBanners={() => {
            setSettingsTab('banners');
            setActiveView('settings');
          }}
          onNavigateView={setActiveView}
        />
      )}

      <main className="mx-auto max-w-[1380px] space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8 space-y-5">
            {activeView === 'timeline' && (
              <>
                {/* Search + Date Range Filter */}
                <section className="aero-glass rounded-3xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search entries, quotes, or #Hashtags..."
                        className="w-full rounded-2xl border border-slate-200/90 bg-white/85 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium">From</span>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          aria-label="Filter from date"
                          className="rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium">To</span>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          aria-label="Filter to date"
                          className="rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                        />
                      </label>
                    </div>
                  </div>

                  {hasAnyFilter && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-2.5 text-xs text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
                      <span>Filtering by:</span>
                      {activeTag && (
                        <button
                          type="button"
                          onClick={() => setActiveTag(null)}
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                        >
                          #{activeTag} ×
                        </button>
                      )}
                      {activeMonth && (
                        <button
                          type="button"
                          onClick={() => setActiveMonth(null)}
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                        >
                          Month: {activeMonth} ×
                        </button>
                      )}
                      {(dateFrom || dateTo) && (
                        <button
                          type="button"
                          onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                        >
                          {dateFrom || '...'} → {dateTo || '...'} ×
                        </button>
                      )}
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                        >
                          “{searchQuery}” ×
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTag(null);
                          setActiveMonth(null);
                          setSearchQuery('');
                          setDateFrom('');
                          setDateTo('');
                        }}
                        className="ml-auto font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        Reset all
                      </button>
                    </div>
                  )}
                </section>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="aero-glass h-52 animate-pulse rounded-3xl p-6"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="aero-glass rounded-3xl p-8 text-center">
                    <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                      {loadError}
                    </p>
                    <button
                      type="button"
                      onClick={fetchState}
                      className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredTimelinePosts.length === 0 ? (
                  <div className="aero-glass rounded-3xl p-10 text-center">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      No matching diary entries
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Try clearing your date range or active hashtag, or create a fresh entry.
                    </p>
                    <button
                      type="button"
                      onClick={openNewComposer}
                      className="aero-button-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
                    >
                      Create First Entry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredTimelinePosts.map((post) => (
                      <TimelineCard
                        key={post.id}
                        post={post}
                        nowMs={nowMs}
                        activeTag={activeTag}
                        onSelectTag={handleSelectTag}
                        onEdit={openEditComposer}
                        onDelete={handleDeletePost}
                        onTogglePin={handleTogglePin}
                        onOpenLightbox={(url, title) =>
                          setLightbox({ url, title })
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeView === 'live' && (
              <LiveTvView
                activeStation={activeStation}
                activeEvent={activeEvent}
                onSelectStation={(station) => {
                  setActiveEvent(null);
                  setActiveStation(station);
                }}
                onSelectEvent={(ev) => setActiveEvent(ev)}
              />
            )}

            {activeView === 'settings' && (
              <BackendConsoleView
                activeTab={settingsTab}
                onSelectTab={setSettingsTab}
                posts={livePosts}
                scheduledPosts={scheduledPosts}
                countdowns={countdowns}
                tagCounts={allBackendTagCounts}
                banners={banners}
                design={design}
                now={nowDate}
                onOpenNewComposer={openNewComposer}
                onEditPost={openEditComposer}
                onDeletePost={handleDeletePost}
                onPublishNow={handlePublishScheduledNow}
                onTogglePin={handleTogglePin}
                onAddCountdown={handleAddCountdown}
                onDeleteCountdown={handleDeleteCountdown}
                onRenameTag={handleRenameTag}
                onDeleteTag={handleDeleteTag}
                onFilterByTag={(tag) => handleSelectTag(tag)}
                onAddBanner={handleAddBanner}
                onUpdateBanner={handleUpdateBanner}
                onDeleteBanner={handleDeleteBanner}
                onUpdateDesign={handleUpdateDesign}
              />
            )}

            {activeView === 'install' && (
              <MobileWidgetStudioView
                posts={livePosts}
                countdowns={countdowns}
                nowMs={nowMs}
              />
            )}
          </div>

          <div className="lg:col-span-4">
            <Sidebar
              activeView={activeView}
              activeStation={activeStation}
              isEventActive={Boolean(activeEvent)}
              onSelectStation={(station) => {
                setActiveEvent(null);
                setActiveStation(station);
              }}
              nowMs={nowMs}
              design={design}
              onUpdateDesign={handleUpdateDesign}
              onOpenDesignSettings={() => {
                setSettingsTab('design');
                setActiveView('settings');
              }}
              countdowns={countdowns}
              tagCounts={tagCounts}
              activeTag={activeTag}
              onSelectTag={handleSelectTag}
              monthCounts={monthCounts}
              activeMonth={activeMonth}
              onSelectMonth={handleSelectMonth}
            />
          </div>
        </div>
      </main>

      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-14 grid-cols-4 border-t border-white/70 bg-white/90 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/90"
      >
        {(
          [
            { id: 'timeline', label: 'Timeline', icon: Home },
            { id: 'live', label: 'LIVE', icon: Tv },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
            { id: 'install', label: 'Install App', icon: Smartphone },
          ] as {
            id: ActiveView;
            label: string;
            icon: React.ComponentType<{ className?: string }>;
          }[]
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                active
                  ? 'text-sky-700 dark:text-sky-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <RichComposerModal
        isOpen={composerOpen}
        editingPost={editingPost}
        existingTags={allTagNames}
        onClose={() => {
          setComposerOpen(false);
          setEditingPost(null);
        }}
        onSave={handleSavePost}
      />

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl bg-slate-900 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close lightbox"
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/70 text-white hover:bg-slate-950 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.title || 'Full resolution diary image'}
              referrerPolicy="no-referrer"
              className="max-h-[84vh] w-auto object-contain"
            />
            {lightbox.title && (
              <div className="bg-slate-950/90 px-4 py-2.5 text-xs text-slate-200">
                {lightbox.title}
              </div>
            )}
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
