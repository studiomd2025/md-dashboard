import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ExternalLink,
  FileText,
  LogIn,
  LogOut,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  UserPlus,
  X,
} from 'lucide-react';
import type { ActiveView } from '../types';
import type { AppNotificationItem } from '../lib/notifications';
import { formatDateYmd } from '../lib/mediaUtils';

interface HeaderProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenComposer: () => void;
  isAdmin: boolean;
  userEmail?: string | null;
  authReady: boolean;
  hasPendingRequest?: boolean;
  onSignIn: () => void;
  onOpenRegister?: () => void;
  onSignOut: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  notifications?: AppNotificationItem[];
  onNotificationClick?: (item: AppNotificationItem) => void;
  onMarkAllNotificationsRead?: () => void;
  onCheckNotificationsNow?: () => Promise<void> | void;
  canRequestWebPush?: boolean;
  onRequestWebPush?: () => Promise<void> | void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenComposer,
  isAdmin,
  userEmail,
  authReady,
  hasPendingRequest = false,
  onSignIn,
  onOpenRegister,
  onSignOut,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  notifications = [],
  onNotificationClick,
  onMarkAllNotificationsRead,
  onCheckNotificationsNow,
  canRequestWebPush = false,
  onRequestWebPush,
}) => {
  const logoSlotRef = useRef<HTMLDivElement>(null);
  const logoMeasureRef = useRef<HTMLSpanElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);
  const [useCompactLogo, setUseCompactLogo] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [checkingNotifs, setCheckingNotifs] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!notifOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpen]);

  useEffect(() => {
    const checkLogoFit = () => {
      if (typeof window === 'undefined') return;
      const isNarrowViewport = window.innerWidth < 768;
      const slot = logoSlotRef.current;
      const measure = logoMeasureRef.current;
      if (!isNarrowViewport || !slot || !measure) {
        setUseCompactLogo(false);
        return;
      }
      setUseCompactLogo(measure.scrollWidth + 12 > slot.clientWidth);
    };

    checkLogoFit();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(checkLogoFit).catch(() => {});
    }

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(checkLogoFit)
        : null;
    if (observer && logoSlotRef.current) {
      observer.observe(logoSlotRef.current);
      if (logoSlotRef.current.parentElement) {
        observer.observe(logoSlotRef.current.parentElement);
      }
    }
    window.addEventListener('resize', checkLogoFit);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', checkLogoFit);
    };
  }, [isAdmin, userEmail, authReady]);

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'live', label: 'LIVE' },
    { id: 'settings', label: 'Settings' },
    { id: 'install', label: 'Install Mobile App' },
  ];

  const handleManualCheck = async () => {
    if (!onCheckNotificationsNow || checkingNotifs) return;
    setCheckingNotifs(true);
    try {
      await onCheckNotificationsNow();
    } finally {
      setCheckingNotifs(false);
    }
  };

  return (
    <header className="sticky top-0 z-[38] shrink-0 border-b border-white/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3 sm:gap-6 lg:gap-14 px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-1 min-w-0 lg:flex-initial lg:shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label={isMobileSidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
            aria-expanded={isMobileSidebarOpen}
            className="inline-flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white/85 text-slate-700 shadow-sm hover:bg-white hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white cursor-pointer transition-colors"
          >
            {isMobileSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>

          <div ref={logoSlotRef} className="relative flex-1 min-w-0 lg:flex-initial">
            <span
              ref={logoMeasureRef}
              aria-hidden="true"
              className="pointer-events-none invisible fixed -top-[9999px] left-0 whitespace-nowrap font-display text-lg font-bold tracking-tight"
            >
              MY DIARIES DASHBOARD
            </span>
            <button
              type="button"
              onClick={() => onSelectView('timeline')}
              aria-label="MY DIARIES DASHBOARD"
              title="MY DIARIES DASHBOARD"
              className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap cursor-pointer text-left"
            >
              {useCompactLogo ? 'MDD' : 'MY DIARIES DASHBOARD'}
            </button>
          </div>
        </div>

        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex shrink-0 items-center gap-5 xl:gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                style={isActive ? { color: 'var(--theme-link)' } : undefined}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: 'var(--theme-link)' }}
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Bell */}
          <div ref={notifContainerRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : 'Notifications'
              }
              aria-expanded={notifOpen}
              title="Notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/85 text-slate-700 shadow-sm hover:bg-white hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white cursor-pointer transition-colors"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-2.5 dark:border-slate-800">
                  <span className="font-display text-xs font-bold text-slate-900 dark:text-white">
                    Notifications
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onCheckNotificationsNow && (
                      <button
                        type="button"
                        onClick={handleManualCheck}
                        disabled={checkingNotifs}
                        title="Check MD Memo & scheduled updates"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${checkingNotifs ? 'animate-spin' : ''}`}
                        />
                        <span>Refresh</span>
                      </button>
                    )}
                    {unreadCount > 0 && onMarkAllNotificationsRead && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>Read all</span>
                      </button>
                    )}
                  </div>
                </div>

                {canRequestWebPush && onRequestWebPush && (
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 bg-sky-50/70 px-3.5 py-2 text-[11px] dark:border-slate-800 dark:bg-sky-950/30">
                    <span className="text-slate-700 dark:text-slate-200">
                      Enable browser alerts for updates?
                    </span>
                    <button
                      type="button"
                      onClick={() => onRequestWebPush()}
                      className="rounded-lg bg-sky-600 px-2.5 py-1 font-semibold text-white hover:bg-sky-700 cursor-pointer shrink-0"
                    >
                      Allow
                    </button>
                  </div>
                )}

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      No alerts yet. Scheduled posts, countdown dates, and new MD Memo posts appear here.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onNotificationClick?.(item);
                          setNotifOpen(false);
                        }}
                        className={`flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer ${
                          item.read ? 'opacity-75' : 'bg-sky-50/40 dark:bg-sky-950/20'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400">
                          {item.kind === 'countdown' ? (
                            <CalendarClock className="h-4 w-4" />
                          ) : item.kind === 'blogger' ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.title}
                            </span>
                            {!item.read && (
                              <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {item.body}
                          </div>
                          {item.kind !== 'countdown' && (
                            <div className="mt-1 font-mono text-[10px] text-slate-400 tabular-nums">
                              {formatDateYmd(item.createdAt)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {authReady && isAdmin ? (
            <>
              <button
                type="button"
                onClick={onOpenComposer}
                className="aero-button-primary rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Post
              </button>
              <button
                type="button"
                onClick={onSignOut}
                title={`Signed in as ${userEmail || 'Owner'} — Sign out`}
                aria-label="Sign out"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/80 px-2.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : authReady && userEmail ? (
            <>
              {onOpenRegister && (
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-2.5 sm:px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{hasPendingRequest ? 'Pending Access' : 'Request Access'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onSignOut}
                title={`Signed in as ${userEmail} — Switch account`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 sm:px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Switch Account</span>
              </button>
            </>
          ) : (
            <>
              {onOpenRegister && (
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/85 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <UserPlus
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--theme-link)' }}
                  />
                  <span>Register</span>
                </button>
              )}
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/85 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn
                  className="h-3.5 w-3.5"
                  style={{ color: 'var(--theme-link)' }}
                />
                <span>Sign In</span>
              </button>
            </>
          )}

          {/* Minimize / Expand Sidebar Button (desktop lg+ only, right of Sign In) */}
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/85 text-slate-700 shadow-sm hover:bg-white hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white cursor-pointer shrink-0 transition-colors"
          >
            {isSidebarCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
