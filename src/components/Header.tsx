import React from 'react';
import type { ActiveView } from '../types';

interface HeaderProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenComposer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenComposer,
}) => {
  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'live', label: 'LIVE' },
    { id: 'settings', label: 'Settings' },
    { id: 'install', label: 'Install Mobile App' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onSelectView('timeline')}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          MY DIARIES DASHBOARD
        </button>

        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'font-semibold text-sky-700 dark:text-sky-300'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-sky-600 dark:bg-sky-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenComposer}
            className="aero-button-primary rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Post
          </button>
        </div>
      </div>
    </header>
  );
};
