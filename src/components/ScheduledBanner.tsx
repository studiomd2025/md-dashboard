import React from 'react';
import { CalendarClock, Image as ImageIcon } from 'lucide-react';
import type { BannerSchedule } from '../types';

export function resolveActiveBanner(banners: BannerSchedule[], now: Date): BannerSchedule | null {
  if (!banners.length) return null;
  const nowMs = now.getTime();
  const currentHour = now.getHours();

  const matching = banners.filter((b) => {
    if (b.mode === 'window') {
      const start = b.startAt ? new Date(b.startAt).getTime() : -Infinity;
      const end = b.endAt ? new Date(b.endAt).getTime() : Infinity;
      return nowMs >= start && nowMs <= end;
    }
    if (b.mode === 'daily-hours') {
      const startH = b.dailyStartHour ?? 0;
      const endH = b.dailyEndHour ?? 23;
      if (startH <= endH) {
        return currentHour >= startH && currentHour <= endH;
      }
      return currentHour >= startH || currentHour <= endH;
    }
    return false;
  });

  if (matching.length > 0) {
    return [...matching].sort((a, b) => b.priority - a.priority)[0];
  }

  return banners.find((b) => b.mode === 'default') || banners[0];
}

interface ScheduledBannerProps {
  banner: BannerSchedule | null;
  onManageBanners: () => void;
}

export const ScheduledBanner: React.FC<ScheduledBannerProps> = ({
  banner,
  onManageBanners,
}) => {
  if (!banner) return null;

  const trimmedTitle = banner.title?.trim() || '';
  const showCustomTitle =
    trimmedTitle.length > 0 &&
    trimmedTitle.toUpperCase() !== 'MY DIARIES DASHBOARD';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/80 shadow-[0_18px_48px_-20px_rgba(14,116,144,0.35)] dark:border-slate-700/60">
      <div className="relative h-52 w-full sm:h-64 lg:h-72 bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500">
        <img
          src={banner.imageUrl}
          alt={showCustomTitle ? trimmedTitle : 'Scheduled dashboard hero banner'}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-opacity duration-500"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sky-100/90">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {banner.mode === 'daily-hours'
                  ? `Daily Schedule (${String(banner.dailyStartHour ?? 0).padStart(2, '0')}:00 – ${String(banner.dailyEndHour ?? 23).padStart(2, '0')}:59)`
                  : banner.mode === 'window'
                  ? 'Scheduled Banner Window'
                  : 'Active Hero Banner'}
              </span>
            </div>
            {showCustomTitle && (
              <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl [text-wrap:balance]">
                {trimmedTitle}
              </h1>
            )}
            {banner.subtitle && (
              <p className="mt-1 text-sm text-slate-100/90 line-clamp-2">
                {banner.subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onManageBanners}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/35 bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/30 sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Change Banner
          </button>
        </div>
      </div>
    </section>
  );
};
