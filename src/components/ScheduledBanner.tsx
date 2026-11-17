import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActiveView, BannerSchedule } from '../types';
import { formatHourMinute12h, sanitizeRichHtml, stripHtml } from '../lib/mediaUtils';
import { getHourInTimeZone } from '../lib/timeZones';

export function resolveActiveBanner(banners: BannerSchedule[], now: Date): BannerSchedule | null {
  const slides = resolveBannerSlides(banners, now);
  return slides[0] || null;
}

export function resolveBannerSlides(banners: BannerSchedule[], now: Date): BannerSchedule[] {
  const validBanners = banners.filter((b) => Boolean(b.imageUrl && b.imageUrl.trim()));
  if (!validBanners.length) return [];
  const nowMs = now.getTime();

  const activeWindows = validBanners.filter((b) => {
    if (b.mode !== 'window') return false;
    const start = b.startAt ? new Date(b.startAt).getTime() : -Infinity;
    const end = b.endAt ? new Date(b.endAt).getTime() : Infinity;
    return nowMs >= start && nowMs <= end;
  });

  if (activeWindows.length > 0) {
    return [...activeWindows].sort((a, b) => b.priority - a.priority);
  }

  const activeDaily = validBanners.filter((b) => {
    if (b.mode !== 'daily-hours') return false;
    const currentHour = getHourInTimeZone(now, b.timeZone);
    const startH = b.dailyStartHour ?? 0;
    const endH = b.dailyEndHour ?? 23;
    if (startH <= endH) {
      return currentHour >= startH && currentHour <= endH;
    }
    return currentHour >= startH || currentHour <= endH;
  });

  const slideshowBanners = validBanners.filter((b) => b.mode === 'slideshow');
  const defaultBanners = [...validBanners.filter((b) => b.mode === 'default')].sort(
    (a, b) => b.priority - a.priority
  );
  const topDefault = defaultBanners[0];
  const topSlideshowPriority = slideshowBanners.reduce(
    (max, b) => Math.max(max, b.priority),
    -Infinity
  );
  const topDailyPriority = activeDaily.reduce(
    (max, b) => Math.max(max, b.priority),
    -Infinity
  );

  if (
    topDefault &&
    topDefault.priority > topSlideshowPriority &&
    topDefault.priority > topDailyPriority
  ) {
    return [topDefault];
  }

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

  const fallback = topDefault || validBanners[0];
  return fallback ? [fallback] : [];
}

interface ScheduledBannerProps {
  banners: BannerSchedule[];
  now: Date;
  onNavigateView?: (view: ActiveView) => void;
}

export const ScheduledBanner: React.FC<ScheduledBannerProps> = ({
  banners,
  now,
  onNavigateView,
}) => {
  const slides = useMemo(() => resolveBannerSlides(banners, now), [banners, now]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [exact1920x640Map, setExact1920x640Map] = useState<Record<string, boolean>>({});

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
  const hasCaption = Boolean(
    showCustomTitle || stripHtml(safeCaptionHtml).trim().length > 0
  );

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
      <div className="relative h-36 w-full sm:h-[216px] lg:h-[300px] xl:h-[330px]">
        {slides.map((slide, idx) => {
          const isCurrent = idx === slideIdx;
          const isExact1920x640 = Boolean(exact1920x640Map[slide.id]);
          return (
            <img
              key={slide.id}
              src={slide.imageUrl}
              alt={slide.title || 'Dashboard banner'}
              referrerPolicy="no-referrer"
              aria-hidden={!isCurrent}
              onLoad={(e) => {
                const isExact =
                  e.currentTarget.naturalWidth === 1920 &&
                  e.currentTarget.naturalHeight === 640;
                setExact1920x640Map((prev) =>
                  prev[slide.id] === isExact ? prev : { ...prev, [slide.id]: isExact }
                );
              }}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
                isExact1920x640 ? 'object-[50%_15%]' : 'object-center'
              } ${isCurrent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
          );
        })}

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

        {(hasCaption || slides.length > 1) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[1380px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8 sm:py-6">
            <div className="pointer-events-auto max-w-2xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)]">
              {hasCaption && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sky-100/90">
                  <span>
                    {activeSlide.mode === 'daily-hours'
                      ? `Daily Schedule (${formatHourMinute12h(
                          activeSlide.dailyStartHour ?? 0,
                          0
                        )} – ${formatHourMinute12h(activeSlide.dailyEndHour ?? 23, 59)})`
                      : activeSlide.mode === 'window'
                      ? 'Scheduled Banner Window'
                      : activeSlide.mode === 'slideshow'
                      ? 'Banner Slideshow'
                      : 'Active Banner'}
                  </span>
                </div>
              )}

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

            {slides.length > 1 && (
              <div className="pointer-events-auto flex items-center gap-1.5 self-start sm:self-auto">
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
          </div>
        )}
      </div>
    </section>
  );
};
