import React, { useMemo, useState } from 'react';
import { ExternalLink, MessageSquare, Tv } from 'lucide-react';

interface BroadcastChannel {
  number: number;
  label: string;
  callsign: string;
  url: string;
  kind: 'twitch' | 'youtube-playlist';
  playlistId?: string;
}

const STATIONS: BroadcastChannel[] = [
  {
    number: 1,
    label: 'Channel 1',
    callsign: 'MDTV_ch1',
    url: 'https://www.twitch.tv/MDTV_ch1',
    kind: 'twitch',
  },
  {
    number: 2,
    label: 'Channel 2',
    callsign: 'MDMT_ch2',
    url: 'https://www.twitch.tv/MDMT_ch2',
    kind: 'twitch',
  },
  {
    number: 3,
    label: 'Channel 3',
    callsign: 'MDRS_ch3',
    url: 'https://www.twitch.tv/MDRS_ch3',
    kind: 'twitch',
  },
  {
    number: 4,
    label: 'Channel 4',
    callsign: 'VOD_ch4',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcVinZVQhY2Nl7KaFekeHCA-&si=EN_dZZnh24PSn6PX',
    kind: 'youtube-playlist',
    playlistId: 'PLsosZDdrwfcVinZVQhY2Nl7KaFekeHCA-',
  },
];

export const LiveTvView: React.FC = () => {
  const [activeStation, setActiveStation] = useState<BroadcastChannel>(STATIONS[0]);
  const [showChat, setShowChat] = useState(false);

  const parentHost = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    return window.location.hostname || 'localhost';
  }, []);

  const isTwitch = activeStation.kind === 'twitch';

  const playerSrc = isTwitch
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(
        activeStation.callsign
      )}&parent=${encodeURIComponent(parentHost)}&muted=false&autoplay=true`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
        activeStation.playlistId || ''
      )}`;

  const chatSrc = `https://www.twitch.tv/embed/${encodeURIComponent(
    activeStation.callsign
  )}/chat?parent=${encodeURIComponent(parentHost)}`;

  return (
    <div className="space-y-5">
      {/* Broadcast Monitor Frame (On Top) */}
      <section className="aero-glass overflow-hidden rounded-3xl p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-mono font-semibold tabular-nums">
            TUNED TO CH 0{activeStation.number} — {activeStation.callsign}
          </span>
          <div className="flex items-center gap-2">
            {isTwitch && (
              <button
                type="button"
                onClick={() => setShowChat((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showChat
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {showChat ? 'Hide Chat' : 'Show Chat'}
              </button>
            )}
            <a
              href={activeStation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap shrink-0"
            >
              <span>{isTwitch ? 'Open on Twitch' : 'Open on YouTube'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-3 ${
            isTwitch && showChat ? 'lg:grid-cols-12' : ''
          }`}
        >
          <div
            className={`${
              isTwitch && showChat ? 'lg:col-span-8' : ''
            } overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 aspect-video dark:border-slate-800`}
          >
            <iframe
              key={playerSrc}
              src={playerSrc}
              title={`${activeStation.label} (${activeStation.callsign})`}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              className="h-full w-full border-0"
            />
          </div>

          {isTwitch && showChat && (
            <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 min-h-[360px] lg:min-h-0 dark:border-slate-800">
              <iframe
                key={chatSrc}
                src={chatSrc}
                title={`Twitch Chat ${activeStation.callsign}`}
                className="h-full w-full min-h-[360px] border-0"
              />
            </div>
          )}
        </div>
      </section>

      {/* TV Station Selector Bar (Below Viewer) */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Tv className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Remote Control
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Broadcast Channels"
          className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STATIONS.map((station) => {
            const isSelected = activeStation.callsign === station.callsign;
            return (
              <button
                key={station.callsign}
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
                    {station.callsign}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
