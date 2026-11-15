import React, { useMemo, useState } from 'react';
import { ExternalLink, MessageSquare, Tv } from 'lucide-react';

interface TwitchStation {
  number: number;
  label: string;
  channel: string;
  url: string;
}

const STATIONS: TwitchStation[] = [
  {
    number: 1,
    label: 'Channel 1',
    channel: 'MDTV_ch1',
    url: 'https://www.twitch.tv/MDTV_ch1',
  },
  {
    number: 2,
    label: 'Channel 2',
    channel: 'MDMT_ch2',
    url: 'https://www.twitch.tv/MDMT_ch2',
  },
  {
    number: 3,
    label: 'Channel 3',
    channel: 'MDRS_ch3',
    url: 'https://www.twitch.tv/MDRS_ch3',
  },
];

export const LiveTvView: React.FC = () => {
  const [activeStation, setActiveStation] = useState<TwitchStation>(STATIONS[0]);
  const [showChat, setShowChat] = useState(false);

  const parentHost = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    return window.location.hostname || 'localhost';
  }, []);

  const playerSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(
    activeStation.channel
  )}&parent=${encodeURIComponent(parentHost)}&muted=false&autoplay=true`;

  const chatSrc = `https://www.twitch.tv/embed/${encodeURIComponent(
    activeStation.channel
  )}/chat?parent=${encodeURIComponent(parentHost)}`;

  return (
    <div className="space-y-5">
      {/* TV Station Selector Bar */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-900 dark:text-white">
              <Tv className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              LIVE Broadcast Tuner
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Switch between your three Twitch channels like TV stations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChat((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showChat
                  ? 'border-sky-600 bg-sky-600 text-white'
                  : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {showChat ? 'Hide Stream Chat' : 'Show Stream Chat'}
            </button>
            <a
              href={activeStation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap shrink-0"
            >
              <span>Open on Twitch</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Station Buttons */}
        <div
          role="tablist"
          aria-label="Twitch TV Channels"
          className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
        >
          {STATIONS.map((station) => {
            const isSelected = activeStation.channel === station.channel;
            return (
              <button
                key={station.channel}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveStation(station)}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'aero-button-primary border-transparent text-white'
                    : 'border-slate-200/90 bg-white/75 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100'
                }`}
              >
                <div className="min-w-0">
                  <div
                    className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
                      isSelected ? 'text-sky-100' : 'text-sky-700 dark:text-sky-300'
                    }`}
                  >
                    CH 0{station.number} · {station.label}
                  </div>
                  <div className="mt-0.5 truncate font-display text-sm font-bold">
                    {station.channel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Broadcast Monitor Frame */}
      <section className="aero-glass overflow-hidden rounded-3xl p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-mono font-semibold tabular-nums">
            TUNED TO CH 0{activeStation.number} — {activeStation.channel}
          </span>
        </div>

        <div
          className={`grid grid-cols-1 gap-3 ${
            showChat ? 'lg:grid-cols-12' : ''
          }`}
        >
          <div
            className={`${
              showChat ? 'lg:col-span-8' : ''
            } overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 aspect-video dark:border-slate-800`}
          >
            <iframe
              key={playerSrc}
              src={playerSrc}
              title={`Twitch ${activeStation.label} (${activeStation.channel})`}
              allowFullScreen
              allow="autoplay; fullscreen"
              className="h-full w-full border-0"
            />
          </div>

          {showChat && (
            <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 min-h-[360px] lg:min-h-0 dark:border-slate-800">
              <iframe
                key={chatSrc}
                src={chatSrc}
                title={`Twitch Chat ${activeStation.channel}`}
                className="h-full w-full min-h-[360px] border-0"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
