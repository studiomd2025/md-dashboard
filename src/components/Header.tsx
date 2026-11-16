import React, { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, Menu, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import type { ActiveView } from '../types';

interface HeaderProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenComposer: () => void;
  isAdmin: boolean;
  userEmail?: string | null;
  authReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenComposer,
  isAdmin,
  userEmail,
  authReady,
  onSignIn,
  onSignOut,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}) => {
  const logoSlotRef = useRef<HTMLDivElement>(null);
  const logoMeasureRef = useRef<HTMLSpanElement>(null);
  const [useCompactLogo, setUseCompactLogo] = useState(false);

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

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75">
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
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Switch Account</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/85 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn
                className="h-3.5 w-3.5"
                style={{ color: 'var(--theme-link)' }}
              />
              <span>Sign In</span>
            </button>
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

