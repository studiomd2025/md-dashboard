/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Home,
  LayoutGrid,
  Rows3,
  Search,
  Settings as SettingsIcon,
  Smartphone,
  Tv,
  X,
} from 'lucide-react';
import type {
  AccessRequestRecord,
  ActiveView,
  BackendTab,
  BannerSchedule,
  CollaboratorRecord,
  CountdownFormat,
  DesignSettings,
  DiaryFont,
  EventCountdown,
  IntranetState,
  MediaAttachment,
  PlayEventRecord,
  Post,
} from './types';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getMergedPostTags, getMonthKey, stripHtml } from './lib/mediaUtils';
import { buildApiUrl, fetchJsonWithRetry } from './lib/apiClient';
import {
  DEFAULT_TIME_ZONE,
  dateFilterBoundToMs,
  getTimeZoneAbbr,
} from './lib/timeZones';
import { getCustomThemeColors, getThemeIsDark } from './lib/themeColors';
import { TimeZoneSelect } from './components/TimeZoneSelect';
import {
  auth,
  isBootstrapOwnerUser,
  isOwnerUser,
  signInOwnerWithGoogle,
  signOutOwner,
} from './lib/firebase';
import {
  addCollaboratorDoc,
  approveAccessRequestDoc,
  createBannerDoc,
  createCountdownDoc,
  createPlayEventDoc,
  createPostDoc,
  declineAccessRequestDoc,
  deleteBannerDoc,
  deleteCountdownDoc,
  deletePlayEventDoc,
  deletePostDoc,
  deleteTagBatch,
  ensureSelfCollaboratorDoc,
  removeCollaboratorDoc,
  renameTagBatch,
  saveDesignConfigDoc,
  seedFirestoreIfEmpty,
  submitAccessRequestDoc,
  subscribeDashboardData,
  subscribeOwnAccessRequest,
  subscribeOwnCollaboratorStatus,
  subscribeTeamManagement,
  updateBannerDoc,
  updateCountdownDoc,
  updatePostDoc,
  upsertPlayEventWithIdDoc,
  withdrawAccessRequestDoc,
} from './lib/firestoreStore';
import { Header } from './components/Header';
import { ScheduledBanner } from './components/ScheduledBanner';
import { TimelineCard } from './components/TimelineCard';
import { MobileCountdownStrip, Sidebar } from './components/Sidebar';
import { NextOnMdView } from './components/NextOnMdView';
import { RichComposerModal } from './components/RichComposerModal';
import { BackendConsoleView } from './components/BackendConsoleView';
import { RegisterModal } from './components/RegisterModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { InAppWebModal } from './components/InAppWebModal';
import {
  LiveTvView,
  PLAY_EVENTS,
  STATIONS,
  type BroadcastChannel,
  type PlayEventItem,
} from './components/LiveTvView';
import { MobileWidgetStudioView } from './components/MobileWidgetStudioView';
import { OfflineIndicator } from './components/PWAInstallButton';
import { YmdDateInput } from './components/YmdDateInputs';
import { useFlipLayout, useSystemAnimationGuard } from './hooks/useFlipLayout';
import { useMobileDrawerSwipe } from './hooks/useMobileDrawerSwipe';
import {
  checkBloggerFeedAlerts,
  evaluateDashboardAlerts,
  loadStoredNotifications,
  requestBrowserNotificationPermission,
  saveStoredNotifications,
  type AppNotificationItem,
} from './lib/notifications';
import {
  checkNativeNotificationsNow,
  isNativeAndroidBridgeAvailable,
  refreshAllNativeWidgets,
  syncCountdownsToNative,
} from './lib/widgetBridge';

const CACHED_CUSTOM_THEMES_KEY = 'md_cached_custom_themes_v1';

const loadCachedCustomThemes = (): DesignSettings['customThemes'] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CACHED_CUSTOM_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is NonNullable<DesignSettings['customThemes']>[number] =>
        Boolean(t && typeof t === 'object' && typeof t.id === 'string' && t.id !== 'default')
    );
  } catch {
    return [];
  }
};

const saveCachedCustomThemes = (themes: DesignSettings['customThemes']) => {
  if (typeof window === 'undefined') return;
  try {
    const safeList = (themes || []).filter((t) => t && t.id && t.id !== 'default');
    window.localStorage.setItem(CACHED_CUSTOM_THEMES_KEY, JSON.stringify(safeList));
  } catch {
    // ignore storage quota errors
  }
};

const getInitialDesignState = (): DesignSettings => {
  const fallback: DesignSettings = {
    theme: 'default',
    surfaceStyle: 'aero-glass',
    customBackdropUrl: '',
    customThemes: loadCachedCustomThemes(),
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const savedLocal = window.localStorage.getItem('md-visitor-design');
    if (savedLocal) {
      const parsed = JSON.parse(savedLocal) as Partial<DesignSettings>;
      return {
        ...fallback,
        theme: parsed.theme || 'default',
        surfaceStyle:
          parsed.surfaceStyle === 'crisp-2026' ? 'crisp-2026' : 'aero-glass',
      };
    }
  } catch {
    // ignore localStorage read error
  }
  return fallback;
};

export default function App() {
  useSystemAnimationGuard();
  const [posts, setPosts] = useState<Post[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('md_cached_posts_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [banners, setBanners] = useState<BannerSchedule[]>([]);
  const [countdowns, setCountdowns] = useState<EventCountdown[]>([]);
  const [customPlayEvents, setCustomPlayEvents] = useState<PlayEventRecord[]>([]);
  const [scrollToPlayEventNonce, setScrollToPlayEventNonce] = useState(0);
  const [design, setDesign] = useState<DesignSettings>(getInitialDesignState);
  const serverDesignRef = useRef<{
    theme: DesignSettings['theme'];
    surfaceStyle: DesignSettings['surfaceStyle'];
  }>({
    theme: 'default',
    surfaceStyle: 'aero-glass',
  });
  const [isLoading, setIsLoading] = useState(() => posts.length === 0);
  const [loadError, setLoadError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [subNonce, setSubNonce] = useState(0);
  const [hasCollaboratorAccess, setHasCollaboratorAccess] = useState(false);
  const [ownAccessRequest, setOwnAccessRequest] = useState<AccessRequestRecord | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestRecord[]>([]);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const isAdmin = useMemo(
    () => isOwnerUser(user, hasCollaboratorAccess),
    [user, hasCollaboratorAccess]
  );

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window === 'undefined') return 'timeline';
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (params.has('countdown') || hash === '#/next') return 'next';
    if (hash === '#/live') return 'live';
    if (hash === '#/settings') return 'settings';
    if (hash === '#/install') return 'install';
    if (hash === '#/timeline') return 'timeline';
    const saved = window.localStorage.getItem('md_active_view');
    if (
      saved === 'live' ||
      saved === 'settings' ||
      saved === 'install' ||
      saved === 'timeline' ||
      saved === 'next'
    ) {
      return saved as ActiveView;
    }
    return 'timeline';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('md_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileDateSearchOpen, setIsMobileDateSearchOpen] = useState(false);
  const [isMobileSplitVisible, setIsMobileSplitVisible] = useState(false);
  const [mobileSplitHeight, setMobileSplitHeight] = useState(0);
  const [inAppWebModal, setInAppWebModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({ isOpen: false, url: '', title: '' });
  const mainScrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollPageToTop = (behavior: ScrollBehavior = 'auto') => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior });
    mainScrollContainerRef.current?.scrollTo({ top: 0, behavior });
  };

  const {
    isDraggingDrawer,
    dragOffsetPx,
    backdropOpacity,
  } = useMobileDrawerSwipe({
    isOpen: isMobileSidebarOpen,
    onOpen: () => setIsMobileSidebarOpen(true),
    onClose: () => setIsMobileSidebarOpen(false),
  });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('post');
  });
  const [selectedCountdownId, setSelectedCountdownId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('countdown');
  });
  const [activeStation, setActiveStation] = useState<BroadcastChannel>(STATIONS[0]);
  const [activeEvent, setActiveEvent] = useState<PlayEventItem | null>(null);
  const [floatingPlayerEnabled, setFloatingPlayerEnabled] = useState(false);
  const [settingsTab, setSettingsTab] = useState<BackendTab>('compose');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterTimeZone, setFilterTimeZone] = useState<string>(DEFAULT_TIME_ZONE);
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
  const [notifications, setNotifications] = useState<AppNotificationItem[]>(() =>
    loadStoredNotifications()
  );
  const [webPushPermission, setWebPushPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  });
  const pendingPlayEventScrollRef = useRef(false);
  const bootSplashDismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as Window & {
      __mdSetBootProgress?: (pct: number, label?: string) => void;
      __mdDismissBootSplash?: () => void;
    };

    if (bootSplashDismissedRef.current) return;

    if (!authReady) {
      win.__mdSetBootProgress?.(76, 'Connecting…');
    } else if (isLoading) {
      win.__mdSetBootProgress?.(90, 'Loading entries…');
    } else {
      bootSplashDismissedRef.current = true;
      win.__mdSetBootProgress?.(100, 'Ready');
      const doneTimer = window.setTimeout(() => {
        win.__mdDismissBootSplash?.();
      }, 120);
      return () => window.clearTimeout(doneTimer);
    }

    // Never block navigation or media playback if Firestore takes too long / offline
    const fallbackTimer = window.setTimeout(() => {
      if (!bootSplashDismissedRef.current) {
        bootSplashDismissedRef.current = true;
        win.__mdDismissBootSplash?.();
      }
    }, 3200);
    return () => window.clearTimeout(fallbackTimer);
  }, [authReady, isLoading]);

  const { containerRef: timelineFlipRef, captureFlip: captureTimelineFlip } =
    useFlipLayout(`${timelineLayout}-${isSidebarCollapsed}-${isTwoColViewport}`);

  const activeCustomTheme = useMemo(
    () =>
      design.theme === 'default'
        ? null
        : (design.customThemes || []).find((t) => t.id === design.theme) || null,
    [design.customThemes, design.theme]
  );

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const syncPref = () => setSystemPrefersDark(mq.matches);
    syncPref();
    mq.addEventListener('change', syncPref);
    return () => mq.removeEventListener('change', syncPref);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', design.theme);
    root.setAttribute('data-surface', design.surfaceStyle);

    const isDark = getThemeIsDark(design, systemPrefersDark);
    root.classList.toggle('dark', isDark);
    root.toggleAttribute('data-custom-override', Boolean(activeCustomTheme));

    if (activeCustomTheme) {
      const customColors = getCustomThemeColors(activeCustomTheme);
      root.style.setProperty('--accent-start', activeCustomTheme.accentStart);
      root.style.setProperty('--accent-end', activeCustomTheme.accentEnd);
      root.style.setProperty('--accent-shadow', 'rgba(15, 23, 42, 0.25)');
      root.style.setProperty('--countdown-ink', customColors.countdownInk);
      root.style.setProperty('--theme-link', customColors.themeLink);
      document.body.style.backgroundColor = activeCustomTheme.canvasBg;
      document.body.style.backgroundImage = 'none';
    } else {
      root.style.removeProperty('--accent-start');
      root.style.removeProperty('--accent-end');
      root.style.removeProperty('--accent-shadow');
      root.style.removeProperty('--countdown-ink');
      root.style.removeProperty('--theme-link');
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('background-image');
    }
  }, [design, activeCustomTheme, systemPrefersDark]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Sync Firestore countdowns to Android home-screen widgets
  useEffect(() => {
    if (countdowns.length > 0) {
      syncCountdownsToNative(countdowns);
    }
  }, [countdowns]);

  // Evaluate due scheduled posts & countdown target dates (bucketed every 15s)
  const alertEvalBucket = Math.floor(nowMs / 15000);
  useEffect(() => {
    if (posts.length === 0 && countdowns.length === 0) return;
    let cancelled = false;
    evaluateDashboardAlerts({ posts, countdowns, nowMs })
      .then(({ items }) => {
        if (!cancelled) setNotifications(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [posts, countdowns, alertEvalBucket]);

  // Poll https://officialmdmemo.blogspot.com Blogger feed + native check
  useEffect(() => {
    let cancelled = false;
    const runChecks = async () => {
      try {
        const res = await checkBloggerFeedAlerts();
        if (!cancelled) setNotifications(res.items);
      } catch {
        // ignore transient feed error
      }
      if (isNativeAndroidBridgeAvailable()) {
        checkNativeNotificationsNow();
      }
    };

    runChecks();
    const pollTimer = window.setInterval(runChecks, 5 * 60 * 1000);
    const onFocus = () => {
      runChecks();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runChecks();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
      const params = new URLSearchParams(window.location.search);
      const nextPostId = params.get('post');
      const nextCdId = params.get('countdown');
      setSelectedPostId(nextPostId);
      setSelectedCountdownId(nextCdId);
      if (nextPostId) {
        setActiveView('timeline');
      } else if (nextCdId || window.location.hash === '#/next') {
        setActiveView('next');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => {
      const hash = window.location.hash;
      const shouldPreserve = hash === '#/live' && pendingPlayEventScrollRef.current;
      if (hash === '#/live') setActiveView('live');
      else if (hash === '#/settings') setActiveView('settings');
      else if (hash === '#/install') setActiveView('install');
      else if (hash === '#/next') setActiveView('next');
      else if (hash === '#/timeline') setActiveView('timeline');
      else return;

      if (!shouldPreserve) {
        scrollPageToTop('auto');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('md_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Floating/split mode is strictly user-initiated and never restored until user clicks Restore/Close.

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setHasCollaboratorAccess(false);
        setOwnAccessRequest(null);
        setCollaborators([]);
        setAccessRequests([]);
        setAuthError('');
      } else if (!nextUser.emailVerified) {
        setHasCollaboratorAccess(false);
        setAuthError(
          `Signed in as ${nextUser.email || 'unknown account'}, but this email is not verified by Google.`
        );
      } else {
        setAuthError('');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.email || !user.emailVerified) {
      setHasCollaboratorAccess(false);
      return;
    }
    setHasCollaboratorAccess(true);
    if (!isBootstrapOwnerUser(user)) {
      ensureSelfCollaboratorDoc(
        user.uid,
        user.email,
        user.displayName || undefined
      );
    }
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || !user || isAdmin) {
      setOwnAccessRequest(null);
      return;
    }
    return subscribeOwnAccessRequest(user.uid, (req) => {
      setOwnAccessRequest(req);
    });
  }, [authReady, user, isAdmin]);

  useEffect(() => {
    if (!authReady || !isAdmin) {
      setCollaborators([]);
      setAccessRequests([]);
      return;
    }
    return subscribeTeamManagement({
      onCollaborators: setCollaborators,
      onRequests: setAccessRequests,
      onError: (err) => {
        console.warn('Team subscription warning:', err);
      },
    });
  }, [authReady, isAdmin]);

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

    const applyDeviceThemePreference = (baseDesign: DesignSettings): DesignSettings => {
      try {
        const savedLocal = localStorage.getItem('md-visitor-design');
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal) as Partial<DesignSettings>;
          const availableCustomIds = new Set(
            (baseDesign.customThemes || []).map((t) => t.id)
          );
          const candidateTheme = parsed.theme;
          const isValidCustomOrBuiltin =
            Boolean(candidateTheme) &&
            (!String(candidateTheme).startsWith('custom-') ||
              availableCustomIds.has(String(candidateTheme)));

          return {
            ...baseDesign,
            theme: isValidCustomOrBuiltin && candidateTheme ? candidateTheme : baseDesign.theme,
            surfaceStyle: parsed.surfaceStyle || baseDesign.surfaceStyle,
          };
        }
      } catch {
        // ignore localStorage parse error
      }
      return baseDesign;
    };

    const maybeLoadStarterPreview = async () => {
      if (fallbackFetched || sawDesignInFirestore || sawPostsInFirestore || isAdmin) {
        return;
      }
      fallbackFetched = true;
      try {
        const stateUrl = buildApiUrl('/api/state');
        const data = await fetchJsonWithRetry<IntranetState>(stateUrl, {
          timeoutMs: 20000,
          retries: 1,
        });
        if (cancelled || sawDesignInFirestore || sawPostsInFirestore) return;
        setPosts(data.posts || []);
        setBanners(data.banners || []);
        setCountdowns(data.countdowns || []);
        if (data.design) {
          serverDesignRef.current = {
            theme: data.design.theme,
            surfaceStyle: data.design.surfaceStyle,
          };
          saveCachedCustomThemes(data.design.customThemes);
          setDesign(applyDeviceThemePreference(data.design));
        }
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
      onPlayEvents: (rows) => {
        if (cancelled) return;
        setCustomPlayEvents(rows);
      },
      onDesign: (nextDesign, existsInFirestore) => {
        if (cancelled) return;
        sawDesignInFirestore = existsInFirestore;
        if (existsInFirestore) {
          serverDesignRef.current = {
            theme: nextDesign.theme,
            surfaceStyle: nextDesign.surfaceStyle,
          };
          saveCachedCustomThemes(nextDesign.customThemes);
          setDesign(applyDeviceThemePreference(nextDesign));
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
      if (!signedIn.emailVerified) {
        setAuthError(
          `Signed in as ${signedIn.email || 'guest'}, but Google email verification is required.`
        );
      }
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Sign-in cancelled.';
      if (rawMsg.includes('auth/unauthorized-domain')) {
        setAuthError(
          `${rawMsg} — Add "${window.location.hostname}" to Firebase Console > Authentication > Settings > Authorized domains for project ${auth.app.options.projectId || ''}.`
        );
      } else if (rawMsg.includes('auth/popup-blocked')) {
        setAuthError(
          `${rawMsg} — Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.`
        );
      } else {
        setAuthError(rawMsg);
      }
    }
  };

  const handleOwnerSignOut = async () => {
    await signOutOwner();
    setAuthError('');
  };

  const handleAddCollaborator = async (email: string, note?: string) => {
    if (!user || !isAdmin) return;
    await addCollaboratorDoc(user.uid, user.email || '', email, { note });
  };

  const handleRemoveCollaborator = async (emailId: string) => {
    if (!isAdmin) return;
    await removeCollaboratorDoc(emailId);
  };

  const handleApproveAccessRequest = async (req: AccessRequestRecord) => {
    if (!user || !isAdmin) return;
    await approveAccessRequestDoc(user.uid, user.email || '', req);
  };

  const handleDeclineAccessRequest = async (uid: string) => {
    if (!isAdmin) return;
    await declineAccessRequestDoc(uid);
  };

  const handleSubmitAccessRequest = async (note: string) => {
    if (!user) return;
    await submitAccessRequestDoc({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || undefined,
      note,
    });
  };

  const handleWithdrawAccessRequest = async () => {
    if (!user) return;
    await withdrawAccessRequestDoc(user.uid);
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

  const liveCustomPlayEvents = useMemo(
    () =>
      customPlayEvents.filter((ev) => {
        if (!ev.scheduledFor) return true;
        const ts = new Date(ev.scheduledFor).getTime();
        return Number.isNaN(ts) || ts <= nowMs;
      }),
    [customPlayEvents, nowMs]
  );

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
    const fromMs = dateFilterBoundToMs(dateFrom, 'start', filterTimeZone);
    const toMs = dateFilterBoundToMs(dateTo, 'end', filterTimeZone);

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
  }, [livePosts, activeTag, activeMonth, dateFrom, dateTo, filterTimeZone, searchQuery]);

  const handleSavePost = async (payload: {
    id?: string;
    title: string;
    bodyHtml: string;
    font: Post['font'];
    manualTags: string[];
    inlineTags: string[];
    attachments: Post['attachments'];
    scheduledFor: string | null;
    scheduledTimeZone?: string | null;
    pinnedUntil: string | null;
    pinnedTimeZone?: string | null;
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
        scheduledTimeZone: payload.scheduledTimeZone ?? null,
        publishedAt: payload.scheduledFor || new Date().toISOString(),
        pinnedUntil: payload.pinnedUntil,
        pinnedTimeZone: payload.pinnedTimeZone ?? null,
        isDraft: Boolean(payload.isDraft),
      });
    } else {
      await createPostDoc(user.uid, payload);
    }
    refreshAllNativeWidgets();
  };

  const handleDeletePost = async (id: string) => {
    if (!isAdmin) return;
    await deletePostDoc(id);
    if (selectedPostId === id) {
      closePostDetail();
    }
    refreshAllNativeWidgets();
  };

  const handleTogglePin = async (post: Post) => {
    if (!isAdmin) return;
    const currentlyPinned =
      !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
    const nextPinnedUntil = currentlyPinned
      ? null
      : new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    await updatePostDoc(post.id, {
      pinnedUntil: nextPinnedUntil,
      pinnedTimeZone: currentlyPinned ? null : DEFAULT_TIME_ZONE,
    });
    refreshAllNativeWidgets();
  };

  const handlePublishScheduledNow = async (post: Post) => {
    if (!isAdmin) return;
    const nowIso = new Date().toISOString();
    await updatePostDoc(post.id, {
      isDraft: false,
      scheduledFor: null,
      publishedAt: nowIso,
    });
    refreshAllNativeWidgets();
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
    timeZone?: string;
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
    refreshAllNativeWidgets();
  };

  const handleUpdateCountdown = async (
    id: string,
    payload: Omit<EventCountdown, 'id'>
  ) => {
    if (!user || !isAdmin) return;
    await updateCountdownDoc(id, payload);
    refreshAllNativeWidgets();
  };

  const handleDeleteCountdown = async (id: string) => {
    if (!isAdmin) return;
    await deleteCountdownDoc(id);
    refreshAllNativeWidgets();
  };

  const handleAddPlayEvent = async (payload: Omit<PlayEventRecord, 'id'>) => {
    if (!user || !isAdmin) return;
    await createPlayEventDoc(user.uid, payload);
  };

  const handleUpdatePlayEvent = async (
    id: string,
    payload: Omit<PlayEventRecord, 'id'>
  ) => {
    if (!user || !isAdmin) return;
    await upsertPlayEventWithIdDoc(user.uid, id, {
      ...payload,
      isDeleted: Boolean(payload.isDeleted),
    });
  };

  const handleDeletePlayEvent = async (id: string) => {
    if (!user || !isAdmin) return;
    const builtIn = PLAY_EVENTS.find((ev) => ev.id === id);
    if (builtIn) {
      await upsertPlayEventWithIdDoc(user.uid, id, {
        title: builtIn.title,
        url: builtIn.url,
        kind: builtIn.kind,
        mediaId: builtIn.mediaId,
        dateLabel: builtIn.dateLabel,
        year: builtIn.year,
        era: builtIn.era,
        isDeleted: true,
      });
    } else {
      await deletePlayEventDoc(id);
    }
  };

  const handleRestorePlayEvent = async (id: string) => {
    if (!isAdmin) return;
    await deletePlayEventDoc(id);
  };

  const handleUpdateDesign = async (next: Partial<DesignSettings>) => {
    const sanitizedNext: Partial<DesignSettings> =
      next.customThemes !== undefined
        ? {
            ...next,
            customThemes: next.customThemes.filter(
              (t) => t && t.id && t.id !== 'default'
            ),
          }
        : next;

    const merged: DesignSettings = { ...design, ...sanitizedNext };
    setDesign(merged);

    if (sanitizedNext.customThemes !== undefined) {
      saveCachedCustomThemes(merged.customThemes);
    }

    if (sanitizedNext.theme !== undefined || sanitizedNext.surfaceStyle !== undefined) {
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

    const managesGlobalAssets =
      sanitizedNext.customThemes !== undefined ||
      sanitizedNext.customBackdropUrl !== undefined;

    if (user && isAdmin && managesGlobalAssets) {
      const remainingCustomIds = new Set(
        (merged.customThemes || []).map((t) => t.id)
      );
      const serverTheme =
        !String(serverDesignRef.current.theme).startsWith('custom-') ||
        remainingCustomIds.has(String(serverDesignRef.current.theme))
          ? serverDesignRef.current.theme
          : 'default';

      await saveDesignConfigDoc(user.uid, {
        ...merged,
        theme: serverTheme,
        surfaceStyle: serverDesignRef.current.surfaceStyle,
      });
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
    scrollPageToTop('smooth');
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

  const openCountdownPage = (countdownId?: string) => {
    const targetId = countdownId || countdowns[0]?.id || null;
    setSelectedPostId(null);
    setSelectedCountdownId(targetId);
    setActiveView('next');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('post');
      if (targetId) {
        url.searchParams.set('countdown', targetId);
      } else {
        url.searchParams.delete('countdown');
      }
      window.history.pushState(
        { countdownId: targetId },
        '',
        url.pathname + (url.search ? url.search : '') + '#/next'
      );
      window.localStorage.setItem('md_active_view', 'next');
      scrollPageToTop('smooth');
    }
  };

  const handleNavigateView = (view: ActiveView) => {
    const shouldPreserveScrollForPlayEvent =
      view === 'live' && pendingPlayEventScrollRef.current;
    pendingPlayEventScrollRef.current = false;

    setSelectedPostId(null);
    if (view !== 'next') {
      setSelectedCountdownId(null);
    }
    const url = new URL(window.location.href);
    let mutatedSearch = false;
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      mutatedSearch = true;
    }
    if (view !== 'next' && url.searchParams.has('countdown')) {
      url.searchParams.delete('countdown');
      mutatedSearch = true;
    }
    if (mutatedSearch) {
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
      if (!shouldPreserveScrollForPlayEvent) {
        scrollPageToTop('auto');
      }
    }
  };

  const handleSelectTag = (tag: string | null) => {
    closePostDetail();
    setSelectedCountdownId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('countdown')) {
        url.searchParams.delete('countdown');
        window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
      }
      window.location.hash = '#/timeline';
      window.localStorage.setItem('md_active_view', 'timeline');
      scrollPageToTop('auto');
    }
    setActiveTag((prev) =>
      tag && prev?.toLowerCase() === tag.toLowerCase() ? null : tag
    );
    setActiveView('timeline');
  };

  const handleSelectMonth = (month: string | null) => {
    closePostDetail();
    setSelectedCountdownId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('countdown')) {
        url.searchParams.delete('countdown');
        window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
      }
      window.location.hash = '#/timeline';
      window.localStorage.setItem('md_active_view', 'timeline');
      scrollPageToTop('auto');
    }
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
  const isEffectiveDark = getThemeIsDark(design, systemPrefersDark);

  const wrapperStyle: React.CSSProperties | undefined = effectiveBackdropUrl
    ? {
        backgroundColor: activeCustomTheme?.canvasBg,
        backgroundImage: isEffectiveDark
          ? `linear-gradient(rgba(4,11,20,0.52), rgba(4,11,20,0.52)), url(${effectiveBackdropUrl})`
          : `linear-gradient(rgba(255,255,255,0.34), rgba(255,255,255,0.34)), url(${effectiveBackdropUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: isTwoColViewport ? 'fixed' : 'scroll',
      }
    : activeCustomTheme
    ? {
        backgroundColor: activeCustomTheme.canvasBg,
        backgroundImage: 'none',
        color: isEffectiveDark ? '#f1f5f9' : '#0f172a',
      }
    : undefined;

  return (
    <div
      style={wrapperStyle}
      className="min-h-screen sm:pb-20 lg:pb-12 max-sm:h-[100dvh] max-sm:min-h-0 max-sm:overflow-hidden max-sm:flex max-sm:flex-col"
    >
      <Header
        activeView={activeView}
        onSelectView={handleNavigateView}
        onOpenComposer={openNewComposer}
        isAdmin={isAdmin}
        userEmail={user?.email}
        authReady={authReady}
        hasPendingRequest={Boolean(ownAccessRequest)}
        onSignIn={handleOwnerSignIn}
        onOpenRegister={() => setRegisterModalOpen(true)}
        onSignOut={handleOwnerSignOut}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => {
          if (activeView === 'timeline' && timelineLayout === 'grid') {
            captureTimelineFlip();
          }
          setIsSidebarCollapsed((prev) => !prev);
        }}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        notifications={notifications}
        onNotificationClick={(item) => {
          const updated = saveStoredNotifications(
            notifications.map((n) => (n.id === item.id ? { ...n, read: true } : n))
          );
          setNotifications(updated);
          if (item.openExternal) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
          } else if (item.kind === 'countdown') {
            const m = item.url.match(/countdown=([^&#]+)/);
            openCountdownPage(m ? decodeURIComponent(m[1]) : undefined);
          } else if (item.kind === 'scheduled') {
            const m = item.url.match(/post=([^&#]+)/);
            const target = m ? posts.find((p) => p.id === decodeURIComponent(m[1])) : null;
            if (target) openPostDetail(target);
            else handleNavigateView('timeline');
          }
        }}
        onMarkAllNotificationsRead={() => {
          setNotifications(
            saveStoredNotifications(notifications.map((n) => ({ ...n, read: true })))
          );
        }}
        onCheckNotificationsNow={async () => {
          const [evalRes, blogRes] = await Promise.all([
            evaluateDashboardAlerts({ posts, countdowns, nowMs: Date.now() }),
            checkBloggerFeedAlerts().catch(() => null),
          ]);
          setNotifications(blogRes ? blogRes.items : evalRes.items);
          if (isNativeAndroidBridgeAvailable()) {
            await checkNativeNotificationsNow();
          }
        }}
        canRequestWebPush={
          !isNativeAndroidBridgeAvailable() && webPushPermission === 'default'
        }
        onRequestWebPush={async () => {
          const perm = await requestBrowserNotificationPermission();
          setWebPushPermission(perm);
        }}
      />

      <div
        ref={mainScrollContainerRef}
        style={{ overflowAnchor: 'none' }} className="max-sm:flex-1 max-sm:min-h-0 max-sm:overflow-y-auto max-sm:overscroll-y-contain max-sm:touch-pan-y"
      >
        {activeView === 'timeline' && !selectedPostId && (
          <ScheduledBanner
            banners={banners}
            now={nowDate}
            onNavigateView={handleNavigateView}
          />
        )}

        {/* Mobile / Tablet Countdown Strip only appears on main Timeline view (below active banner) */}
        {activeView === 'timeline' && !selectedPostId && (
          <MobileCountdownStrip
            countdowns={countdowns}
            nowMs={nowMs}
            design={design}
            onOpenCountdown={openCountdownPage}
          />
        )}

        <main className={`flex-1 min-h-0 max-sm:w-full max-sm:overflow-y-auto mx-auto max-w-[1380px] space-y-6 px-4 pt-6 sm:px-6 lg:px-8 ${
          floatingPlayerEnabled ? 'pb-6 sm:pb-[160px]' : 'pb-6 sm:pb-16'
        }`}>
        {authError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50/95 px-4 py-3 text-xs font-medium text-rose-800 shadow-sm backdrop-blur-md dark:border-rose-700/70 dark:bg-rose-950/80 dark:text-rose-200"
          >
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError('')}
              aria-label="Dismiss sign-in error"
              className="shrink-0 font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-0 lg:items-start">
          <div className="min-w-0 flex-1 space-y-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
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
                <section className="aero-glass rounded-3xl p-3.5 sm:p-5">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="relative flex-1 min-w-0">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full rounded-2xl border border-slate-200/90 bg-white/85 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                      />
                    </div>

                    {/* Mobile Date Search Expand Button (beside search bar) */}
                    <button
                      type="button"
                      onClick={() => setIsMobileDateSearchOpen((prev) => !prev)}
                      aria-expanded={isMobileDateSearchOpen}
                      aria-label="Toggle date range search"
                      title="Date range filter"
                      className={`inline-flex md:hidden h-10 items-center gap-1 rounded-2xl border px-2.5 text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                        isMobileDateSearchOpen || dateFrom || dateTo
                          ? 'border-sky-500/80 bg-sky-50 text-sky-700 dark:border-sky-500/70 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'border-slate-200/90 bg-white/85 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-200'
                      }`}
                    >
                      <CalendarDays className="h-4 w-4" />
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isMobileDateSearchOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Tablet/Desktop Inline Date Filter + View Buttons */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <label htmlFor="desktop-date-from" className="font-medium">
                          From
                        </label>
                        <YmdDateInput
                          id="desktop-date-from"
                          value={dateFrom}
                          onChange={setDateFrom}
                          ariaLabel="Filter from date"
                          className="w-[128px]"
                          inputClassName="rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <label htmlFor="desktop-date-to" className="font-medium">
                          To
                        </label>
                        <YmdDateInput
                          id="desktop-date-to"
                          value={dateTo}
                          onChange={setDateTo}
                          ariaLabel="Filter to date"
                          className="w-[128px]"
                          inputClassName="rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Desktop Timeline View Toggle (Single Column vs Grid) */}
                    <div
                      role="group"
                      aria-label="Timeline layout"
                      className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/75 p-1 dark:border-slate-700 dark:bg-slate-900/70 shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (timelineLayout !== 'stack') {
                            captureTimelineFlip();
                            setTimelineLayout('stack');
                          }
                        }}
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
                        onClick={() => {
                          if (timelineLayout !== 'grid') {
                            captureTimelineFlip();
                            setTimelineLayout('grid');
                          }
                        }}
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

                  {/* Mobile / Small Tablet Expandable Top-to-Bottom Date Range Search */}
                  <div
                    className={`md:hidden grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isMobileDateSearchOpen
                        ? 'grid-rows-[1fr] opacity-100 mt-3'
                        : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`grid grid-cols-2 gap-2 pt-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isMobileDateSearchOpen ? 'translate-y-0' : '-translate-y-2'
                        }`}
                      >
                        <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <label htmlFor="mobile-date-from" className="font-semibold">
                            From
                          </label>
                          <YmdDateInput
                            id="mobile-date-from"
                            value={dateFrom}
                            onChange={setDateFrom}
                            ariaLabel="Filter from date"
                            inputClassName="w-full rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <label htmlFor="mobile-date-to" className="font-semibold">
                            To
                          </label>
                          <YmdDateInput
                            id="mobile-date-to"
                            value={dateTo}
                            onChange={setDateTo}
                            ariaLabel="Filter to date"
                            inputClassName="w-full rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white"
                          />
                        </div>
                        <TimeZoneSelect
                          id="mobile-filter-timezone"
                          label="Time Zone (optional)"
                          value={filterTimeZone}
                          onChange={setFilterTimeZone}
                          className="col-span-2"
                        />
                      </div>
                    </div>
                  </div>

                  {(hasAnyFilter || dateFrom || dateTo) && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-2.5 text-xs text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
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
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDateFrom('');
                              setDateTo('');
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                          >
                            {dateFrom || '...'} → {dateTo || '...'} ({getTimeZoneAbbr(filterTimeZone)}) ×
                          </button>
                          <TimeZoneSelect
                            id="desktop-filter-timezone"
                            compact
                            label="Filter Time Zone (optional)"
                            value={filterTimeZone}
                            onChange={setFilterTimeZone}
                            className="hidden md:block max-w-[230px]"
                          />
                        </>
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
                          setFilterTimeZone(DEFAULT_TIME_ZONE);
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
                ) : (
                  <div ref={timelineFlipRef}>
                    {timelineLayout === 'grid' && isTwoColViewport ? (
                      <div
                        className={`grid items-start gap-5 ${
                          isSidebarCollapsed
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-1 sm:grid-cols-2'
                        }`}
                      >
                        {Array.from({ length: isSidebarCollapsed ? 3 : 2 }, (_, colIdx) => (
                          <div key={colIdx} className="space-y-5 min-w-0">
                            {filteredTimelinePosts
                              .filter((_, idx) => idx % (isSidebarCollapsed ? 3 : 2) === colIdx)
                              .map((post) => (
                                <div key={post.id} data-flip-id={post.id}>
                                  <TimelineCard
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
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {filteredTimelinePosts.map((post) => (
                          <div key={post.id} data-flip-id={post.id}>
                            <TimelineCard
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
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
                onUpdateCountdown={handleUpdateCountdown}
                onDeleteCountdown={handleDeleteCountdown}
                customPlayEvents={customPlayEvents}
                onAddPlayEvent={handleAddPlayEvent}
                onUpdatePlayEvent={handleUpdatePlayEvent}
                onDeletePlayEvent={handleDeletePlayEvent}
                onRestorePlayEvent={handleRestorePlayEvent}
                onRenameTag={handleRenameTag}
                onDeleteTag={handleDeleteTag}
                onFilterByTag={(tag) => handleSelectTag(tag)}
                onAddBanner={handleAddBanner}
                onUpdateBanner={handleUpdateBanner}
                onDeleteBanner={handleDeleteBanner}
                onUpdateDesign={handleUpdateDesign}
                collaborators={collaborators}
                accessRequests={accessRequests}
                onAddCollaborator={handleAddCollaborator}
                onRemoveCollaborator={handleRemoveCollaborator}
                onApproveRequest={handleApproveAccessRequest}
                onDeclineRequest={handleDeclineAccessRequest}
                onOpenRegister={() => setRegisterModalOpen(true)}
                hasPendingRequest={Boolean(ownAccessRequest)}
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
                design={design}
                activeStation={activeStation}
                onOpenTimeline={() => handleNavigateView('timeline')}
                onOpenLive={() => handleNavigateView('live')}
                onOpenCountdown={openCountdownPage}
              />
            )}

            {activeView === 'next' && (
              <NextOnMdView
                countdowns={countdowns}
                selectedCountdownId={selectedCountdownId}
                nowMs={nowMs}
                isAdmin={isAdmin}
                onSelectCountdown={(id) => openCountdownPage(id)}
                onBackToTimeline={() => handleNavigateView('timeline')}
                onSelectTag={(tag) => handleSelectTag(tag)}
                onManageCountdowns={() => {
                  setSettingsTab('countdowns');
                  handleNavigateView('settings');
                }}
                onOpenLightbox={(url, title) => setLightbox({ url, title })}
              />
            )}

            {(activeView === 'live' || floatingPlayerEnabled) && (
              <LiveTvView
                activeStation={activeStation}
                activeEvent={activeEvent}
                customPlayEvents={liveCustomPlayEvents}
                onSelectStation={(station) => {
                  setActiveEvent(null);
                  setActiveStation(station);
                }}
                onSelectEvent={(ev) => setActiveEvent(ev)}
                isActiveTab={activeView === 'live'}
                floatingEnabled={floatingPlayerEnabled}
                onToggleFloating={() =>
                  setFloatingPlayerEnabled((prev) => !prev)
                }
                onGoToLive={() => handleNavigateView('live')}
                onGoToPlayEvent={() => {
                  pendingPlayEventScrollRef.current = true;
                  handleNavigateView('live');
                  setScrollToPlayEventNonce((n) => n + 1);
                }}
                scrollToPlayEventNonce={scrollToPlayEventNonce}
                onMobileSplitVisibilityChange={setIsMobileSplitVisible}
                onMobileSplitHeightChange={setMobileSplitHeight}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            )}
          </div>

          <div
            aria-hidden={isSidebarCollapsed}
            className={`hidden lg:block shrink-0 overflow-hidden transition-[width,margin,opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isSidebarCollapsed
                ? 'lg:w-0 lg:ml-0 opacity-0 translate-x-8 pointer-events-none invisible'
                : 'lg:w-[320px] xl:w-[416px] lg:ml-6 opacity-100 translate-x-0 visible'
            }`}
          >
            <div className="w-[320px] xl:w-[416px]">
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
                  handleNavigateView('settings');
                }}
                countdowns={countdowns}
                onOpenCountdown={openCountdownPage}
                tagCounts={tagCounts}
                activeTag={activeTag}
                onSelectTag={handleSelectTag}
                monthCounts={monthCounts}
                activeMonth={activeMonth}
                onSelectMonth={handleSelectMonth}
                onOpenInAppWeb={(url, title) => setInAppWebModal({ isOpen: true, url, title })}
              />
            </div>
          </div>
        </div>
      </main>
      </div>

      {/* Mobile-only reserved spacers so the content scrollbar stops cleanly above the split player & bottom nav */}
      {isMobileSplitVisible && mobileSplitHeight > 0 && (
        <div
          aria-hidden="true"
          className="sm:hidden shrink-0 pointer-events-none"
          style={{ height: `${mobileSplitHeight}px` }}
        />
      )}
      <div
        aria-hidden="true"
        className="sm:hidden h-14 shrink-0 pointer-events-none"
      />

      {/* Mobile Hamburger & Swipe-Right Slide-In Sidebar Drawer (always mounted on lg:hidden for smooth open/close slide) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden={!isMobileSidebarOpen && !isDraggingDrawer}
            style={
              isDraggingDrawer && backdropOpacity !== null
                ? {
                    backgroundColor: `rgba(0, 0, 0, ${0.65 * backdropOpacity})`,
                    transition: 'none',
                  }
                : undefined
            }
            className={`fixed inset-0 z-50 flex lg:hidden bg-black/65 transition-[opacity,visibility] duration-300 ease-out ${
              isMobileSidebarOpen || isDraggingDrawer
                ? 'opacity-100 visible pointer-events-auto'
                : 'opacity-0 invisible pointer-events-none'
            }`}
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Sidebar Menu"
              style={
                isDraggingDrawer && dragOffsetPx !== null
                  ? {
                      transform: `translate3d(${dragOffsetPx}px, 0, 0)`,
                      transition: 'none',
                    }
                  : undefined
              }
              className={`mobile-drawer-solid relative flex h-full w-[86vw] max-w-sm flex-col border-r border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-end px-4 pt-4 pb-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  aria-label="Close sidebar menu"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-20">
                <Sidebar
                  hideCountdowns={true}
                  isMobileDrawer={true}
                  activeView={activeView}
                  activeStation={activeStation}
                  isEventActive={Boolean(activeEvent)}
                  onSelectStation={(station) => {
                    setActiveEvent(null);
                    setActiveStation(station);
                    setIsMobileSidebarOpen(false);
                  }}
                  nowMs={nowMs}
                  design={design}
                  onUpdateDesign={handleUpdateDesign}
                  onOpenDesignSettings={() => {
                    setSettingsTab('design');
                    setActiveView('settings');
                    setIsMobileSidebarOpen(false);
                  }}
                  countdowns={countdowns}
                  tagCounts={tagCounts}
                  activeTag={activeTag}
                  onSelectTag={(tag) => {
                    handleSelectTag(tag);
                    setIsMobileSidebarOpen(false);
                  }}
                  monthCounts={monthCounts}
                  activeMonth={activeMonth}
                  onSelectMonth={(month) => {
                    handleSelectMonth(month);
                    setIsMobileSidebarOpen(false);
                  }}
                  onOpenInAppWeb={(url, title) => {
                    setInAppWebModal({ isOpen: true, url, title });
                    setIsMobileSidebarOpen(false);
                  }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-14 sm:h-16 grid-cols-4 border-t border-white/70 bg-white/90 backdrop-blur-xl lg:hidden dark:border-slate-800 dark:bg-slate-950/90"
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
              style={active ? { color: 'var(--theme-link)' } : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] sm:text-xs font-medium cursor-pointer ${
                active
                  ? 'font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
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

      <ImageLightboxModal
        isOpen={Boolean(lightbox)}
        imageUrl={lightbox?.url || ''}
        imageTitle={lightbox?.title}
        onClose={() => setLightbox(null)}
      />

      <InAppWebModal
        isOpen={inAppWebModal.isOpen}
        url={inAppWebModal.url}
        title={inAppWebModal.title}
        onClose={() => setInAppWebModal({ isOpen: false, url: '', title: '' })}
      />

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        userEmail={user?.email}
        userDisplayName={user?.displayName}
        isAdmin={isAdmin}
        ownRequest={ownAccessRequest}
        authError={authError}
        onGoogleSignIn={handleOwnerSignIn}
        onSignOut={handleOwnerSignOut}
        onSubmitRequest={handleSubmitAccessRequest}
        onWithdrawRequest={handleWithdrawAccessRequest}
      />

      <OfflineIndicator />
    </div>
  );
}
