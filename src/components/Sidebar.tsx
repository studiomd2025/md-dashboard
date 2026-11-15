import React from 'react';
import {
  Archive,
  CalendarClock,
  ExternalLink,
  FileText,
  Hash,
  Palette,
} from 'lucide-react';
import type {
  DesignSettings,
  EventCountdown,
  MediaAttachment,
  ThemePresetId,
} from '../types';
import {
  formatMonthLabel,
  formatPostTimestamp,
  getFontClass,
  sanitizeRichHtml,
} from '../lib/mediaUtils';
import { PWAInstallButton } from './PWAInstallButton';
import { THEME_PRESETS } from './BackendConsoleView';

interface SidebarProps {
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
}

function formatCountdownDisplay(cd: EventCountdown, nowMs: number): string {
  const diff = new Date(cd.targetAt).getTime() - nowMs;
  const format = cd.displayFormat || 'full';

  if (format === 'date-only') {
    return formatPostTimestamp(cd.targetAt);
  }
  if (Number.isNaN(diff) || diff <= 0) {
    return 'Event arrived';
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (format === 'days-only') {
    const ceilDays = Math.ceil(diff / 86400000);
    return `${ceilDays} ${ceilDays === 1 ? 'day' : 'days'} left`;
  }
  if (format === 'compact') {
    const totalHours = Math.floor(totalSec / 3600);
    return `${String(totalHours).padStart(2, '0')}:${String(mins).padStart(
      2,
      '0'
    )}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(days).padStart(2, '0')}d : ${String(hours).padStart(
    2,
    '0'
  )}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`;
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
}) => {
  return (
    <aside className="space-y-5">
      {/* Theme Switcher & Mobile Install */}
      <section className="aero-glass rounded-3xl p-5 space-y-3.5">
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
          onChange={(e) =>
            onUpdateDesign({ theme: e.target.value as ThemePresetId })
          }
          className="w-full rounded-xl border border-slate-200/90 bg-white/85 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
        >
          {THEME_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <PWAInstallButton variant="full" />
      </section>

      {/* Next on MD — Only appears if at least one countdown is set up */}
      {countdowns.length > 0 && (
        <section className="aero-glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
            <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Next on MD
          </h2>

          <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
            {countdowns.map((cd) => {
              const safeHtml = cd.bodyHtml ? sanitizeRichHtml(cd.bodyHtml) : '';
              return (
                <div key={cd.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {cd.title}
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-sky-800 tabular-nums dark:text-sky-200">
                    {formatCountdownDisplay(cd, nowMs)}
                  </div>

                  {safeHtml && (
                    <div
                      className={`diary-prose mt-2 text-xs text-slate-700 dark:text-slate-200 ${getFontClass(
                        cd.font || 'sans'
                      )}`}
                      dangerouslySetInnerHTML={{ __html: safeHtml }}
                    />
                  )}

                  {cd.attachments && cd.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {cd.attachments.map((att) => (
                        <CountdownMediaPreview key={att.id} attachment={att} />
                      ))}
                    </div>
                  )}

                  {cd.tag && (
                    <button
                      type="button"
                      onClick={() => onSelectTag(cd.tag || null)}
                      className="mt-2 inline-block text-xs font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                    >
                      #{cd.tag}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Hashtags */}
      <section className="aero-glass rounded-3xl p-5">
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
      <section className="aero-glass rounded-3xl p-5">
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
