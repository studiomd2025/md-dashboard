import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  CalendarClock,
  ExternalLink,
  FileText,
  Hash,
  Palette,
  Tv,
} from 'lucide-react';
import type {
  ActiveView,
  DesignSettings,
  EventCountdown,
  MediaAttachment,
  ThemeId,
} from '../types';
import {
  formatDateYmd,
  formatMonthLabel,
  getFontClass,
  sanitizeRichHtml,
} from '../lib/mediaUtils';
import { getWallClockParts } from '../lib/timeZones';
import { PWAInstallButton } from './PWAInstallButton';
import { THEME_PRESETS } from './BackendConsoleView';
import { STATIONS, type BroadcastChannel } from './LiveTvView';
import {
  getCustomOnlyThemes,
  getThemeIsDark,
  mixHex,
  resolvePreloadedThemePreset,
  sampleBackdropTopIsDark,
} from '../lib/themeColors';

interface SidebarProps {
  activeView: ActiveView;
  activeStation: BroadcastChannel;
  isEventActive?: boolean;
  onSelectStation: (station: BroadcastChannel) => void;
  nowMs: number;
  design: DesignSettings;
  onUpdateDesign: (next: Partial<DesignSettings>) => Promise<void>;
  onOpenDesignSettings: () => void;
  countdowns: EventCountdown[];
  tagCounts: { tag: string; count: number }[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
  monthCounts: { month: string; count: number }[];
  activeMonth: string | null;
  onSelectMonth: (month: string | null) => void;
  hideCountdowns?: boolean;
  isMobileDrawer?: boolean;
  onOpenCountdown?: (countdownId: string) => void;
}

const MD_LINKS = [
  { label: 'MD Memo', url: 'https://officialmdmemo.blogspot.com' },
  { label: 'Magazine', url: 'http://mydiariesmagazine.wordpress.com' },
  {
    label: 'Time Capsule',
    url: 'https://mydiaries2023.notion.site/MD-Notion-1be78586424c40e9845793644856dc96',
  },
];

export function formatCountdownDisplay(cd: EventCountdown, nowMs: number): string {
  const targetDate = new Date(cd.targetAt);
  const targetMs = targetDate.getTime();
  const diff = targetMs - nowMs;
  const format = cd.displayFormat || 'full';

  if (format === 'date-only') {
    return formatDateYmd(cd.targetAt, cd.timeZone);
  }
  if (Number.isNaN(targetMs)) {
    return 'Event arrived';
  }

  // Days Remaining (D-#) is the only countdown format that continues counting on & after the event date (D-Day, D+1, D+2...)
  if (format === 'd-day') {
    const targetParts = getWallClockParts(targetDate, cd.timeZone);
    const nowParts = getWallClockParts(nowMs, cd.timeZone);
    const targetDayUtc = Date.UTC(
      targetParts.year,
      targetParts.month - 1,
      targetParts.day
    );
    const nowDayUtc = Date.UTC(
      nowParts.year,
      nowParts.month - 1,
      nowParts.day
    );
    const dayDiff = Math.round((nowDayUtc - targetDayUtc) / 86400000);
    if (dayDiff === 0) {
      return 'D-Day';
    }
    if (dayDiff > 0) {
      return `D+${dayDiff}`;
    }
    return `D-${Math.abs(dayDiff)}`;
  }

  if (diff <= 0) {
    return 'Event arrived';
  }

  if (format === 'days-only') {
    const totalDays = diff / 86400000;
    if (totalDays >= 365) {
      const years = Math.max(1, Math.round(totalDays / 365.25));
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (totalDays >= 30) {
      const months = Math.max(1, Math.round(totalDays / 30.436875));
      if (months >= 12) {
        return '1 year';
      }
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    if (totalDays >= 7) {
      const weeks = Math.max(1, Math.round(totalDays / 7));
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    }
    if (totalDays >= 1) {
      const roundedDays = Math.max(1, Math.round(totalDays));
      if (roundedDays >= 7) {
        return '1 week';
      }
      return `${roundedDays} ${roundedDays === 1 ? 'day' : 'days'}`;
    }
    const totalHours = diff / 3600000;
    if (totalHours >= 1) {
      const roundedHours = Math.max(1, Math.round(totalHours));
      if (roundedHours >= 24) {
        return '1 day';
      }
      return `${roundedHours} ${roundedHours === 1 ? 'hour' : 'hours'}`;
    }
    const totalMins = diff / 60000;
    if (totalMins >= 1) {
      const roundedMins = Math.max(1, Math.round(totalMins));
      if (roundedMins >= 60) {
        return '1 hour';
      }
      return `${roundedMins} ${roundedMins === 1 ? 'min' : 'mins'}`;
    }
    const roundedSecs = Math.max(1, Math.round(diff / 1000));
    if (roundedSecs >= 60) {
      return '1 min';
    }
    return `${roundedSecs} ${roundedSecs === 1 ? 'sec' : 'secs'}`;
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (format === 'compact') {
    const totalHours = Math.floor(totalSec / 3600);
    return `${String(totalHours).padStart(2, '0')}:${String(mins).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(days).padStart(2, '0')} : ${String(hours).padStart(
    2,
    '0'
  )} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`;
}

const CountdownMediaPreview: React.FC<{ attachment: MediaAttachment }> = ({
  attachment,
}) => {
  if (attachment.type === 'image' || attachment.type === 'gif') {
    return (
      <img
        src={attachment.url}
        alt={attachment.title || 'Next on MD media'}
        referrerPolicy="no-referrer"
        className="mt-2 max-h-40 w-full rounded-xl object-cover border border-slate-200/70 dark:border-slate-700/60"
      />
    );
  }
  if (attachment.type === 'video') {
    return (
      <video
        controls
        preload="metadata"
        src={attachment.url}
        className="mt-2 max-h-40 w-full rounded-xl bg-slate-950"
      />
    );
  }
  if (attachment.type === 'audio') {
    return (
      <audio
        controls
        preload="metadata"
        src={attachment.url}
        className="mt-2 w-full"
      />
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
    >
      <span className="inline-flex items-center gap-1.5 truncate">
        <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
        <span className="truncate">{attachment.title || attachment.url}</span>
      </span>
      <ExternalLink className="h-3 w-3 shrink-0 text-sky-600" />
    </a>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  activeStation,
  isEventActive = false,
  onSelectStation,
  nowMs,
  design,
  onUpdateDesign,
  onOpenDesignSettings,
  countdowns,
  tagCounts,
  activeTag,
  onSelectTag,
  monthCounts,
  activeMonth,
  onSelectMonth,
  hideCountdowns = false,
  isMobileDrawer = false,
  onOpenCountdown,
}) => {
  const customThemes = design.customThemes || [];

  const handleThemeChange = (nextThemeId: ThemeId) => {
    const customMatch = customThemes.find((t) => t.id === nextThemeId);
    if (customMatch) {
      onUpdateDesign({
        theme: customMatch.id,
        surfaceStyle: customMatch.surfaceStyle,
      });
    } else {
      onUpdateDesign({ theme: nextThemeId });
    }
  };

  const sectionClass = isMobileDrawer
    ? 'py-5 first:pt-1 last:pb-2'
    : 'aero-glass rounded-3xl p-5';

  return (
    <aside
      className={
        isMobileDrawer
          ? 'divide-y divide-slate-200/80 dark:divide-slate-800/80'
          : 'space-y-5'
      }
    >
      {/* Desktop Remote Control — sits above Theme on LIVE view */}
      {activeView === 'live' && (
        <section className="aero-glass hidden rounded-3xl p-5 lg:block">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <Tv className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Remote Control
          </h2>

          <div
            role="tablist"
            aria-label="Broadcast Channels"
            className="mt-3 grid grid-cols-2 gap-2"
          >
            {STATIONS.map((station) => {
              const isSelected = !isEventActive && activeStation.callsign === station.callsign;
              return (
                <button
                  key={station.callsign}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectStation(station)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'aero-button-primary border-transparent text-white'
                      : 'border-slate-200/90 bg-white/80 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100'
                  }`}
                >
                  <div
                    className={`font-mono text-[10px] font-semibold uppercase tracking-wider tabular-nums ${
                      isSelected ? 'text-sky-100' : 'text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    CH 0{station.number}
                  </div>
                  <div className="mt-0.5 truncate font-display text-xs font-bold">
                    {station.callsign}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Theme Switcher & Mobile Install */}
      <section className={`${sectionClass} space-y-3.5`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <Palette className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Theme
          </h2>
          <button
            type="button"
            onClick={onOpenDesignSettings}
            className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
          >
            Customize
          </button>
        </div>

        <label htmlFor="sidebar-theme-select" className="sr-only">
          Select Theme Preset
        </label>
        <select
          id="sidebar-theme-select"
          value={design.theme}
          onChange={(e) => handleThemeChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200/90 bg-white/85 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
        >
          {[
            ...THEME_PRESETS.map((p) => {
              const isDefault = (p.id as string) === 'default' || (p.id as string) === 'system-default' || /^system default$/i.test(p.label);
              const resolved = isDefault ? null : resolvePreloadedThemePreset(p.id, customThemes);
              return {
                id: p.id,
                label: resolved?.name || p.label,
                isDefault,
              };
            }),
            ...getCustomOnlyThemes(customThemes).map((ct) => ({
              id: ct.id,
              label: ct.name,
              isDefault: false,
            })),
          ]
            .sort((a, b) => {
              if (a.isDefault && !b.isDefault) return -1;
              if (!a.isDefault && b.isDefault) return 1;
              return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
            })
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
        </select>

        <PWAInstallButton variant="full" />
      </section>

      {/* Next on MD — Only appears if at least one countdown is set up and not hidden */}
      {!hideCountdowns && countdowns.length > 0 && (
        <section className="aero-glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Next on MD
          </h2>

          <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
            {countdowns.map((cd) => {
              const targetMs = new Date(cd.targetAt).getTime();
              const hasEnded = !Number.isNaN(targetMs) && nowMs >= targetMs;
              const safeHtml = cd.bodyHtml ? sanitizeRichHtml(cd.bodyHtml) : '';
              const safeMilestoneHtml = cd.milestoneBodyHtml
                ? sanitizeRichHtml(cd.milestoneBodyHtml)
                : '';
              const hasMilestoneContent =
                hasEnded &&
                (Boolean(safeMilestoneHtml) ||
                  (cd.milestoneAttachments?.length ?? 0) > 0);

              return (
                <div key={cd.id} className="py-4 first:pt-0 last:pb-0 text-center">
                  {onOpenCountdown ? (
                    <button
                      type="button"
                      onClick={() => onOpenCountdown(cd.id)}
                      className="text-sm font-semibold text-slate-900 hover:text-sky-700 dark:text-white dark:hover:text-sky-300 cursor-pointer transition-colors"
                    >
                      {cd.title}
                    </button>
                  ) : (
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {cd.title}
                    </div>
                  )}
                  <div className="mt-1.5 font-display text-3xl sm:text-4xl leading-tight font-extrabold tracking-tight text-[var(--countdown-ink)] tabular-nums">
                    {formatCountdownDisplay(cd, nowMs)}
                  </div>

                  {hasMilestoneContent ? (
                    <div className="mt-2.5 space-y-2 border-t border-slate-200/75 pt-2.5 dark:border-slate-700/60 text-center">
                      {safeMilestoneHtml && (
                        <div
                          className={`diary-prose text-xs text-slate-700 dark:text-slate-200 ${getFontClass(
                            cd.milestoneFont || 'sans'
                          )}`}
                          dangerouslySetInnerHTML={{ __html: safeMilestoneHtml }}
                        />
                      )}
                      {cd.milestoneAttachments &&
                        cd.milestoneAttachments.length > 0 && (
                          <div className="space-y-2 flex flex-col items-center">
                            {cd.milestoneAttachments.map((att) => (
                              <CountdownMediaPreview
                                key={att.id}
                                attachment={att}
                              />
                            ))}
                          </div>
                        )}
                    </div>
                  ) : (
                    <>
                      {safeHtml && (
                        <div
                          className={`diary-prose mt-2 text-xs text-slate-700 dark:text-slate-200 ${getFontClass(
                            cd.font || 'sans'
                          )}`}
                          dangerouslySetInnerHTML={{ __html: safeHtml }}
                        />
                      )}

                      {cd.attachments && cd.attachments.length > 0 && (
                        <div className="mt-2 space-y-2 flex flex-col items-center">
                          {cd.attachments.map((att) => (
                            <CountdownMediaPreview
                              key={att.id}
                              attachment={att}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {cd.tag && (
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onSelectTag(cd.tag || null)}
                        className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                      >
                        #{cd.tag}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick External Links right below Next on MD (no header, button style) */}
      <section className={sectionClass}>
        <div className={isMobileDrawer ? 'space-y-1' : 'space-y-2'}>
          {MD_LINKS.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isMobileDrawer
                  ? 'flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100/80 hover:text-sky-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:hover:text-sky-300'
                  : 'flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/85 px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-white hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:text-sky-300'
              }
            >
              <span>{item.label}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
            </a>
          ))}
        </div>
      </section>

      {/* Hashtags */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <Hash className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Hashtags
          </h2>
          {activeTag && (
            <button
              type="button"
              onClick={() => onSelectTag(null)}
              className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {tagCounts.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Add #EventHashtags to your posts to build your hashtag index.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {tagCounts.map(({ tag, count }) => {
              const isSelected = activeTag?.toLowerCase() === tag.toLowerCase();
              const sizeClass =
                count >= 3
                  ? 'text-sm font-bold'
                  : count === 2
                  ? 'text-[13px] font-semibold'
                  : 'text-xs font-medium';
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(isSelected ? null : tag)}
                  className={`inline-flex items-baseline gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${sizeClass} ${
                    isSelected
                      ? 'text-sky-700 underline underline-offset-4 dark:text-sky-300'
                      : 'text-slate-700 hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300'
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Archive by Month */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <Archive className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Archive
          </h2>
          {activeMonth && (
            <button
              type="button"
              onClick={() => onSelectMonth(null)}
              className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
            >
              All Months
            </button>
          )}
        </div>

        <div className="mt-3 space-y-1">
          {monthCounts.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No archived entries yet.
            </p>
          ) : (
            monthCounts.map(({ month, count }) => {
              const isSelected = activeMonth === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => onSelectMonth(isSelected ? null : month)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 font-semibold text-white'
                      : 'text-slate-700 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span>{formatMonthLabel(month)}</span>
                  <span className="font-mono tabular-nums opacity-80">{count}</span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </aside>
  );
};

interface MobileCountdownStripProps {
  countdowns: EventCountdown[];
  nowMs: number;
  design: DesignSettings;
  onOpenCountdown: (countdownId: string) => void;
}

const TabletMarqueeTitle: React.FC<{
  title: string;
}> = ({ title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      setIsOverflowing(measure.scrollWidth > container.clientWidth + 1);
    };

    checkOverflow();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(checkOverflow).catch(() => {});
    }

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', checkOverflow);
      return () => window.removeEventListener('resize', checkOverflow);
    }

    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      observer.observe(containerRef.current);
      if (containerRef.current.parentElement) {
        observer.observe(containerRef.current.parentElement);
      }
    }
    window.addEventListener('resize', checkOverflow);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [title]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 overflow-hidden py-1 font-display text-[1.75rem] font-light tracking-tight leading-normal"
    >
      {/* Hidden measurement span at natural single-line width */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute whitespace-nowrap"
      >
        {title}
      </span>

      {isOverflowing ? (
        <div className="md-marquee-track whitespace-nowrap">
          <span className="pr-12">{title}</span>
          <span aria-hidden="true" className="pr-12">
            {title}
          </span>
        </div>
      ) : (
        <span className="block whitespace-nowrap text-center">{title}</span>
      )}
    </div>
  );
};

const MobileMarqueeTitle: React.FC<{
  title: string;
}> = ({ title }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      const measure = measureRef.current;
      if (!container || !measure) return;
      setIsOverflowing(measure.scrollWidth > container.clientWidth + 1);
    };

    checkOverflow();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(checkOverflow).catch(() => {});
    }

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', checkOverflow);
      return () => window.removeEventListener('resize', checkOverflow);
    }

    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      observer.observe(containerRef.current);
      if (containerRef.current.parentElement) {
        observer.observe(containerRef.current.parentElement);
      }
    }
    window.addEventListener('resize', checkOverflow);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [title]);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0 overflow-hidden py-0.5 text-2xl font-light tracking-wide leading-normal"
    >
      <span
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute whitespace-nowrap text-2xl"
      >
        {title}
      </span>

      {isOverflowing ? (
        <div className="md-marquee-track whitespace-nowrap">
          <span className="pr-12">{title}</span>
          <span aria-hidden="true" className="pr-12">
            {title}
          </span>
        </div>
      ) : (
        <span className="block whitespace-nowrap text-center">{title}</span>
      )}
    </div>
  );
};

export const MobileCountdownStrip: React.FC<MobileCountdownStripProps> = ({
  countdowns,
  nowMs,
  design,
  onOpenCountdown,
}) => {
  const customMatch = (design.customThemes || []).find((t) => t.id === design.theme);
  const customBackdrop =
    design.customBackdropUrl || customMatch?.backdropImageUrl || '';
  const baseThemeIsDark = getThemeIsDark(design);
  const [sampledBackdropDark, setSampledBackdropDark] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    if (!customBackdrop) {
      setSampledBackdropDark(null);
      return;
    }
    sampleBackdropTopIsDark(customBackdrop, baseThemeIsDark).then((res) => {
      if (!cancelled) setSampledBackdropDark(res);
    });
    return () => {
      cancelled = true;
    };
  }, [customBackdrop, baseThemeIsDark]);

  if (countdowns.length === 0) return null;

  // If a custom backdrop image overrides brightness vs the active theme, adapt ink color dynamically
  // while preserving theme tint; otherwise use the theme's own dark/light --countdown-ink variable.
  let resolvedColor: string = 'var(--countdown-ink)';
  if (sampledBackdropDark !== null && sampledBackdropDark !== baseThemeIsDark) {
    if (customMatch) {
      resolvedColor = sampledBackdropDark
        ? mixHex(customMatch.accentStart, '#ffffff', 0.85)
        : mixHex(customMatch.accentEnd, '#0f172a', 0.78);
    } else {
      resolvedColor = sampledBackdropDark ? '#f8fafc' : '#0f172a';
    }
  }

  return (
    <div className="mx-auto max-w-[1380px] px-3 pt-5 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:hidden">
      <div className="flex flex-col items-center gap-3 text-center">
        {countdowns.map((cd) => (
          <button
            key={cd.id}
            type="button"
            onClick={() => onOpenCountdown(cd.id)}
            aria-label={`Open Next on MD details for ${cd.title}`}
            style={{ color: resolvedColor }}
            className="w-full bg-transparent py-1 cursor-pointer transition-opacity active:opacity-75"
          >
            {/* Phone (< 640px): Almost full phone width centered clock + 1x larger lighter caption below (with marquee if long) */}
            <div className="flex w-full flex-col items-center justify-center text-center sm:hidden">
              <span className="w-full whitespace-nowrap font-display text-[clamp(1.85rem,10.8vw,3.5rem)] font-extrabold tracking-tight tabular-nums leading-none">
                {formatCountdownDisplay(cd, nowMs)}
              </span>
              <MobileMarqueeTitle title={cd.title} />
            </div>

            {/* Tablet (640px – 1023px): Full-width single horizontal line (3.5rem clock + similar-size lighter title, auto-marquee if title overflows) */}
            <div className="hidden sm:flex w-full min-w-0 items-center justify-between gap-5">
              <span className="shrink-0 whitespace-nowrap font-display text-[3.5rem] font-extrabold tracking-tight tabular-nums leading-none">
                {formatCountdownDisplay(cd, nowMs)}
              </span>
              <TabletMarqueeTitle title={cd.title} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
