import React from 'react';
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  FileText,
  Hash,
  MapPin,
  Settings,
} from 'lucide-react';
import type { EventCountdown, MediaAttachment } from '../types';
import {
  formatDateYmd,
  formatExpandedCountdownDate,
  getFontClass,
  sanitizeRichHtml,
} from '../lib/mediaUtils';
import { formatCountdownDisplay } from './Sidebar';

interface NextOnMdViewProps {
  countdowns: EventCountdown[];
  selectedCountdownId: string | null;
  nowMs: number;
  isAdmin: boolean;
  onSelectCountdown: (id: string) => void;
  onBackToTimeline: () => void;
  onSelectTag: (tag: string) => void;
  onManageCountdowns: () => void;
  onOpenLightbox: (url: string, title?: string) => void;
}

const FullMediaAttachment: React.FC<{
  attachment: MediaAttachment;
  onOpenLightbox: (url: string, title?: string) => void;
}> = ({ attachment, onOpenLightbox }) => {
  if (attachment.type === 'image' || attachment.type === 'gif') {
    return (
      <button
        type="button"
        onClick={() => onOpenLightbox(attachment.url, attachment.title)}
        className="block w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900/5 shadow-sm dark:border-slate-700/70 cursor-pointer"
      >
        <img
          src={attachment.url}
          alt={attachment.title || 'Next on MD visual'}
          referrerPolicy="no-referrer"
          className="max-h-[460px] w-full object-contain bg-slate-950/5 dark:bg-slate-950/40"
        />
        {(attachment.title || attachment.subtitle) && (
          <div className="px-4 py-2 text-left text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 border-t border-slate-200/70 dark:border-slate-700/60">
            {attachment.title && (
              <div className="font-semibold text-slate-900 dark:text-white">
                {attachment.title}
              </div>
            )}
            {attachment.subtitle && (
              <div className="text-[11px] opacity-80">{attachment.subtitle}</div>
            )}
          </div>
        )}
      </button>
    );
  }

  if (attachment.type === 'video') {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-sm dark:border-slate-700/70">
        <video
          controls
          preload="metadata"
          src={attachment.url}
          className="max-h-[460px] w-full bg-slate-950"
        />
        {attachment.title && (
          <div className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-900/90">
            {attachment.title}
          </div>
        )}
      </div>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/70">
        {attachment.title && (
          <div className="mb-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
            {attachment.title}
          </div>
        )}
        <audio controls preload="metadata" src={attachment.url} className="w-full" />
      </div>
    );
  }

  if (attachment.type === 'embed' && attachment.embedUrl) {
    const isShorts = (attachment.url || '').includes('/shorts/');
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-black shadow-sm dark:border-slate-700/70">
        <div
          className={
            isShorts
              ? 'mx-auto aspect-[9/16] max-h-[520px] w-full max-w-[310px]'
              : 'aspect-video w-full'
          }
        >
          <iframe
            src={attachment.embedUrl}
            title={attachment.title || 'Embedded media'}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-800 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-900"
    >
      <span className="inline-flex items-center gap-2.5 min-w-0">
        <FileText className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <span className="truncate font-medium">
          {attachment.title || attachment.url}
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
    </a>
  );
};

export const NextOnMdView: React.FC<NextOnMdViewProps> = ({
  countdowns,
  selectedCountdownId,
  nowMs,
  isAdmin,
  onSelectCountdown,
  onBackToTimeline,
  onSelectTag,
  onManageCountdowns,
  onOpenLightbox,
}) => {
  const activeCd =
    countdowns.find((c) => c.id === selectedCountdownId) || countdowns[0] || null;

  if (!activeCd) {
    return (
      <div className="space-y-4">
        <section className="aero-glass flex items-center justify-between gap-3 rounded-3xl px-5 py-3.5">
          <button
            type="button"
            onClick={onBackToTimeline}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Timeline</span>
          </button>
        </section>

        <section className="aero-glass rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-start">
            <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              NEXT ON MD
            </h2>
          </div>
          <div className="py-2 text-center space-y-3">
            <CalendarClock className="mx-auto h-8 w-8 text-sky-600 dark:text-sky-400" />
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              No upcoming events scheduled
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Countdown events added in Settings will appear here in full detail.
            </p>
          </div>
        </section>
      </div>
    );
  }

  const targetMs = new Date(activeCd.targetAt).getTime();
  const hasEnded = !Number.isNaN(targetMs) && nowMs >= targetMs;
  const safeHtml = activeCd.bodyHtml ? sanitizeRichHtml(activeCd.bodyHtml) : '';
  const safeMilestoneHtml = activeCd.milestoneBodyHtml
    ? sanitizeRichHtml(activeCd.milestoneBodyHtml)
    : '';
  const hasMilestoneContent =
    hasEnded &&
    (Boolean(safeMilestoneHtml) ||
      (activeCd.milestoneAttachments?.length ?? 0) > 0);

  const displayHtml = hasMilestoneContent ? safeMilestoneHtml : safeHtml;
  const displayFont = hasMilestoneContent
    ? activeCd.milestoneFont || 'sans'
    : activeCd.font || 'sans';
  const displayAttachments = hasMilestoneContent
    ? activeCd.milestoneAttachments || []
    : activeCd.attachments || [];

  const formattedTargetDate = formatExpandedCountdownDate(
    activeCd.targetAt,
    activeCd.timeZone
  );

  return (
    <div className="space-y-5">
      {/* Top Back Bar */}
      <section className="aero-glass flex items-center justify-between gap-3 rounded-3xl px-5 py-3.5">
        <button
          type="button"
          onClick={onBackToTimeline}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Timeline</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onManageCountdowns}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Edit</span>
          </button>
        )}
      </section>

      {/* Main Fully Formatted & Detailed Next on MD Card */}
      <article className="aero-glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-start">
          <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            NEXT ON MD
          </h2>
        </div>

        <header className="text-center space-y-2.5">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {activeCd.title}
          </h1>

          <div className="pt-2 font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--countdown-ink)] tabular-nums leading-tight">
            {formatCountdownDisplay(activeCd, nowMs)}
          </div>
        </header>

        {displayHtml && (
          <div
            className={`diary-prose border-t border-slate-200/75 pt-5 text-sm sm:text-base text-slate-800 dark:border-slate-700/60 dark:text-slate-100 text-center max-w-2xl mx-auto ${getFontClass(
              displayFont
            )}`}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        )}

        {displayAttachments.length > 0 && (
          <div className="space-y-3 border-t border-slate-200/75 pt-5 dark:border-slate-700/60">
            {displayAttachments.map((att) => (
              <FullMediaAttachment
                key={att.id}
                attachment={att}
                onOpenLightbox={onOpenLightbox}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col items-end gap-1.5 border-t border-slate-200/70 pt-4 text-right dark:border-slate-700/60">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formattedTargetDate ||
              formatDateYmd(activeCd.targetAt, activeCd.timeZone)}
          </span>
          {activeCd.location && (
            <span className="inline-flex items-center justify-end gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>{activeCd.location}</span>
            </span>
          )}
          {activeCd.tag && (
            <button
              type="button"
              onClick={() => onSelectTag(activeCd.tag || '')}
              className="mt-0.5 inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
            >
              <Hash className="h-3.5 w-3.5" />
              <span>{activeCd.tag}</span>
            </button>
          )}
        </div>
      </article>

      {/* Switcher if multiple countdowns exist */}
      {countdowns.length > 1 && (
        <section className="aero-glass rounded-3xl p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            All Upcoming Countdowns
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {countdowns.map((cd) => {
              const isCurrent = cd.id === activeCd.id;
              return (
                <button
                  key={cd.id}
                  type="button"
                  onClick={() => onSelectCountdown(cd.id)}
                  className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? 'aero-button-primary border-transparent text-white shadow-sm'
                      : 'border-slate-200/90 bg-white/80 text-slate-900 hover:bg-white dark:border-slate-700 dark:bg-slate-900/75 dark:text-white'
                  }`}
                >
                  <span
                    className={`font-display text-lg font-extrabold tabular-nums ${
                      isCurrent ? 'text-white' : 'text-[var(--countdown-ink)]'
                    }`}
                  >
                    {formatCountdownDisplay(cd, nowMs)}
                  </span>
                  <span
                    className={`mt-0.5 text-xs font-medium truncate w-full ${
                      isCurrent ? 'text-sky-100' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cd.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
