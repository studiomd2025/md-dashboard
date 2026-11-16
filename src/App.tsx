/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Home,
  LayoutGrid,
  PanelRightClose,
  PanelRightOpen,
  Rows3,
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
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getMergedPostTags, getMonthKey, stripHtml } from './lib/mediaUtils';
import {
  auth,
  isOwnerUser,
  signInOwnerWithGoogle,
  signOutOwner,
} from './lib/firebase';
import {
  createBannerDoc,
  createCountdownDoc,
  createPostDoc,
  deleteBannerDoc,
  deleteCountdownDoc,
  deletePostDoc,
  deleteTagBatch,
  renameTagBatch,
  saveDesignConfigDoc,
  seedFirestoreIfEmpty,
  subscribeDashboardData,
  updateBannerDoc,
  updatePostDoc,
} from './lib/firestoreStore';
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
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [subNonce, setSubNonce] = useState(0);
  const isAdmin = useMemo(() => isOwnerUser(user), [user]);

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window === 'undefined') return 'timeline';
    const hash = window.location.hash;
    if (hash === '#/live') return 'live';
    if (hash === '#/settings') return 'settings';
    if (hash === '#/install') return 'install';
    if (hash === '#/timeline') return 'timeline';
    const saved = window.localStorage.getItem('md_active_view');
    if (saved === 'live' || saved === 'settings' || saved === 'install' || saved === 'timeline') {
      return saved as ActiveView;
    }
    return 'timeline';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('md_sidebar_collapsed') === 'true';
  });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('post');
  });
  const [activeStation, setActiveStation] = useState<BroadcastChannel>(STATIONS[0]);
  const [activeEvent, setActiveEvent] = useState<PlayEventItem | null>(null);
  const [settingsTab, setSettingsTab] = useState<BackendTab>('compose');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [timelineLayout, setTimelineLayout] = useState<'stack' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'stack';
    return window.localStorage.getItem('md_timeline_layout') === 'grid'
      ? 'grid'
      : 'stack';
  });
  const [isTwoColViewport, setIsTwoColViewport] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 640px)').matches;
  });

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
      : design.theme === 'twilight-lagoon' ||
        design.theme === 'metro-eclipse-dark' ||
        design.theme === 'metro-ipod-electric';
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('md_timeline_layout', timelineLayout);
  }, [timelineLayout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setIsTwoColViewport(e.matches);
    setIsTwoColViewport(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPostId = new URLSearchParams(window.location.search).get('post');
      setSelectedPostId(nextPostId);
      if (nextPostId) {
        setActiveView('timeline');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/live') setActiveView('live');
      else if (hash === '#/settings') setActiveView('settings');
      else if (hash === '#/install') setActiveView('install');
      else if (hash === '#/timeline') setActiveView('timeline');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('md_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser && !isOwnerUser(nextUser)) {
        setAuthError(
          `Signed in as ${nextUser.email || 'unknown account'}. Only the owner account can save changes.`
        );
      } else {
        setAuthError('');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (isAdmin && user) {
      seedFirestoreIfEmpty(user.uid).catch((err) => {
        console.error('Starter seed skipped or failed:', err);
      });
    }
  }, [authReady, isAdmin, user]);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    let fallbackFetched = false;
    let sawDesignInFirestore = false;
    let sawPostsInFirestore = false;

    setLoadError('');

    const maybeLoadStarterPreview = async () => {
      if (fallbackFetched || sawDesignInFirestore || sawPostsInFirestore || isAdmin) {
        return;
      }
      fallbackFetched = true;
      try {
        const res = await fetch('/api/state');
        if (!res.ok || cancelled || sawDesignInFirestore || sawPostsInFirestore) return;
        const data = (await res.json()) as IntranetState;
        if (cancelled || sawDesignInFirestore || sawPostsInFirestore) return;
        setPosts(data.posts || []);
        setBanners(data.banners || []);
        setCountdowns(data.countdowns || []);
        if (data.design) setDesign(data.design);
      } catch {
        // Ignore if local API fallback unavailable
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const unsub = subscribeDashboardData({
      isAdmin,
      onPosts: (rows, hasDocs) => {
        if (cancelled) return;
        sawPostsInFirestore = hasDocs;
        if (hasDocs || sawDesignInFirestore || isAdmin) {
          setPosts(rows);
          setIsLoading(false);
        } else {
          maybeLoadStarterPreview();
        }
      },
      onBanners: (rows) => {
        if (cancelled) return;
        if (rows.length > 0 || sawDesignInFirestore || sawPostsInFirestore || isAdmin) {
          setBanners(rows);
        }
      },
      onCountdowns: (rows) => {
        if (cancelled) return;
        if (rows.length > 0 || sawDesignInFirestore || sawPostsInFirestore || isAdmin) {
          setCountdowns(rows);
        }
      },
      onDesign: (nextDesign, existsInFirestore) => {
        if (cancelled) return;
        sawDesignInFirestore = existsInFirestore;
        if (existsInFirestore) {
          if (!isAdmin) {
            try {
              const savedLocal = localStorage.getItem('md-visitor-design');
              if (savedLocal) {
                const parsed = JSON.parse(savedLocal) as Partial<DesignSettings>;
                setDesign({
                  ...nextDesign,
                  theme: parsed.theme || nextDesign.theme,
                  surfaceStyle: parsed.surfaceStyle || nextDesign.surfaceStyle,
                });
                setIsLoading(false);
                return;
              }
            } catch {
              // ignore localStorage parse error
            }
          }
          setDesign(nextDesign);
          setIsLoading(false);
        } else {
          maybeLoadStarterPreview();
        }
      },
      onError: () => {
        if (cancelled) return;
        setLoadError('Unable to reach Firestore database.');
        setIsLoading(false);
      },
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [authReady, isAdmin, subNonce]);

  const handleOwnerSignIn = async () => {
    try {
      setAuthError('');
      const signedIn = await signInOwnerWithGoogle();
      if (!isOwnerUser(signedIn)) {
        setAuthError(
          `Signed in as ${signedIn.email || 'guest'}. Only officialmdworkspace@gmail.com has owner permissions.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled.';
      setAuthError(msg);
    }
  };

  const handleOwnerSignOut = async () => {
    await signOutOwner();
    setAuthError('');
  };

  const nowDate = useMemo(() => new Date(nowMs), [nowMs]);

  const { livePosts, scheduledPosts, draftPosts } = useMemo(() => {
    const live: Post[] = [];
    const scheduled: Post[] = [];
    const drafts: Post[] = [];
    for (const p of posts) {
      if (p.isDraft) {
        drafts.push(p);
        continue;
      }
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

    drafts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { livePosts: live, scheduledPosts: scheduled, draftPosts: drafts };
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
    isDraft?: boolean;
  }) => {
    if (!user || !isAdmin) {
      throw new Error('Owner sign-in is required to save posts.');
    }
    if (payload.id) {
      await updatePostDoc(payload.id, {
        title: payload.title,
        bodyHtml: payload.bodyHtml,
        font: payload.font,
        manualTags: payload.manualTags,
        inlineTags: payload.inlineTags,
        attachments: payload.attachments,
        scheduledFor: payload.scheduledFor,
        publishedAt: payload.scheduledFor || new Date().toISOString(),
        pinnedUntil: payload.pinnedUntil,
        isDraft: Boolean(payload.isDraft),
      });
    } else {
      await createPostDoc(user.uid, payload);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!isAdmin) return;
    await deletePostDoc(id);
    if (selectedPostId === id) {
      closePostDetail();
    }
  };

  const handleTogglePin = async (post: Post) => {
    if (!isAdmin) return;
    const currentlyPinned =
      !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
    const nextPinnedUntil = currentlyPinned
      ? null
      : new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    await updatePostDoc(post.id, { pinnedUntil: nextPinnedUntil });
  };

  const handlePublishScheduledNow = async (post: Post) => {
    if (!isAdmin) return;
    const nowIso = new Date().toISOString();
    await updatePostDoc(post.id, {
      isDraft: false,
      scheduledFor: null,
      publishedAt: nowIso,
    });
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!isAdmin) return;
    await renameTagBatch(oldTag, newTag, posts, countdowns);
    if (activeTag && activeTag.toLowerCase() === oldTag.toLowerCase()) {
      setActiveTag(newTag);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    if (!isAdmin) return;
    await deleteTagBatch(tag, posts, countdowns);
    if (activeTag && activeTag.toLowerCase() === tag.toLowerCase()) {
      setActiveTag(null);
    }
  };

  const handleAddBanner = async (payload: Omit<BannerSchedule, 'id'>) => {
    if (!user || !isAdmin) return;
    await createBannerDoc(user.uid, payload);
  };

  const handleUpdateBanner = async (
    id: string,
    patch: Partial<BannerSchedule>
  ) => {
    if (!isAdmin) return;
    await updateBannerDoc(id, patch);
  };

  const handleDeleteBanner = async (id: string) => {
    if (!isAdmin) return;
    await deleteBannerDoc(id);
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
    if (!user || !isAdmin) return;
    await createCountdownDoc(user.uid, payload);
  };

  const handleDeleteCountdown = async (id: string) => {
    if (!isAdmin) return;
    await deleteCountdownDoc(id);
  };

  const handleUpdateDesign = async (next: Partial<DesignSettings>) => {
    const merged: DesignSettings = { ...design, ...next };
    setDesign(merged);
    if (user && isAdmin) {
      try {
        localStorage.removeItem('md-visitor-design');
      } catch {
        // ignore
      }
      await saveDesignConfigDoc(user.uid, merged);
    } else {
      try {
        localStorage.setItem(
          'md-visitor-design',
          JSON.stringify({
            theme: merged.theme,
            surfaceStyle: merged.surfaceStyle,
          })
        );
      } catch {
        // ignore
      }
    }
  };

  const openNewComposer = () => {
    if (!isAdmin) {
      handleOwnerSignIn();
      return;
    }
    setEditingPost(null);
    setComposerOpen(true);
  };

  const openEditComposer = (post: Post) => {
    setEditingPost(post);
    setComposerOpen(true);
  };

  const openPostDetail = (post: Post) => {
    setSelectedPostId(post.id);
    setActiveView('timeline');
    const url = new URL(window.location.href);
    url.searchParams.set('post', post.id);
    window.history.pushState({ postId: post.id }, '', url.pathname + url.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closePostDetail = () => {
    setSelectedPostId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      window.history.pushState(
        {},
        '',
        url.pathname + (url.search ? url.search : '')
      );
    }
  };

  const handleNavigateView = (view: ActiveView) => {
    setSelectedPostId(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      window.history.pushState(
        {},
        '',
        url.pathname + (url.search ? url.search : '')
      );
    }
    setActiveView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view === 'timeline' ? '#/timeline' : `#/${view}`;
      window.localStorage.setItem('md_active_view', view);
    }
  };

  const handleSelectTag = (tag: string | null) => {
    closePostDetail();
    setActiveTag((prev) =>
      tag && prev?.toLowerCase() === tag.toLowerCase() ? null : tag
    );
    setActiveView('timeline');
  };

  const handleSelectMonth = (month: string | null) => {
    closePostDetail();
    setActiveMonth((prev) => (prev === month ? null : month));
    setActiveView('timeline');
  };

  const selectedPost = useMemo(
    () => (selectedPostId ? posts.find((p) => p.id === selectedPostId) || null : null),
    [posts, selectedPostId]
  );

  const hasAnyFilter = Boolean(activeTag || activeMonth || searchQuery || dateFrom || dateTo);

  const effectiveBackdropUrl =
    design.customBackdropUrl || activeCustomTheme?.backdropImageUrl || '';
  const isEffectiveDark = activeCustomTheme
    ? activeCustomTheme.isDark
    : design.theme === 'twilight-lagoon' ||
      design.theme === 'metro-eclipse-dark' ||
      design.theme === 'metro-ipod-electric';

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
        onSelectView={handleNavigateView}
        onOpenComposer={openNewComposer}
        isAdmin={isAdmin}
        userEmail={user?.email}
        authReady={authReady}
        onSignIn={handleOwnerSignIn}
        onSignOut={handleOwnerSignOut}
      />

      <button
        type="button"
        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        className="fixed right-4 top-20 z-40 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/90 text-slate-700 shadow-lg backdrop-blur-xl hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 cursor-pointer"
      >
        {isSidebarCollapsed ? (
          <PanelRightOpen className="h-4 w-4" />
        ) : (
          <PanelRightClose className="h-4 w-4" />
        )}
      </button>

      {activeView !== 'live' && (
        <ScheduledBanner
          banners={banners}
          now={nowDate}
          onManageBanners={() => {
            closePostDetail();
            setSettingsTab('banners');
            setActiveView('settings');
          }}
          onNavigateView={handleNavigateView}
        />
      )}

      <main className="mx-auto max-w-[1380px] space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className={isSidebarCollapsed ? 'lg:col-span-12 space-y-5' : 'lg:col-span-8 space-y-5'}>
            {activeView === 'timeline' && selectedPostId ? (
              <div className="space-y-4">
                <section className="aero-glass flex items-center justify-between gap-3 rounded-3xl px-5 py-3.5">
                  <button
                    type="button"
                    onClick={closePostDetail}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Post</span>
                  </button>
                  <button
                    type="button"
                    onClick={closePostDetail}
                    className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                  >
                    Back to Timeline
                  </button>
                </section>

                {isLoading ? (
                  <div className="aero-glass h-64 animate-pulse rounded-3xl p-6" />
                ) : selectedPost ? (
                  <TimelineCard
                    post={selectedPost}
                    nowMs={nowMs}
                    activeTag={activeTag}
                    canEdit={isAdmin}
                    isDetailView={true}
                    onSelectTag={handleSelectTag}
                    onEdit={openEditComposer}
                    onDelete={handleDeletePost}
                    onTogglePin={handleTogglePin}
                    onOpenLightbox={(url, title) =>
                      setLightbox({ url, title })
                    }
                  />
                ) : (
                  <div className="aero-glass rounded-3xl p-8 text-center space-y-3">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Post not found
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This entry may have been removed or is not currently public.
                    </p>
                    <button
                      type="button"
                      onClick={closePostDetail}
                      className="aero-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Return to Timeline
                    </button>
                  </div>
                )}
              </div>
            ) : activeView === 'timeline' && (
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
                        placeholder="Search"
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

                      <div
                        role="group"
                        aria-label="Timeline layout"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/75 p-1 dark:border-slate-700 dark:bg-slate-900/70 shrink-0"
                      >
                        <button
                          type="button"
                          onClick={() => setTimelineLayout('stack')}
                          aria-pressed={timelineLayout === 'stack'}
                          aria-label="Single column stack"
                          title="Single column stack"
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
                            timelineLayout === 'stack'
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                          }`}
                        >
                          <Rows3 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimelineLayout('grid')}
                          aria-pressed={timelineLayout === 'grid'}
                          aria-label="Pinterest masonry grid"
                          title="Pinterest masonry grid"
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
                            timelineLayout === 'grid'
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                          }`}
                        >
                          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
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
                      onClick={() => {
                        setIsLoading(true);
                        setSubNonce((n) => n + 1);
                      }}
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
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={openNewComposer}
                        className="aero-button-primary mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
                      >
                        Create First Entry
                      </button>
                    )}
                  </div>
                ) : timelineLayout === 'grid' && isTwoColViewport ? (
                  <div className="grid grid-cols-2 items-start gap-5">
                    {[0, 1].map((colIdx) => (
                      <div key={colIdx} className="space-y-5 min-w-0">
                        {filteredTimelinePosts
                          .filter((_, idx) => idx % 2 === colIdx)
                          .map((post) => (
                            <TimelineCard
                              key={post.id}
                              post={post}
                              nowMs={nowMs}
                              activeTag={activeTag}
                              canEdit={isAdmin}
                              layoutMode="grid"
                              onOpenPost={openPostDetail}
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
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredTimelinePosts.map((post) => (
                      <TimelineCard
                        key={post.id}
                        post={post}
                        nowMs={nowMs}
                        activeTag={activeTag}
                        canEdit={isAdmin}
                        layoutMode={timelineLayout}
                        onOpenPost={openPostDetail}
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
                draftPosts={draftPosts}
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
                isAdmin={isAdmin}
                userEmail={user?.email}
                authError={authError}
                onSignIn={handleOwnerSignIn}
                onSignOut={handleOwnerSignOut}
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

          {!isSidebarCollapsed ? (
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
                onToggleCollapse={() => setIsSidebarCollapsed(true)}
              />
            </div>
          ) : (
            <div className="flex justify-end lg:col-span-12">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer shadow-sm"
              >
                <span>Expand Sidebar</span>
              </button>
            </div>
          )}
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
              onClick={() => handleNavigateView(tab.id)}
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
              className="max-h-[90vh] w-auto object-contain"
            />
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
