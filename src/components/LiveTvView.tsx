import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderOpen,
  ListVideo,
  Play,
} from 'lucide-react';

export interface BroadcastChannel {
  number: number;
  label: string;
  callsign: string;
  url: string;
  kind: 'twitch' | 'youtube-playlist';
  playlistId?: string;
}

export interface PlayEventItem {
  id: string;
  era: 'Interim Era' | 'Caratime Era' | 'Daliatime Era' | 'Year End Collection';
  year: string;
  dateLabel: string;
  title: string;
  url: string;
  kind: 'youtube-playlist' | 'youtube-video';
  mediaId: string;
}

export const STATIONS: BroadcastChannel[] = [
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

export const PLAY_EVENTS: PlayEventItem[] = [
  // Interim Era — 2018
  {
    id: 'ev-2018-iloveme',
    era: 'Interim Era',
    year: '2018',
    dateLabel: 'Nov 24',
    title: 'I Love Me',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GF11UPA7mkBgWV-8iLd8JeE',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GF11UPA7mkBgWV-8iLd8JeE',
  },

  // Caratime Era — 2019
  {
    id: 'ev-2019-identity',
    era: 'Caratime Era',
    year: '2019',
    dateLabel: 'Apr 12',
    title: 'Identity',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GGIjCYq93EfUdKdeyrhhvVS',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GGIjCYq93EfUdKdeyrhhvVS',
  },
  {
    id: 'ev-2019-meyou',
    era: 'Caratime Era',
    year: '2019',
    dateLabel: 'Jul 8',
    title: 'Me & You',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GEtxAAOnADDhV0DMUdn4dh5',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GEtxAAOnADDhV0DMUdn4dh5',
  },
  {
    id: 'ev-2019-enjoy',
    era: 'Caratime Era',
    year: '2019',
    dateLabel: 'Nov 24',
    title: 'Enjoy Yourself',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GFyQMXaI2DKMLfSjYVM-LdX',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GFyQMXaI2DKMLfSjYVM-LdX',
  },

  // Caratime Era — 2020
  {
    id: 'ev-2020-lumiere',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: 'Feb 21',
    title: 'Lumiere',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GHUdbWPVBkiLC-XYolNe1fz',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GHUdbWPVBkiLC-XYolNe1fz',
  },
  {
    id: 'ev-2020-greatdivide',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: 'May 12',
    title: 'The Great Divide',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GFUPnejK_ULG5zSRjuiDnOX',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GFUPnejK_ULG5zSRjuiDnOX',
  },
  {
    id: 'ev-2020-forever21',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: 'Aug 21',
    title: 'forever.21',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GFMFoYKE-ELaVjKulsqHS3K',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GFMFoYKE-ELaVjKulsqHS3K',
  },
  {
    id: 'ev-2020-forever21-ext',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: 'Nov 24',
    title: 'forever.21 : The Extended Show',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GFMLwskKhxSYAWjBbpvlaa9',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GFMLwskKhxSYAWjBbpvlaa9',
  },

  // Caratime Era — 2021
  {
    id: 'ev-2021-betact-iwas',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: 'Feb 24',
    title: 'BE:tact 2021 (I WAS)',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzrmjL4ooIxkoCmVigY-ds_',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzrmjL4ooIxkoCmVigY-ds_',
  },
  {
    id: 'ev-2021-betact-iam',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: 'Feb 24',
    title: 'BE:tact 2021 (I AM)',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZy1h1CWWIZl3x5Q84KENMrW',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZy1h1CWWIZl3x5Q84KENMrW',
  },
  {
    id: 'ev-2021-myturn-s1',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: 'May 21',
    title: 'My Turn (season 1)',
    url: 'https://www.youtube.com/playlist?list=PLFh_M_vWUiZy6AyVrtieRDPx5Qo7piBgb',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZy6AyVrtieRDPx5Qo7piBgb',
  },
  {
    id: 'ev-2021-summer',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: 'Jul 9',
    title: 'Summer Live',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzvhT1AmxDyc4UkV1PCrkPM&si=EzrqmeaF7i-17Uxs',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzvhT1AmxDyc4UkV1PCrkPM',
  },
  {
    id: 'ev-2021-stay-debut',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: 'Dec 28',
    title: 'STAY Debut Show',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZyIr6K-Q1m0psM1Stw7ZylR&si=B6bT4R-ahZAIzNEX',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZyIr6K-Q1m0psM1Stw7ZylR',
  },

  // Caratime Era — 2022
  {
    id: 'ev-2022-belive',
    era: 'Caratime Era',
    year: '2022',
    dateLabel: 'Jun 10',
    title: 'BE Live Con 2022',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZx-6XOqKYmRK91WdA3nDjHF&si=o6dWkQo00cUZ2Bkp',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZx-6XOqKYmRK91WdA3nDjHF',
  },
  {
    id: 'ev-2022-myturn-s2',
    era: 'Caratime Era',
    year: '2022',
    dateLabel: 'Nov 30',
    title: 'My Turn (season 2)',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZxpgEimNS6ccw8KxAinCgGi&si=h1iV4tWtvi3l3mtj',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZxpgEimNS6ccw8KxAinCgGi',
  },
  {
    id: 'ev-2022-chainreaction',
    era: 'Caratime Era',
    year: '2022',
    dateLabel: 'Dec 29',
    title: 'Chain Reaction Live',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZxY8w1D4DvsJV0xKTBMjjyp&si=3R3CgNrW3trNwo7B',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZxY8w1D4DvsJV0xKTBMjjyp',
  },

  // Caratime Era — 2023
  {
    id: 'ev-2023-stayteen',
    era: 'Caratime Era',
    year: '2023',
    dateLabel: 'Jun 27',
    title: 'STAYTEEN Live',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzJMN6EC8gBHXs5LHMQYRgI&si=kKHiOBY6Ub70OiZY',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzJMN6EC8gBHXs5LHMQYRgI',
  },
  {
    id: 'ev-2023-meherenow',
    era: 'Caratime Era',
    year: '2023',
    dateLabel: 'Sep 8',
    title: 'me.here.now',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZyeqY6riQ8Fnh103wOpZpK8&si=MTiF3ftKdF8VBmQT',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZyeqY6riQ8Fnh103wOpZpK8',
  },
  {
    id: 'ev-2023-evolution',
    era: 'Caratime Era',
    year: '2023',
    dateLabel: 'Dec 11',
    title: 'eVolution : the Eras Finale',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZwvkGk3y4d0wxH-gHqEiXGT&si=YlimfwEUsR-dURGp',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZwvkGk3y4d0wxH-gHqEiXGT',
  },

  // Daliatime Era — 2024
  {
    id: 'ev-2024-thegoodlife',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: 'May 27',
    title: '#thegoodlife',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcVGg1vExg0w91QjYRUuotHq&si=-XdWAKgc99ToD-2Y',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcVGg1vExg0w91QjYRUuotHq',
  },
  {
    id: 'ev-2024-allin',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: 'Jun 10',
    title: 'ALLIN Debut Live',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcXoKgGS29brQqdbecI-JxD7&si=yXivmckPIaIKeEfH',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcXoKgGS29brQqdbecI-JxD7',
  },
  {
    id: 'ev-2024-homecoming-1',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: 'Aug 21',
    title: 'forever.21 : the Homecoming (part 1)',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcUU42o_J_jE4FXZOwC_TmAX&si=Bfp2tjg1mfKtngLo',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcUU42o_J_jE4FXZOwC_TmAX',
  },
  {
    id: 'ev-2024-homecoming-2',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: 'Aug 26',
    title: 'forever.21 : the Homecoming (part 2)',
    url: 'https://youtu.be/MJbxDtEmBWo?si=1DsW11u6L75NypMM',
    kind: 'youtube-video',
    mediaId: 'MJbxDtEmBWo',
  },
  {
    id: 'ev-2024-hitime',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: 'Nov 15',
    title: 'Hi TiME Debut Live',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcXFe2p8ewZVRja7iVOaV1aQ&si=mrpyK-5nMkMERH3c',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcXFe2p8ewZVRja7iVOaV1aQ',
  },

  // Daliatime Era — 2025
  {
    id: 'ev-2025-allinday',
    era: 'Daliatime Era',
    year: '2025',
    dateLabel: 'Feb 24',
    title: 'ALLINDAY Music Festival',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcUBO2SD_U_zlCoDFhlUO7SG&si=z29MZS-Oi6pt0RKH',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcUBO2SD_U_zlCoDFhlUO7SG',
  },

  // Year End Collection
  {
    id: 'ev-yearend',
    era: 'Year End Collection',
    year: 'Archive',
    dateLabel: 'Year End',
    title: 'Year End Playlist',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzL7HYbbSiCiRaH7V_m0Z46&si=s3nj8WrkSivvPlo3',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzL7HYbbSiCiRaH7V_m0Z46',
  },
];

const ERA_FOLDERS: Exclude<PlayEventItem['era'], 'Year End Collection'>[] = [
  'Interim Era',
  'Caratime Era',
  'Daliatime Era',
];

interface LiveTvViewProps {
  activeStation: BroadcastChannel;
  activeEvent: PlayEventItem | null;
  onSelectStation: (station: BroadcastChannel) => void;
  onSelectEvent: (event: PlayEventItem) => void;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({
  activeStation,
  activeEvent,
  onSelectStation,
  onSelectEvent,
}) => {
  const parentHost = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    return window.location.hostname || 'localhost';
  }, []);

  const [currentEra, setCurrentEra] = useState<
    Exclude<PlayEventItem['era'], 'Year End Collection'> | null
  >(() =>
    activeEvent && activeEvent.era !== 'Year End Collection'
      ? activeEvent.era
      : null
  );
  const [currentYear, setCurrentYear] = useState<string | null>(() =>
    activeEvent && activeEvent.era !== 'Year End Collection'
      ? activeEvent.year
      : null
  );

  // Keep folder browser synchronized when stepping through events or starting from 2018
  useEffect(() => {
    if (!activeEvent) return;
    if (activeEvent.era === 'Year End Collection') {
      setCurrentEra(null);
      setCurrentYear(null);
    } else {
      setCurrentEra(activeEvent.era);
      setCurrentYear(activeEvent.year);
    }
  }, [activeEvent]);

  const [autoplayEnabled, setAutoplayEnabled] = useState(false);

  const isTwitch = !activeEvent && activeStation.kind === 'twitch';
  const ytAutoplay = autoplayEnabled ? '1' : '0';

  // Unified autoplay rule: all YouTube playlists/videos (VOD_ch4 + Play Event) & viewer channels follow autoplayEnabled (default: false)
  const playerSrc = activeEvent
    ? activeEvent.kind === 'youtube-video'
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          activeEvent.mediaId
        )}?autoplay=${ytAutoplay}&rel=0`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
          activeEvent.mediaId
        )}&autoplay=${ytAutoplay}`
    : isTwitch
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(
        activeStation.callsign
      )}&parent=${encodeURIComponent(parentHost)}&muted=false&autoplay=${
        autoplayEnabled ? 'true' : 'false'
      }`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
        activeStation.playlistId || ''
      )}&autoplay=${ytAutoplay}`;

  const externalUrl = activeEvent ? activeEvent.url : activeStation.url;
  const externalLabel = activeEvent || !isTwitch ? 'Open on YouTube' : 'Open on Twitch';

  const activeEventIndex = activeEvent
    ? PLAY_EVENTS.findIndex((e) => e.id === activeEvent.id)
    : -1;

  const yearEndItem = useMemo(
    () => PLAY_EVENTS.find((e) => e.era === 'Year End Collection') || null,
    []
  );

  const eraSummaries = useMemo(() => {
    return ERA_FOLDERS.map((era) => {
      const items = PLAY_EVENTS.filter((e) => e.era === era);
      const years = Array.from(new Set(items.map((e) => e.year)));
      const yearLabel =
        years.length === 1 ? years[0] : `${years[0]}–${years[years.length - 1]}`;
      return {
        era,
        count: items.length,
        years,
        yearLabel,
      };
    });
  }, []);

  const yearsInCurrentEra = useMemo(() => {
    if (!currentEra) return [];
    const items = PLAY_EVENTS.filter((e) => e.era === currentEra);
    const years = Array.from(new Set(items.map((e) => e.year)));
    return years.map((yr) => ({
      year: yr,
      items: items.filter((e) => e.year === yr),
    }));
  }, [currentEra]);

  const eventsInCurrentYear = useMemo(() => {
    if (!currentEra || !currentYear) return [];
    return PLAY_EVENTS.filter(
      (e) => e.era === currentEra && e.year === currentYear
    );
  }, [currentEra, currentYear]);

  const handleStepEvent = (delta: number) => {
    if (activeEventIndex === -1) {
      onSelectEvent(PLAY_EVENTS[0]);
      return;
    }
    const nextIdx = (activeEventIndex + delta + PLAY_EVENTS.length) % PLAY_EVENTS.length;
    onSelectEvent(PLAY_EVENTS[nextIdx]);
  };

  const handleGoUp = () => {
    if (currentYear) {
      setCurrentYear(null);
    } else if (currentEra) {
      setCurrentEra(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Main Broadcast & Event Player */}
      <section className="aero-glass overflow-hidden rounded-3xl p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-mono font-semibold tabular-nums">
            {activeEvent
              ? `/${
                  activeEvent.era === 'Year End Collection'
                    ? activeEvent.title
                    : `${activeEvent.era}/${activeEvent.year}/${activeEvent.title}`
                } (${activeEvent.dateLabel})`
              : `CH 0${activeStation.number} · ${activeStation.callsign}`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {activeEvent && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepEvent(-1)}
                  aria-label="Previous Event"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepEvent(1)}
                  aria-label="Next Event"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={autoplayEnabled}
              onClick={() => setAutoplayEnabled((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoplayEnabled
                  ? 'aero-button-primary border-transparent text-white'
                  : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Autoplay: {autoplayEnabled ? 'On' : 'Off'}</span>
            </button>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap shrink-0"
            >
              <span>{externalLabel}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 aspect-video dark:border-slate-800">
          <iframe
            key={playerSrc}
            src={playerSrc}
            title={
              activeEvent
                ? activeEvent.title
                : `${activeStation.label} (${activeStation.callsign})`
            }
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            className="h-full w-full border-0"
          />
        </div>

        {/* Mobile Compact Remote Control [1] [2] [3] [4] directly under the player */}
        <div
          role="tablist"
          aria-label="Mobile Remote Control"
          className="mt-3 grid grid-cols-4 gap-2 lg:hidden"
        >
          {STATIONS.map((station) => {
            const isSelected = !activeEvent && activeStation.callsign === station.callsign;
            return (
              <button
                key={station.callsign}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${station.label} — ${station.callsign}`}
                onClick={() => onSelectStation(station)}
                className={`flex h-11 items-center justify-center rounded-xl border font-display text-base font-bold tabular-nums transition-colors cursor-pointer ${
                  isSelected
                    ? 'aero-button-primary border-transparent text-white'
                    : 'border-slate-200/90 bg-white/80 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100'
                }`}
              >
                {station.number}
              </button>
            );
          })}
        </div>
      </section>

      {/* Play Event Folder Directory inside a Scrollable Container */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Play Event
          </h2>

          <button
            type="button"
            onClick={() => onSelectEvent(PLAY_EVENTS[0])}
            className="aero-button-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            Load From 2018
          </button>
        </div>

        {/* File Explorer Frame */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/75 dark:border-slate-700/80 dark:bg-slate-900/65">
          {/* Address / Breadcrumb Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-100/70 px-3 py-2 text-xs dark:border-slate-700/80 dark:bg-slate-950/60">
            <button
              type="button"
              onClick={handleGoUp}
              disabled={!currentEra && !currentYear}
              aria-label="Up one folder"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer disabled:cursor-default"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>

            <nav
              aria-label="Event Directory Path"
              className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto font-mono text-xs text-slate-600 dark:text-slate-300"
            >
              <button
                type="button"
                onClick={() => {
                  setCurrentEra(null);
                  setCurrentYear(null);
                }}
                className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/40 cursor-pointer"
              >
                /
              </button>

              {currentEra && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentYear(null)}
                    className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/40 cursor-pointer"
                  >
                    {currentEra}
                  </button>
                </>
              )}

              {currentYear && (
                <>
                  <span className="text-slate-400">/</span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-slate-800 tabular-nums dark:text-slate-100">
                    {currentYear}
                  </span>
                </>
              )}

              {activeEvent &&
                ((activeEvent.era === 'Year End Collection' && !currentEra) ||
                  (activeEvent.era === currentEra &&
                    activeEvent.year === currentYear)) && (
                  <>
                    {currentEra && <span className="text-slate-400">/</span>}
                    <span className="truncate font-semibold text-slate-900 dark:text-white">
                      {activeEvent.title}
                    </span>
                  </>
                )}
            </nav>
          </div>

          {/* Scrollable Folder & Item List */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/80">
            {/* Level 1: Root Directory (/Interim Era, /Caratime Era, /Daliatime Era, Year End Playlist) */}
            {!currentEra && (
              <>
                {eraSummaries.map((folder) => {
                  const hasActiveInside = activeEvent?.era === folder.era;
                  return (
                    <button
                      key={folder.era}
                      type="button"
                      onClick={() => {
                        setCurrentEra(folder.era);
                        setCurrentYear(null);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                        hasActiveInside
                          ? 'bg-sky-50/75 dark:bg-sky-950/35'
                          : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Folder className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                        <div className="min-w-0">
                          <div className="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                            {folder.era}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                            {folder.yearLabel} · {folder.count}{' '}
                            {folder.count === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  );
                })}

                {yearEndItem && (
                  <button
                    type="button"
                    onClick={() => onSelectEvent(yearEndItem)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      activeEvent?.id === yearEndItem.id
                        ? 'aero-button-primary text-white'
                        : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ListVideo
                        className={`h-4 w-4 shrink-0 ${
                          activeEvent?.id === yearEndItem.id
                            ? 'text-white'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm font-bold">
                          {yearEndItem.title}
                        </div>
                        <div
                          className={`font-mono text-[11px] ${
                            activeEvent?.id === yearEndItem.id
                              ? 'text-sky-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Archive Playlist
                        </div>
                      </div>
                    </div>
                    <Play
                      className={`h-3.5 w-3.5 shrink-0 ${
                        activeEvent?.id === yearEndItem.id
                          ? 'text-white'
                          : 'text-sky-600 dark:text-sky-400'
                      }`}
                    />
                  </button>
                )}
              </>
            )}

            {/* Level 2: Year Folders inside selected Era (/Caratime Era/2019, ...) */}
            {currentEra && !currentYear &&
              yearsInCurrentEra.map((yrGroup) => {
                const hasActiveInside =
                  activeEvent?.era === currentEra &&
                  activeEvent?.year === yrGroup.year;
                return (
                  <button
                    key={yrGroup.year}
                    type="button"
                    onClick={() => setCurrentYear(yrGroup.year)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      hasActiveInside
                        ? 'bg-sky-50/75 dark:bg-sky-950/35'
                        : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FolderOpen className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                          {yrGroup.year}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                          {yrGroup.items.length}{' '}
                          {yrGroup.items.length === 1 ? 'event' : 'events'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                );
              })}

            {/* Level 3: Event items inside /Era/Year (/Caratime Era/2019/Identity) */}
            {currentEra && currentYear &&
              eventsInCurrentYear.map((ev) => {
                const isSelected = activeEvent?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'aero-button-primary text-white'
                        : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ListVideo
                        className={`h-4 w-4 shrink-0 ${
                          isSelected
                            ? 'text-white'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-display text-sm font-bold">
                          {ev.title}
                        </div>
                        <div
                          className={`font-mono text-[11px] tabular-nums ${
                            isSelected
                              ? 'text-sky-100'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {ev.dateLabel} ·{' '}
                          {ev.kind === 'youtube-video' ? 'Video' : 'Playlist'}
                        </div>
                      </div>
                    </div>
                    <Play
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isSelected
                          ? 'text-white'
                          : 'text-sky-600 dark:text-sky-400'
                      }`}
                    />
                  </button>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
};
