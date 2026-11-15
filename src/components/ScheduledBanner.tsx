import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import type { ActiveView, BannerSchedule } from '../types';
import { sanitizeRichHtml } from '../lib/mediaUtils';

export function resolveActiveBanner(banners: BannerSchedule[], now: Date): BannerSchedule | null {
  const slides = resolveBannerSlides(banners, now);
  return slides[0] || null;
}

export function resolveBannerSlides(banners: BannerSchedule[], now: Date): BannerSchedule[] {
  if (!banners.length) return [];
  const nowMs = now.getTime();
  const currentHour = now.getHours();

  const activeWindows = banners.filter((b) => {
    if (b.mode !== 'window') return false;
    const start = b.startAt ? new Date(b.startAt).getTime() : -Infinity;
    const end = b.endAt ? new Date(b.endAt).getTime() : Infinity;
    return nowMs >= start && nowMs <= end;
  });

  if (activeWindows.length > 0) {
    return [...activeWindows].sort((a, b) => b.priority - a.priority);
  }

  const activeDaily = banners.filter((b) => {
    if (b.mode !== 'daily-hours') return false;
    const startH = b.dailyStartHour ?? 0;
    const endH = b.dailyEndHour ?? 23;
    if (startH <= endH) {
      return currentHour >= startH && currentHour <= endH;
    }
    return currentHour >= startH || currentHour <= endH;
  });

  const slideshowBanners = banners.filter((b) => b.mode === 'slideshow');
  const combined = [...activeDaily, ...slideshowBanners];

  if (combined.length > 0) {
    // Deduplicate identical imageUrls if multiple presets share the exact same image & caption
    const seen = new Set<string>();
    return combined
      .sort((a, b) => b.priority - a.priority)
      .filter((item) => {
        const sig = `${item.imageUrl}|${item.subtitleHtml || item.subtitle}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
  }

  const fallback = banners.find((b) => b.mode === 'default') || banners[0];
  return fallback ? [fallback] : [];
}

interface ScheduledBannerProps {
  banners: BannerSchedule[];
  now: Date;
  onManageBanners: () => void;
  onNavigateView?: (view: ActiveView) => void;
}

export const ScheduledBanner: React.FC<ScheduledBannerProps> = ({
  banners,
  now,
  onManageBanners,
  onNavigateView,
}) => {
  const slides = useMemo(() => resolveBannerSlides(banners, now), [banners, now]);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (slideIdx >= slides.length) {
      setSlideIdx(0);
    }
  }, [slides.length, slideIdx]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const activeSlide = slides[slideIdx] || slides[0];
  const rawCaption = activeSlide?.subtitleHtml || activeSlide?.subtitle || '';
  const safeCaptionHtml = useMemo(() => sanitizeRichHtml(rawCaption), [rawCaption]);

  if (slides.length === 0 || !activeSlide) return null;

  const trimmedTitle = activeSlide.title?.trim() || '';
  const showCustomTitle =
    trimmedTitle.length > 0 &&
    trimmedTitle.toUpperCase() !== 'MY DIARIES DASHBOARD';

  const handleCaptionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (href === '#live' && onNavigateView) {
      e.preventDefault();
      onNavigateView('live');
    } else if (href === '#settings' && onNavigateView) {
      e.preventDefault();
      onNavigateView('settings');
    } else if (href === '#install' && onNavigateView) {
      e.preventDefault();
      onNavigateView('install');
    } else if (href === '#timeline' && onNavigateView) {
      e.preventDefault();
      onNavigateView('timeline');
    }
  };

  return (
    <section
      aria-label="Banner Slideshow"
      className="relative w-full overflow-hidden border-b border-white/60 bg-slate-900 dark:border-slate-800"
    >
      <div className="relative h-56 w-full sm:h-72 lg:h-80">
        {slides.map((slide, idx) => {
          const isCurrent = idx === slideIdx;
          return (
            <img
              key={slide.id}
              src={slide.imageUrl}
              alt={slide.title || 'Dashboard banner'}
              referrerPolicy="no-referrer"
              aria-hidden={!isCurrent}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
                isCurrent ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
          );
        })}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent"
        />

        {/* Slide Arrows when >1 slide */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)
              }
              aria-label="Previous banner slide"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-slate-950/60 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIdx((prev) => (prev + 1) % slides.length)}
              aria-label="Next banner slide"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/35 text-white backdrop-blur-md transition-colors hover:bg-slate-950/60 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[1380px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8 sm:py-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sky-100/90">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {activeSlide.mode === 'daily-hours'
                  ? `Daily Schedule (${String(activeSlide.dailyStartHour ?? 0).padStart(
                      2,
                      '0'
                    )}:00 – ${String(activeSlide.dailyEndHour ?? 23).padStart(2, '0')}:59)`
                  : activeSlide.mode === 'window'
                  ? 'Scheduled Banner Window'
                  : activeSlide.mode === 'slideshow'
                  ? `Banner Slideshow (${slideIdx + 1}/${slides.length})`
                  : 'Active Banner'}
              </span>
            </div>

            {showCustomTitle && (
              <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl [text-wrap:balance]">
                {trimmedTitle}
              </h1>
            )}

            {safeCaptionHtml && (
              <div
                onClick={handleCaptionClick}
                className="mt-1.5 text-sm text-slate-100/95 [&_a]:font-semibold [&_a]:text-sky-200 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-white"
                dangerouslySetInnerHTML={{ __html: safeCaptionHtml }}
              />
            )}
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {slides.length > 1 && (
              <div className="flex items-center gap-1.5">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlideIdx(idx)}
                    aria-label={`View banner slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === slideIdx ? 'w-6 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={onManageBanners}
              className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/30 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Change Banner
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
