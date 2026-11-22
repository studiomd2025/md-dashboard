import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Folder,
  FolderOpen,
  Home,
  LayoutGrid,
  ListVideo,
  Loader2,
  Maximize2,
  PanelBottom,
  PictureInPicture2,
  Play,
  RefreshCw,
  RotateCcw,
  Rows3,
  Search,
  Settings,
  Tv,
  X,
} from 'lucide-react';
import { normalizeShortsToWatchUrl } from '../lib/mediaUtils';
import type { PlayEventRecord } from '../types';

const RemoteIcon: React.FC<{ className?: string }> = ({
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="7" y="2" width="10" height="20" rx="3" />
    <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
    <path d="M12 11v4" />
    <path d="M10 13h4" />
    <circle cx="10.5" cy="18" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="18" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

interface TwitchStatusInfo {
  isLive: boolean;
  bannerImageUrl: string | null;
  offlineImageUrl: string | null;
  streamTitle: string | null;
  viewersCount: number | null;
}

const twitchStatusCache = new Map<
  string,
  { fetchedAt: number; data: TwitchStatusInfo }
>();

const playlistTrackCache = new Map<
  string,
  { title: string; items: PlaylistTrackItem[] }
>();


export interface PlaylistTrackItem {
  videoId: string;
  title: string;
  thumbnail: string;
  url?: string;
  published?: string;
}

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
  era: string;
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
    dateLabel: '2018.11.24',
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
    dateLabel: '2019.04.12',
    title: 'Identity',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GGIjCYq93EfUdKdeyrhhvVS',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GGIjCYq93EfUdKdeyrhhvVS',
  },
  {
    id: 'ev-2019-meyou',
    era: 'Caratime Era',
    year: '2019',
    dateLabel: '2019.07.8',
    title: 'Me & You',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GEtxAAOnADDhV0DMUdn4dh5',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GEtxAAOnADDhV0DMUdn4dh5',
  },
  {
    id: 'ev-2019-enjoy',
    era: 'Caratime Era',
    year: '2019',
    dateLabel: '2019.11.24',
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
    dateLabel: '2020.02.21',
    title: 'Lumiere',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GHUdbWPVBkiLC-XYolNe1fz',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GHUdbWPVBkiLC-XYolNe1fz',
  },
  {
    id: 'ev-2020-greatdivide',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: '2020.05.12',
    title: 'The Great Divide',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GFUPnejK_ULG5zSRjuiDnOX',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GFUPnejK_ULG5zSRjuiDnOX',
  },
  {
    id: 'ev-2020-forever21',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: '2020.08.21',
    title: 'forever.21',
    url: 'https://www.youtube.com/playlist?list=PLoDpsKEy68GFMFoYKE-ELaVjKulsqHS3K',
    kind: 'youtube-playlist',
    mediaId: 'PLoDpsKEy68GFMFoYKE-ELaVjKulsqHS3K',
  },
  {
    id: 'ev-2020-forever21-ext',
    era: 'Caratime Era',
    year: '2020',
    dateLabel: '2020.11.24',
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
    dateLabel: '2021.02.24',
    title: 'BE:tact 2021 (I WAS)',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzrmjL4ooIxkoCmVigY-ds_',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzrmjL4ooIxkoCmVigY-ds_',
  },
  {
    id: 'ev-2021-betact-iam',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: '2021.02.24',
    title: 'BE:tact 2021 (I AM)',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZy1h1CWWIZl3x5Q84KENMrW',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZy1h1CWWIZl3x5Q84KENMrW',
  },
  {
    id: 'ev-2021-myturn-s1',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: '2021.05.21',
    title: 'My Turn (season 1)',
    url: 'https://www.youtube.com/playlist?list=PLFh_M_vWUiZy6AyVrtieRDPx5Qo7piBgb',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZy6AyVrtieRDPx5Qo7piBgb',
  },
  {
    id: 'ev-2021-summer',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: '2021.07.9',
    title: 'Summer Live',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzvhT1AmxDyc4UkV1PCrkPM&si=EzrqmeaF7i-17Uxs',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzvhT1AmxDyc4UkV1PCrkPM',
  },
  {
    id: 'ev-2021-stay-debut',
    era: 'Caratime Era',
    year: '2021',
    dateLabel: '2021.12.28',
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
    dateLabel: '2022.06.10',
    title: 'BE Live Con 2022',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZx-6XOqKYmRK91WdA3nDjHF&si=o6dWkQo00cUZ2Bkp',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZx-6XOqKYmRK91WdA3nDjHF',
  },
  {
    id: 'ev-2022-myturn-s2',
    era: 'Caratime Era',
    year: '2022',
    dateLabel: '2022.11.30',
    title: 'My Turn (season 2)',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZxpgEimNS6ccw8KxAinCgGi&si=h1iV4tWtvi3l3mtj',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZxpgEimNS6ccw8KxAinCgGi',
  },
  {
    id: 'ev-2022-chainreaction',
    era: 'Caratime Era',
    year: '2022',
    dateLabel: '2022.12.29',
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
    dateLabel: '2023.06.27',
    title: 'STAYTEEN Live',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzJMN6EC8gBHXs5LHMQYRgI&si=kKHiOBY6Ub70OiZY',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzJMN6EC8gBHXs5LHMQYRgI',
  },
  {
    id: 'ev-2023-meherenow',
    era: 'Caratime Era',
    year: '2023',
    dateLabel: '2023.09.8',
    title: 'me.here.now',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZyeqY6riQ8Fnh103wOpZpK8&si=MTiF3ftKdF8VBmQT',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZyeqY6riQ8Fnh103wOpZpK8',
  },
  {
    id: 'ev-2023-evolution',
    era: 'Caratime Era',
    year: '2023',
    dateLabel: '2023.12.11',
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
    dateLabel: '2024.05.27',
    title: '#thegoodlife',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcVGg1vExg0w91QjYRUuotHq&si=-XdWAKgc99ToD-2Y',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcVGg1vExg0w91QjYRUuotHq',
  },
  {
    id: 'ev-2024-allin',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: '2024.06.10',
    title: 'ALLIN Debut Live',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcXoKgGS29brQqdbecI-JxD7&si=yXivmckPIaIKeEfH',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcXoKgGS29brQqdbecI-JxD7',
  },
  {
    id: 'ev-2024-homecoming-1',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: '2024.08.21',
    title: 'forever.21 : the Homecoming (part 1)',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcUU42o_J_jE4FXZOwC_TmAX&si=Bfp2tjg1mfKtngLo',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcUU42o_J_jE4FXZOwC_TmAX',
  },
  {
    id: 'ev-2024-homecoming-2',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: '2024.08.26',
    title: 'forever.21 : the Homecoming (part 2)',
    url: 'https://youtu.be/MJbxDtEmBWo?si=1DsW11u6L75NypMM',
    kind: 'youtube-video',
    mediaId: 'MJbxDtEmBWo',
  },
  {
    id: 'ev-2024-hitime',
    era: 'Daliatime Era',
    year: '2024',
    dateLabel: '2024.11.15',
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
    dateLabel: '2025.02.24',
    title: 'ALLINDAY Music Festival',
    url: 'https://youtube.com/playlist?list=PLsosZDdrwfcUBO2SD_U_zlCoDFhlUO7SG&si=z29MZS-Oi6pt0RKH',
    kind: 'youtube-playlist',
    mediaId: 'PLsosZDdrwfcUBO2SD_U_zlCoDFhlUO7SG',
  },

  // MD Wrapped
  {
    id: 'ev-yearend',
    era: 'Standalone',
    year: '',
    dateLabel: '',
    title: 'MD Wrapped',
    url: 'https://youtube.com/playlist?list=PLFh_M_vWUiZzL7HYbbSiCiRaH7V_m0Z46&si=s3nj8WrkSivvPlo3',
    kind: 'youtube-playlist',
    mediaId: 'PLFh_M_vWUiZzL7HYbbSiCiRaH7V_m0Z46',
  },
];

const ERA_FOLDERS: string[] = [
  'Interim Era',
  'Caratime Era',
  'Daliatime Era',
];

export function mergePlayEvents(
  builtIn: PlayEventItem[],
  overrides: PlayEventRecord[] = [],
  filterNowMs?: number
): PlayEventRecord[] {
  const overrideMap = new Map<string, PlayEventRecord>();
  for (const ov of overrides) {
    overrideMap.set(ov.id, ov);
  }
  const merged: PlayEventRecord[] = [];
  for (const item of builtIn) {
    const ov = overrideMap.get(item.id);
    if (ov) {
      if (!ov.isDeleted) merged.push(ov);
      overrideMap.delete(item.id);
    } else {
      merged.push(item);
    }
  }
  for (const remaining of overrideMap.values()) {
    if (!remaining.isDeleted) {
      merged.push(remaining);
    }
  }
  if (filterNowMs !== undefined) {
    return merged.filter((ev) => {
      if (!ev.scheduledFor) return true;
      const ts = new Date(ev.scheduledFor).getTime();
      return Number.isNaN(ts) || ts <= filterNowMs;
    });
  }
  return merged;
}

interface LiveTvViewProps {
  activeStation: BroadcastChannel;
  activeEvent: PlayEventItem | null;
  customPlayEvents?: PlayEventRecord[];
  nowMs?: number;
  onSelectStation: (station: BroadcastChannel) => void;
  onSelectEvent: (event: PlayEventItem) => void;
  isActiveTab?: boolean;
  floatingEnabled?: boolean;
  onToggleFloating?: () => void;
  onGoToLive?: () => void;
  onGoToPlayEvent?: () => void;
  scrollToPlayEventNonce?: number;
  onMobileSplitVisibilityChange?: (visible: boolean) => void;
  onMobileSplitHeightChange?: (height: number) => void;
  isSidebarCollapsed?: boolean;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({
  activeStation,
  activeEvent,
  customPlayEvents = [],
  nowMs,
  onSelectStation,
  onSelectEvent,
  isActiveTab = true,
  floatingEnabled = true,
  onToggleFloating,
  onGoToLive,
  onGoToPlayEvent,
  scrollToPlayEventNonce = 0,
  onMobileSplitVisibilityChange,
  onMobileSplitHeightChange,
  isSidebarCollapsed = false,
}) => {
  const parentHost = useMemo(() => {
    if (typeof window === 'undefined') return 'localhost';
    return window.location.hostname || 'localhost';
  }, []);

  const allPlayEvents = useMemo(
    () => mergePlayEvents(PLAY_EVENTS, customPlayEvents, nowMs),
    [customPlayEvents, nowMs]
  );

  const [currentEra, setCurrentEra] = useState<string | null>(() =>
    activeEvent &&
    activeEvent.era &&
    activeEvent.era !== 'Year End Collection' &&
    activeEvent.era !== 'Standalone'
      ? activeEvent.era
      : null
  );
  const [currentYear, setCurrentYear] = useState<string | null>(() =>
    activeEvent &&
    activeEvent.era &&
    activeEvent.era !== 'Year End Collection' &&
    activeEvent.era !== 'Standalone'
      ? activeEvent.year
      : null
  );

  const [isDesktopOrTablet, setIsDesktopOrTablet] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 640px)').matches;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!activeEvent) return;
    if (
      !activeEvent.era ||
      activeEvent.era === 'Year End Collection' ||
      activeEvent.era === 'Standalone'
    ) {
      setCurrentEra(null);
      setCurrentYear(null);
    } else {
      setCurrentEra(activeEvent.era);
      setCurrentYear(activeEvent.year);
    }
  }, [activeEvent]);

  const lastHandledPlayEventNonceRef = useRef(scrollToPlayEventNonce);
  const [activeMiniDrawer, setActiveMiniDrawer] = useState<
    'none' | 'remote' | 'playlist' | 'settings'
  >('none');
  const [remoteBrowsePlayEvents, setRemoteBrowsePlayEvents] = useState(false);
  const miniDrawerRef = useRef<HTMLElement>(null);
  const [miniDrawerDims, setMiniDrawerDims] = useState<{
    width: number;
    height: number;
  }>({ width: 148, height: 200 });

  const [fsDockOpen, setFsDockOpen] = useState(false);
  const fsDockHideTimerRef = useRef<number | null>(null);

  const clearFsDockTimer = () => {
    if (fsDockHideTimerRef.current !== null) {
      window.clearTimeout(fsDockHideTimerRef.current);
      fsDockHideTimerRef.current = null;
    }
  };

  const scheduleFsDockAutoHide = (delayMs: number) => {
    clearFsDockTimer();
    fsDockHideTimerRef.current = window.setTimeout(() => {
      setFsDockOpen(false);
      fsDockHideTimerRef.current = null;
    }, delayMs);
  };

  useEffect(() => {
    if (!floatingEnabled && !isFullscreen) {
      setActiveMiniDrawer('none');
      setRemoteBrowsePlayEvents(false);
    }
  }, [floatingEnabled, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen || activeMiniDrawer !== 'none') {
      clearFsDockTimer();
      setFsDockOpen(false);
    }
  }, [isFullscreen, activeMiniDrawer]);

  useEffect(() => () => clearFsDockTimer(), []);

  useEffect(() => {
    const el = miniDrawerRef.current;
    if (
      !el ||
      typeof ResizeObserver === 'undefined' ||
      (!floatingEnabled && !isFullscreen) ||
      activeMiniDrawer === 'none'
    ) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w > 0 && h > 0) {
          setMiniDrawerDims((prev) =>
            prev.width === w && prev.height === h ? prev : { width: w, height: h }
          );
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [floatingEnabled, isFullscreen, activeMiniDrawer]);

  const toggleMiniDrawer = (target: 'remote' | 'playlist' | 'settings') => {
    setActiveMiniDrawer((prev) => (prev === target ? 'none' : target));
  };
  const [mobileSplitCompact, setMobileSplitCompact] = useState(false);
  const [dockedHeight, setDockedHeight] = useState<number | null>(null);
  const dockedSectionRef = useRef<HTMLElement>(null);
  const mobileSplitRef = useRef<HTMLElement>(null);
  const miniHeaderRef = useRef<HTMLDivElement>(null);
  const floatingContainerRef = useRef<HTMLElement>(null);
  const playEventSectionRef = useRef<HTMLElement>(null);
  const miniPlaylistScrollRef = useRef<HTMLDivElement>(null);
  const modalPlaylistScrollRef = useRef<HTMLDivElement>(null);
  const wasMiniPlaylistOpenRef = useRef(false);
  const wasModalPlaylistOpenRef = useRef(false);
  const pendingStepScrollRef = useRef(false);
  const miniSwipeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    fromRightEdge: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    fromRightEdge: false,
  });

  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [eventViewMode, setEventViewMode] = useState<'list' | 'tiles'>('list');
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [floatSize, setFloatSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    boxW: number;
    boxH: number;
  }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    boxW: 340,
    boxH: 225,
  });
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startXPos: number;
    startYPos: number;
    headerH: number;
  }>({
    startX: 0,
    startY: 0,
    startW: 380,
    startH: 247,
    startXPos: 0,
    startYPos: 0,
    headerH: 33,
  });
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerIframeRef = useRef<HTMLIFrameElement>(null);
  const [ch4PlaybackStarted, setCh4PlaybackStarted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 640px)');
    const syncViewport = () => setIsDesktopOrTablet(mq.matches);
    syncViewport();
    mq.addEventListener('change', syncViewport);
    return () => mq.removeEventListener('change', syncViewport);
  }, []);

  const isMobileSplitActive = !isDesktopOrTablet && floatingEnabled;

  useEffect(() => {
    onMobileSplitVisibilityChange?.(isMobileSplitActive);
    return () => {
      onMobileSplitVisibilityChange?.(false);
    };
  }, [isMobileSplitActive, onMobileSplitVisibilityChange]);

  useLayoutEffect(() => {
    if (!isMobileSplitActive) {
      onMobileSplitHeightChange?.(0);
      return;
    }
    const el = mobileSplitRef.current;
    if (!el) return;

    const syncHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      onMobileSplitHeightChange?.(h);
    };

    syncHeight();

    if (typeof ResizeObserver === 'undefined') {
      return () => onMobileSplitHeightChange?.(0);
    }
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => {
      ro.disconnect();
      onMobileSplitHeightChange?.(0);
    };
  }, [
    isMobileSplitActive,
    mobileSplitCompact,
    activeMiniDrawer,
    onMobileSplitHeightChange,
  ]);

  useEffect(() => {
    if (!isActiveTab) return;
    if (scrollToPlayEventNonce > lastHandledPlayEventNonceRef.current) {
      lastHandledPlayEventNonceRef.current = scrollToPlayEventNonce;
      const timer = window.setTimeout(() => {
        playEventSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 90);
      return () => window.clearTimeout(timer);
    }
  }, [scrollToPlayEventNonce, isActiveTab]);

  const handleMiniSwipeStart = (
    clientX: number,
    clientY: number,
    containerEl: HTMLElement | null,
    forceRightEdge = false
  ) => {
    const rect = containerEl?.getBoundingClientRect();
    const fromRightEdge =
      forceRightEdge ||
      (rect ? clientX >= rect.right - 72 : false);
    miniSwipeRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      fromRightEdge,
    };
  };

  const handleMiniSwipeMove = (
    clientX: number,
    clientY: number,
    mode: 'floating' | 'mobile-split'
  ) => {
    const st = miniSwipeRef.current;
    if (!st.active) return;
    const dx = clientX - st.startX;
    const dy = clientY - st.startY;
    if (Math.abs(dy) > Math.abs(dx) * 1.25 && Math.abs(dy) > 18) {
      st.active = false;
      return;
    }
    if (mode === 'floating') {
      // Float mode: swipe right to expand remote control; swipe left to collapse
      if (dx > 28) {
        setActiveMiniDrawer('remote');
        st.active = false;
      } else if (dx < -28) {
        setActiveMiniDrawer('none');
        st.active = false;
      }
    } else {
      // Mobile split mode: swipe left from right edge to expand remote drawer; swipe right to collapse
      if (st.fromRightEdge && dx < -26) {
        setActiveMiniDrawer('remote');
        st.active = false;
      } else if (dx > 28) {
        setActiveMiniDrawer('none');
        st.active = false;
      }
    }
  };

  const handleMiniSwipeEnd = () => {
    miniSwipeRef.current.active = false;
  };

  const handleFloatingDragPointerDown = (e: React.PointerEvent) => {
    if (!isDesktopOrTablet) return;
    if (!floatingEnabled) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    setIsDragging(true);
    const rect =
      floatingContainerRef.current?.getBoundingClientRect() ||
      (e.currentTarget as HTMLElement).closest('.fixed')?.getBoundingClientRect();
    const boxW = rect ? rect.width : 340;
    const boxH = rect ? rect.height : 225;
    const posX = rect ? rect.left : Math.max(12, window.innerWidth - boxW - 20);
    const posY = rect ? rect.top : Math.max(12, window.innerHeight - boxH - 80);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX,
      posY,
      boxW,
      boxH,
    };
  };

  const handleResizePointerDown = (
    corner: 'nw' | 'ne' | 'sw' | 'se',
    e: React.PointerEvent
  ) => {
    if (!isDesktopOrTablet) return;
    e.stopPropagation();
    e.preventDefault();
    setResizeCorner(corner);
    const rect =
      floatingContainerRef.current?.getBoundingClientRect() ||
      (e.currentTarget as HTMLElement).closest('.fixed')?.getBoundingClientRect();
    const startW = rect ? rect.width : 360;
    const startH = rect ? rect.height : 236;
    const startXPos = rect ? rect.left : window.innerWidth - 380;
    const startYPos = rect ? rect.top : window.innerHeight - 260;
    const headerH =
      miniHeaderRef.current?.offsetHeight ||
      Math.max(0, Math.round(startH - startW * (9 / 16)));
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW,
      startH,
      startXPos,
      startYPos,
      headerH,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const maxX = Math.max(8, window.innerWidth - dragStartRef.current.boxW - 8);
      const maxY = Math.max(8, window.innerHeight - dragStartRef.current.boxH - 8);
      setFloatPos({
        x: Math.max(8, Math.min(maxX, dragStartRef.current.posX + dx)),
        y: Math.max(8, Math.min(maxY, dragStartRef.current.posY + dy)),
      });
    };
    const onPointerUp = () => setIsDragging(false);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!resizeCorner) return;
    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - resizeStartRef.current.startX;
      let newW = resizeStartRef.current.startW;
      let newX = resizeStartRef.current.startXPos;
      let newY = resizeStartRef.current.startYPos;

      if (resizeCorner === 'se' || resizeCorner === 'ne') {
        newW = Math.max(260, Math.min(window.innerWidth - 24, resizeStartRef.current.startW + dx));
      } else {
        newW = Math.max(260, Math.min(window.innerWidth - 24, resizeStartRef.current.startW - dx));
        newX = resizeStartRef.current.startXPos + (resizeStartRef.current.startW - newW);
      }

      // Strictly preserve 16:9 ratio for the video surface plus the mini-player bar height
      const newH = Math.round(newW * (9 / 16)) + resizeStartRef.current.headerH;

      if (resizeCorner === 'nw' || resizeCorner === 'ne') {
        newY = resizeStartRef.current.startYPos + (resizeStartRef.current.startH - newH);
      }

      const maxX = Math.max(8, window.innerWidth - newW - 8);
      const maxY = Math.max(8, window.innerHeight - newH - 8);
      setFloatSize({ width: newW, height: newH });
      setFloatPos({
        x: Math.max(8, Math.min(maxX, newX)),
        y: Math.max(8, Math.min(maxY, newY)),
      });
    };

    const onPointerUp = () => setResizeCorner(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [resizeCorner]);

  const [selectedTrack, setSelectedTrack] = useState<{
    videoId: string;
    title: string;
    index: number;
    total: number;
  } | null>(null);

  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrackItem[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistError, setPlaylistError] = useState('');
  const [playlistFilterQuery, setPlaylistFilterQuery] = useState('');
  const [activePlaylistTitle, setActivePlaylistTitle] = useState('Playlist');
  const [playlistSyncNonce, setPlaylistSyncNonce] = useState(0);

  const scrollActiveTrackIntoContainer = (
    container: HTMLDivElement | null,
    behavior: ScrollBehavior = 'auto'
  ) => {
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>('[data-active-track="true"]');
    if (!activeEl) return;
    let offsetTop = 0;
    let node: HTMLElement | null = activeEl;
    while (node && node !== container) {
      offsetTop += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    if (node !== container) {
      const cRect = container.getBoundingClientRect();
      const eRect = activeEl.getBoundingClientRect();
      offsetTop = container.scrollTop + (eRect.top - cRect.top);
    }
    container.scrollTo({
      top: Math.max(0, offsetTop - 4),
      behavior,
    });
  };

  useEffect(() => {
    const isMiniPlaylistOpen = activeMiniDrawer === 'playlist' && !playlistLoading && playlistTracks.length > 0;
    const justOpened = isMiniPlaylistOpen && !wasMiniPlaylistOpenRef.current;
    wasMiniPlaylistOpenRef.current = isMiniPlaylistOpen;

    if (!isMiniPlaylistOpen || !selectedTrack?.videoId) {
      pendingStepScrollRef.current = false;
      return;
    }

    if (justOpened || pendingStepScrollRef.current) {
      const behavior: ScrollBehavior = pendingStepScrollRef.current ? 'smooth' : 'auto';
      pendingStepScrollRef.current = false;
      const raf = window.requestAnimationFrame(() => {
        scrollActiveTrackIntoContainer(miniPlaylistScrollRef.current, behavior);
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [activeMiniDrawer, playlistLoading, playlistTracks, selectedTrack?.videoId]);

  useEffect(() => {
    const isModalReady = showPlaylistDrawer && !playlistLoading && playlistTracks.length > 0;
    const justOpened = isModalReady && !wasModalPlaylistOpenRef.current;
    wasModalPlaylistOpenRef.current = isModalReady;

    if (!isModalReady || !selectedTrack?.videoId || !justOpened) return;

    const raf = window.requestAnimationFrame(() => {
      scrollActiveTrackIntoContainer(modalPlaylistScrollRef.current, 'auto');
    });
    return () => window.cancelAnimationFrame(raf);
  }, [showPlaylistDrawer, playlistLoading, playlistTracks, selectedTrack?.videoId]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    setSelectedTrack(null);
    setCh4PlaybackStarted(false);
    if (!activeEvent && activeStation.kind === 'twitch') {
      setShowPlaylistDrawer(false);
    }
  }, [activeStation, activeEvent]);

  useEffect(() => {
    if (!showPlaylistDrawer) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPlaylistDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPlaylistDrawer]);

  const handleToggleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isTwitch = !activeEvent && activeStation.kind === 'twitch';

  useEffect(() => {
    if (
      activeMiniDrawer === 'playlist' &&
      (isTwitch ||
        (activeEvent
          ? activeEvent.kind !== 'youtube-playlist'
          : activeStation.kind !== 'youtube-playlist'))
    ) {
      setActiveMiniDrawer('none');
    }
  }, [activeMiniDrawer, isTwitch, activeEvent, activeStation.kind]);
  const ytAutoplay = autoplayEnabled ? '1' : '0';
  const playerOrigin = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin || '';
  }, []);
  const autoplayEnabledRef = useRef(autoplayEnabled);
  const selectedTrackRef = useRef(selectedTrack);
  const playlistTracksRef = useRef(playlistTracks);
  const lastEndedKeyRef = useRef('');

  useEffect(() => {
    autoplayEnabledRef.current = autoplayEnabled;
  }, [autoplayEnabled]);

  useEffect(() => {
    selectedTrackRef.current = selectedTrack;
    lastEndedKeyRef.current = '';
    if (!autoplayEnabled) {
      setCh4PlaybackStarted(false);
    }
  }, [selectedTrack, autoplayEnabled]);

  useEffect(() => {
    playlistTracksRef.current = playlistTracks;
  }, [playlistTracks]);

  const sendYtListeningHandshake = () => {
    const win = playerIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({ event: 'listening', id: 'md-yt-player', channel: 'widget' }),
        '*'
      );
      win.postMessage(
        JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
        '*'
      );
    } catch {
      // Ignore cross-origin postMessage errors
    }
  };

  useEffect(() => {
    if (isTwitch) return;

    const onWindowMessage = (event: MessageEvent) => {
      if (
        typeof event.origin === 'string' &&
        !event.origin.includes('youtube.com') &&
        !event.origin.includes('youtube-nocookie.com')
      ) {
        return;
      }

      let data: unknown = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      const payload = data as {
        event?: string;
        info?: number | { playerState?: number };
      };

      let playerState: number | undefined;
      if (payload.event === 'onStateChange' && typeof payload.info === 'number') {
        playerState = payload.info;
      } else if (
        (payload.event === 'infoDelivery' || payload.event === 'initialDelivery') &&
        payload.info &&
        typeof payload.info === 'object' &&
        typeof payload.info.playerState === 'number'
      ) {
        playerState = payload.info.playerState;
      }

      if (playerState === 1 || playerState === 3) {
        setCh4PlaybackStarted(true);
      }

      if (playerState === 0) {
        const cur = selectedTrackRef.current;
        const tracks = playlistTracksRef.current;
        if (cur && tracks.length > 1 && autoplayEnabledRef.current) {
          const trackKey = `${cur.index}:${cur.videoId}`;
          if (lastEndedKeyRef.current !== trackKey) {
            lastEndedKeyRef.current = trackKey;
            const nextIdx = (cur.index + 1) % tracks.length;
            const nextTrack = tracks[nextIdx];
            if (nextTrack) {
              pendingStepScrollRef.current = true;
              setSelectedTrack({
                videoId: nextTrack.videoId,
                title: nextTrack.title,
                index: nextIdx,
                total: tracks.length,
              });
            }
          }
        }
      }
    };

    const onWindowBlur = () => {
      if (
        activeStation.number === 4 &&
        !activeEvent &&
        document.activeElement === playerIframeRef.current
      ) {
        setCh4PlaybackStarted(true);
      }
    };

    window.addEventListener('message', onWindowMessage);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('message', onWindowMessage);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [isTwitch, activeStation.number, activeEvent]);

  const [twitchState, setTwitchState] = useState<{
    channelKey: string;
    loading: boolean;
    info: TwitchStatusInfo | null;
  }>(() => {
    const key = activeStation.callsign.toLowerCase();
    const cached = twitchStatusCache.get(key);
    return {
      channelKey: key,
      loading: !cached,
      info: cached ? cached.data : null,
    };
  });

  useEffect(() => {
    if (!isTwitch) return;
    const channel = activeStation.callsign;
    const key = channel.toLowerCase();
    let cancelled = false;

    const loadStatus = async (forceRefresh = false) => {
      const cached = twitchStatusCache.get(key);
      const isFresh = cached && Date.now() - cached.fetchedAt < 20_000;
      if (!forceRefresh && isFresh) {
        if (!cancelled) {
          setTwitchState({ channelKey: key, loading: false, info: cached.data });
        }
        return;
      }

      if (!cached && !cancelled) {
        setTwitchState({ channelKey: key, loading: true, info: null });
      } else if (cached && !cancelled) {
        setTwitchState({ channelKey: key, loading: false, info: cached.data });
      }

      try {
        const isLocalHost =
          typeof window !== 'undefined' &&
          window.location &&
          (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname) ||
           window.location.protocol === 'capacitor:' ||
           window.location.protocol === 'file:');
        const apiOrigin =
          typeof window !== 'undefined' &&
          window.location &&
          /^https?:/i.test(window.location.origin) &&
          !isLocalHost
            ? window.location.origin
            : 'https://mddashboard.onrender.com';
        const res = await fetch(
          `${apiOrigin}/api/twitch-status?channel=${encodeURIComponent(channel)}${
            forceRefresh ? '&force=1' : ''
          }`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TwitchStatusInfo;
        twitchStatusCache.set(key, { fetchedAt: Date.now(), data });
        if (!cancelled) {
          setTwitchState({ channelKey: key, loading: false, info: data });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setTwitchState((prev) =>
            prev.channelKey === key && prev.info
              ? { ...prev, loading: false }
              : {
                  channelKey: key,
                  loading: false,
                  info: {
                    isLive: false,
                    bannerImageUrl: null,
                    offlineImageUrl: null,
                    streamTitle: `ERR: ${apiOrigin} -> ${errMsg}`,
                    viewersCount: null,
                  },
                }
          );
        }
      }
    };

    loadStatus(false);
    const pollId = window.setInterval(() => loadStatus(true), 30_000);
    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        loadStatus(true);
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [isTwitch, activeStation.callsign]);

  const activeTwitchKey = activeStation.callsign.toLowerCase();
  const currentTwitchInfo =
    twitchState.channelKey === activeTwitchKey ? twitchState.info : null;
  const isCheckingTwitch =
    isTwitch && !selectedTrack && (twitchState.channelKey !== activeTwitchKey || twitchState.loading);
  const showTwitchOfflineBanner =
    isTwitch &&
    !selectedTrack &&
    !isCheckingTwitch &&
    currentTwitchInfo !== null &&
    !currentTwitchInfo.isLive;

  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);

  useEffect(() => {
    setBannerLoadFailed(false);
  }, [activeTwitchKey, currentTwitchInfo?.bannerImageUrl, currentTwitchInfo?.offlineImageUrl]);

  const stationFallbackBanners: Record<string, string> = {
    mdtv_ch1: '/samples/metro-eclipse-dark.jpg',
    mdmt_ch2: '/samples/sunset-glass.jpg',
    mdrs_ch3: '/samples/twilight-lagoon.jpg',
  };

  const twitchProfileBanner =
    (!bannerLoadFailed && (currentTwitchInfo?.bannerImageUrl || currentTwitchInfo?.offlineImageUrl)) ||
    currentTwitchInfo?.offlineImageUrl ||
    stationFallbackBanners[activeTwitchKey] ||
    '/samples/metro-eclipse-dark.jpg';

  const getCleanYoutubeMediaId = (item: PlayEventItem | null): { mediaId: string; isShorts: boolean } => {
    if (!item) return { mediaId: '', isShorts: false };
    if (item.url && item.url.includes('/shorts/')) {
      const parts = item.url.split('/shorts/');
      const sub = parts[1] ? parts[1].split('?')[0].split('/')[0] : item.mediaId;
      return { mediaId: sub, isShorts: true };
    }
    return { mediaId: item.mediaId, isShorts: item.kind === 'youtube-video' && item.url.includes('shorts') };
  };

  const cleanYt = getCleanYoutubeMediaId(activeEvent);
  const showChannel4Indicator =
    !activeEvent &&
    activeStation.number === 4 &&
    !autoplayEnabled &&
    !ch4PlaybackStarted;

  const activePlaylistId = useMemo(() => {
    if (activeEvent) {
      if (activeEvent.kind === 'youtube-playlist') return activeEvent.mediaId;
      return null;
    }
    if (activeStation.kind === 'youtube-playlist') {
      return activeStation.playlistId || null;
    }
    return null;
  }, [activeEvent, activeStation]);

  const defaultPlaylistTitle = useMemo(() => {
    if (activeEvent) return activeEvent.title;
    if (activeStation.kind === 'youtube-playlist') return activeStation.callsign;
    return activeStation.label;
  }, [activeEvent, activeStation]);

  const isChannel4Station = !activeEvent && activeStation.number === 4;
  const shouldFetchPlaylist =
    showPlaylistDrawer ||
    activeMiniDrawer === 'playlist' ||
    isChannel4Station ||
    (floatingEnabled && Boolean(activePlaylistId));

  useEffect(() => {
    if (!activePlaylistId) {
      setPlaylistTracks([]);
      setPlaylistLoading(false);
      setPlaylistError('');
      return;
    }

    const cached = playlistTrackCache.get(activePlaylistId);
    if (cached && playlistSyncNonce === 0) {
      setActivePlaylistTitle(cached.title || defaultPlaylistTitle);
      setPlaylistTracks(cached.items);
      setPlaylistLoading(false);
      setPlaylistError('');
      return;
    }

    if (!shouldFetchPlaylist) {
      setPlaylistTracks([]);
      return;
    }

    let cancelled = false;
    setPlaylistTracks([]);
    setPlaylistLoading(true);
    setPlaylistError('');

    fetch(
      `/api/youtube-playlist?list=${encodeURIComponent(activePlaylistId)}&_t=${Date.now()}`,
      { cache: 'no-store' }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data: { title?: string; items?: PlaylistTrackItem[]; error?: string }) => {
        if (cancelled) return;
        if (data.error && (!data.items || data.items.length === 0)) {
          setPlaylistError(data.error);
        } else {
          const resolvedTitle = data.title || defaultPlaylistTitle;
          const items = data.items || [];
          playlistTrackCache.set(activePlaylistId, { title: resolvedTitle, items });
          setActivePlaylistTitle(resolvedTitle);
          setPlaylistTracks(items);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPlaylistError('Unable to load video tracklist for this playlist.');
      })
      .finally(() => {
        if (!cancelled) setPlaylistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchPlaylist, activePlaylistId, defaultPlaylistTitle, playlistSyncNonce]);

  const filteredPlaylistTracks = useMemo(() => {
    const q = playlistFilterQuery.trim().toLowerCase();
    if (!q) return playlistTracks;
    return playlistTracks.filter((t) => t.title.toLowerCase().includes(q));
  }, [playlistTracks, playlistFilterQuery]);

  const handleStepTrack = (delta: number) => {
    if (!selectedTrack || playlistTracks.length === 0) return;
    const nextIdx =
      (selectedTrack.index + delta + playlistTracks.length) % playlistTracks.length;
    const nextTrack = playlistTracks[nextIdx];
    if (nextTrack) {
      pendingStepScrollRef.current = true;
      setSelectedTrack({
        videoId: nextTrack.videoId,
        title: nextTrack.title,
        index: nextIdx,
        total: playlistTracks.length,
      });
    }
  };

  const ytJsApiQuery = playerOrigin
    ? `&enablejsapi=1&origin=${encodeURIComponent(playerOrigin)}`
    : '&enablejsapi=1';

  const playerSrc = selectedTrack
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        selectedTrack.videoId
      )}?autoplay=${ytAutoplay}&rel=0${ytJsApiQuery}`
    : activeEvent
    ? cleanYt.isShorts || activeEvent.kind === 'youtube-video'
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          cleanYt.mediaId || activeEvent.mediaId
        )}?autoplay=${ytAutoplay}&rel=0${ytJsApiQuery}`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
          activeEvent.mediaId
        )}&autoplay=${ytAutoplay}${ytJsApiQuery}`
    : isTwitch
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(
        activeStation.callsign
      )}&parent=${encodeURIComponent(parentHost)}&muted=false&autoplay=true`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
        activeStation.playlistId || ''
      )}&autoplay=${ytAutoplay}${ytJsApiQuery}`;

  const rawExternalUrl = selectedTrack
    ? `https://www.youtube.com/watch?v=${selectedTrack.videoId}`
    : activeEvent
    ? activeEvent.url
    : activeStation.url;
  const externalUrl = normalizeShortsToWatchUrl(rawExternalUrl);
  const externalLabel = isTwitch && !selectedTrack && !activeEvent ? 'twitch' : 'youtube';

  const activeEventIndex = activeEvent
    ? allPlayEvents.findIndex((e) => e.id === activeEvent.id)
    : -1;

  const yearEndItems = useMemo(
    () =>
      allPlayEvents.filter(
        (e) =>
          e.era === 'Year End Collection' ||
          e.era === 'Standalone' ||
          !e.era
      ),
    [allPlayEvents]
  );

  const eraSummaries = useMemo(() => {
    const folderEras = Array.from(
      new Set([
        ...ERA_FOLDERS,
        ...allPlayEvents
          .map((e) => e.era)
          .filter(
            (era) =>
              Boolean(era) &&
              era !== 'Year End Collection' &&
              era !== 'Standalone'
          ),
      ])
    );
    return folderEras
      .map((era) => {
        const items = allPlayEvents.filter((e) => e.era === era);
        if (items.length === 0) return null;
        const years = Array.from(new Set(items.map((e) => e.year)));
        const yearLabel =
          years.length === 1 ? years[0] : `${years[0]}–${years[years.length - 1]}`;
        return {
          era,
          count: items.length,
          years,
          yearLabel,
        };
      })
      .filter((x): x is { era: string; count: number; years: string[]; yearLabel: string } => Boolean(x));
  }, [allPlayEvents]);

  const yearsInCurrentEra = useMemo(() => {
    if (!currentEra) return [];
    const items = allPlayEvents.filter((e) => e.era === currentEra);
    const years = Array.from(new Set(items.map((e) => e.year)));
    return years.map((yr) => ({
      year: yr,
      items: items.filter((e) => e.year === yr),
    }));
  }, [currentEra, allPlayEvents]);

  const eventsInCurrentYear = useMemo(() => {
    if (!currentEra || !currentYear) return [];
    return allPlayEvents.filter(
      (e) => e.era === currentEra && e.year === currentYear
    );
  }, [currentEra, currentYear, allPlayEvents]);

  const handleStepEvent = (delta: number) => {
    if (allPlayEvents.length === 0) return;
    if (activeEventIndex === -1) {
      onSelectEvent(allPlayEvents[0]);
      return;
    }
    const nextIdx =
      (activeEventIndex + delta + allPlayEvents.length) % allPlayEvents.length;
    onSelectEvent(allPlayEvents[nextIdx]);
  };

  const handleGoUp = () => {
    if (currentYear) {
      setCurrentYear(null);
    } else if (currentEra) {
      setCurrentEra(null);
    }
  };

  const renderPlayerInner = (mode: 'docked' | 'floating' | 'mobile-split') => {
    const isFloatingMini = mode === 'floating';
    const isMobileSplit = mode === 'mobile-split';
    const isCompactOverlay = isFloatingMini || isMobileSplit;
    const showFullscreenSwipeDrawer = isFullscreen;
    const canShowMiniDrawer = isCompactOverlay || showFullscreenSwipeDrawer;
    const swipeGestureMode: 'floating' | 'mobile-split' =
      isFloatingMini && !isFullscreen ? 'floating' : 'mobile-split';

    const isMiniCompactHeight = miniDrawerDims.height < 168;
    const hideMiniCallsigns =
      miniDrawerDims.height < 186 ||
      miniDrawerDims.width < 134 ||
      (!isFullscreen && isMobileSplit && mobileSplitCompact);
    const isMiniWide = miniDrawerDims.width >= 165;
    const showFloatingPlaylistBtn = !isTwitch && Boolean(activePlaylistId);
    const miniExternalText =
      isTwitch && !selectedTrack && !activeEvent ? 'Open Twitch' : 'Open YouTube';

    return (
    <section
      ref={
        isFloatingMini
          ? floatingContainerRef
          : isMobileSplit
          ? mobileSplitRef
          : dockedSectionRef
      }
      data-no-drawer-swipe={isCompactOverlay ? 'true' : undefined}
      onTouchStart={
        isCompactOverlay
          ? (e) => {
              const t = e.touches[0];
              if (t) {
                handleMiniSwipeStart(t.clientX, t.clientY, e.currentTarget);
              }
            }
          : undefined
      }
      onTouchMove={
        isCompactOverlay
          ? (e) => {
              const t = e.touches[0];
              if (t && isCompactOverlay) {
                handleMiniSwipeMove(
                  t.clientX,
                  t.clientY,
                  isFloatingMini ? 'floating' : 'mobile-split'
                );
              }
            }
          : undefined
      }
      onTouchEnd={isCompactOverlay ? handleMiniSwipeEnd : undefined}
      onTouchCancel={isCompactOverlay ? handleMiniSwipeEnd : undefined}
      style={
        isFloatingMini
          ? {
              ...(floatPos
                ? { left: `${floatPos.x}px`, top: `${floatPos.y}px`, bottom: 'auto', right: 'auto' }
                : {}),
              ...(floatSize
                ? { width: `${floatSize.width}px`, height: `${floatSize.height}px` }
                : {}),
              overflow: 'hidden',
              minWidth: '280px',
              minHeight: '179px',
              maxWidth: '92vw',
              maxHeight: '90vh',
            }
          : undefined
      }
      className={
        isFloatingMini
          ? `fixed z-40 w-[340px] md:w-[400px] h-[222px] md:h-[258px] rounded-2xl border border-slate-700/80 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl flex flex-col ${
              !floatPos ? 'bottom-20 lg:bottom-5 right-5' : ''
            }`
          : isMobileSplit
          ? 'fixed inset-x-0 bottom-14 z-35 border-t border-slate-700/90 bg-slate-950/98 text-white shadow-[0_-12px_32px_rgba(2,6,23,0.45)] backdrop-blur-xl flex flex-col'
          : 'aero-glass overflow-hidden rounded-3xl p-3 sm:p-4'
      }
    >
      {/* 4 Corner Resize Handles preserving 16:9 (desktop & tablet floating player only) */}
      {isFloatingMini && (
        <>
          <div
            onPointerDown={(e) => handleResizePointerDown('nw', e)}
            aria-hidden="true"
            className="absolute top-0 left-0 w-3.5 h-3.5 cursor-nwse-resize z-50 bg-transparent border-0 outline-none select-none touch-none"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('ne', e)}
            aria-hidden="true"
            className="absolute top-0 right-0 w-3.5 h-3.5 cursor-nesw-resize z-50 bg-transparent border-0 outline-none select-none touch-none"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('sw', e)}
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-3.5 h-3.5 cursor-nesw-resize z-50 bg-transparent border-0 outline-none select-none touch-none"
          />
          <div
            onPointerDown={(e) => handleResizePointerDown('se', e)}
            aria-hidden="true"
            className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize z-50 bg-transparent border-0 outline-none select-none touch-none"
          />
        </>
      )}

      {/* Compact Floating / Mobile Split Bar */}
      <div
        ref={miniHeaderRef}
        onPointerDown={isFloatingMini ? handleFloatingDragPointerDown : undefined}
        className={
          isCompactOverlay
            ? `relative z-40 flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] bg-slate-900/95 border-b border-white/10 select-none shrink-0 ${
                isFloatingMini ? 'cursor-move touch-none' : ''
              }`
            : 'hidden'
        }
      >
        {/* Top-left corner: Channel / Callsign / Playlist */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              showTwitchOfflineBanner ? 'bg-slate-400' : 'bg-rose-500 animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="font-mono font-semibold truncate text-slate-100">
            {selectedTrack
              ? selectedTrack.title
              : activeEvent
              ? activeEvent.title
              : `CH 0${activeStation.number} · ${activeStation.callsign}`}
          </span>
        </div>

        {/* Top-right corner (from left): Remote, Playlist (YouTube only), Settings, Close/Restore */}
        <div className="flex items-center gap-1 shrink-0">
          {isMobileSplit && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMobileSplitCompact((prev) => !prev)}
              title={mobileSplitCompact ? 'Expand split player' : 'Compact split player'}
              aria-label={mobileSplitCompact ? 'Expand split player' : 'Compact split player'}
              className="relative group inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
            >
              {mobileSplitCompact ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg border border-white/10 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
              >
                {mobileSplitCompact ? 'Expand' : 'Compact'}
              </span>
            </button>
          )}

          {/* Remote Control Drawer Toggle (includes CH 1-4 + Play Event list navigation) */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => toggleMiniDrawer('remote')}
            aria-pressed={activeMiniDrawer === 'remote'}
            title="Remote"
            aria-label="Remote"
            className={`relative group inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
              activeMiniDrawer === 'remote'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
            }`}
          >
            <RemoteIcon className="h-3.5 w-3.5 shrink-0" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg border border-white/10 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
            >
              Remote
            </span>
          </button>

          {/* Playlist Drawer Toggle (YouTube playlists only; hidden on Twitch) */}
          {showFloatingPlaylistBtn && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => toggleMiniDrawer('playlist')}
              aria-pressed={activeMiniDrawer === 'playlist'}
              title="Playlist"
              aria-label="Playlist"
              className={`relative group inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
                activeMiniDrawer === 'playlist'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              <ListVideo className="h-3.5 w-3.5 shrink-0" />
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg border border-white/10 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
              >
                Playlist
              </span>
            </button>
          )}

          {/* Player Settings Drawer Toggle (Restore, Fullscreen, Open Twitch/YouTube) */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => toggleMiniDrawer('settings')}
            aria-pressed={activeMiniDrawer === 'settings'}
            title="Settings"
            aria-label="Settings"
            className={`relative group inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
              activeMiniDrawer === 'settings'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg border border-white/10 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
            >
              Settings
            </span>
          </button>

          {/* Close / Restore */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onToggleFloating?.()}
            title={
              isActiveTab && floatingEnabled
                ? 'Restore'
                : isMobileSplit
                ? 'Close split player'
                : 'Close floating player'
            }
            aria-label={
              isActiveTab && floatingEnabled
                ? 'Restore'
                : isMobileSplit
                ? 'Close split player'
                : 'Close floating player'
            }
            className="relative group inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-50 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg border border-white/10 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100"
            >
              {isActiveTab && floatingEnabled ? 'Restore' : 'Close'}
            </span>
          </button>
        </div>
      </div>

      {/* Full Player Toolbar (shown on Live tab) */}
      <div
        className={
          isCompactOverlay
            ? 'hidden'
            : 'mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-300'
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedTrack ? (
            <span className="font-mono font-semibold tabular-nums truncate max-w-[240px] sm:max-w-[420px] text-sky-800 dark:text-sky-200">
              #{selectedTrack.index + 1}/{selectedTrack.total}: {selectedTrack.title}
            </span>
          ) : (
            <span className="font-mono font-semibold tabular-nums truncate max-w-[240px] sm:max-w-[420px]">
              {activeEvent
                ? `/${
                    activeEvent.era === 'Year End Collection'
                      ? activeEvent.title
                      : `${activeEvent.era}/${activeEvent.year}/${activeEvent.title}`
                  } (${activeEvent.dateLabel})`
                : `CH 0${activeStation.number} · ${activeStation.callsign}`}
            </span>
          )}
          {selectedTrack && (
            <button
              type="button"
              onClick={() => setSelectedTrack(null)}
              title="Return to continuous playlist playback"
              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Full Playlist</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTrack && playlistTracks.length > 0 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepTrack(-1)}
                aria-label="Previous Video in Playlist"
                title="Previous Video in Playlist"
                className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
                >
                  Previous Video
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleStepTrack(1)}
                aria-label="Next Video in Playlist"
                title="Next Video in Playlist"
                className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
                >
                  Next Video
                </span>
              </button>
            </div>
          ) : activeEvent && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepEvent(-1)}
                aria-label="Previous Event"
                title="Previous Event"
                className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
                >
                  Previous Event
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleStepEvent(1)}
                aria-label="Next Event"
                title="Next Event"
                className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
                >
                  Next Event
                </span>
              </button>
            </div>
          )}

          {/* Autoplay: Play icon + On/Off Switch (YouTube only) */}
          {!isTwitch && (
            <button
              type="button"
              role="switch"
              aria-checked={autoplayEnabled}
              aria-label={autoplayEnabled ? 'Autoplay: On' : 'Autoplay: Off'}
              title={autoplayEnabled ? 'Autoplay: On' : 'Autoplay: Off'}
              onClick={() => setAutoplayEnabled((prev) => !prev)}
              className={`relative group inline-flex h-8 items-center gap-2 rounded-xl border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoplayEnabled
                  ? 'border-sky-400/70 bg-sky-50/90 text-sky-700 dark:border-sky-500/50 dark:bg-sky-950/60 dark:text-sky-200'
                  : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <Play className="h-3.5 w-3.5 shrink-0" />
              <span
                aria-hidden="true"
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 ${
                  autoplayEnabled
                    ? 'bg-sky-600 dark:bg-sky-500'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    autoplayEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
              >
                {autoplayEnabled ? 'Autoplay: On' : 'Autoplay: Off'}
              </span>
            </button>
          )}

          {/* Floating Player (Desktop/Tablet) / Bottom Split View (Mobile) */}
          <button
            type="button"
            onClick={() => {
              if (dockedSectionRef.current) {
                setDockedHeight(dockedSectionRef.current.offsetHeight);
              }
              if (!floatingEnabled && onToggleFloating) {
                onToggleFloating();
              }
            }}
            aria-label={isDesktopOrTablet ? 'Floating Player' : 'Bottom Split View'}
            title={isDesktopOrTablet ? 'Floating Player' : 'Bottom Split View'}
            className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-sky-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 shrink-0 cursor-pointer"
          >
            {isDesktopOrTablet ? (
              <PictureInPicture2 className="h-4 w-4" />
            ) : (
              <PanelBottom className="h-4 w-4" />
            )}
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
            >
              {isDesktopOrTablet ? 'Floating Player' : 'Bottom Split View'}
            </span>
          </button>

          {/* Playlist (icon only) */}
          {!isTwitch && Boolean(activePlaylistId) && (
            <button
              type="button"
              onClick={() => setShowPlaylistDrawer(true)}
              aria-label="Playlist"
              title="Playlist"
              className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-sky-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 shrink-0 cursor-pointer"
            >
              <ListVideo className="h-4 w-4" />
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
              >
                Playlist
              </span>
            </button>
          )}

          {/* Fullscreen (icon only) */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label="Fullscreen"
            title="Fullscreen"
            className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shrink-0 cursor-pointer"
          >
            <Maximize2 className="h-4 w-4" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-30 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
            >
              Fullscreen
            </span>
          </button>

          {/* Open External YouTube / Twitch (icon only) */}
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={externalLabel}
            title={externalLabel}
            className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full right-0 z-30 mt-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
            >
              {externalLabel}
            </span>
          </a>
        </div>
      </div>

      {/* Player Surface + Optional Right-Side Remote Control Drawer */}
      <div
        ref={playerContainerRef}
        onTouchStart={
          showFullscreenSwipeDrawer
            ? (e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeStart(t.clientX, t.clientY, e.currentTarget);
              }
            : undefined
        }
        onTouchMove={
          showFullscreenSwipeDrawer
            ? (e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeMove(t.clientX, t.clientY, swipeGestureMode);
              }
            : undefined
        }
        onTouchEnd={showFullscreenSwipeDrawer ? handleMiniSwipeEnd : undefined}
        onTouchCancel={showFullscreenSwipeDrawer ? handleMiniSwipeEnd : undefined}
        className={`relative overflow-hidden bg-slate-950 flex flex-row items-stretch ${
          isFullscreen
            ? 'h-full w-full'
            : isFloatingMini
            ? 'flex-1 w-full min-h-0'
            : isMobileSplit
            ? mobileSplitCompact
              ? 'w-full h-[126px] transition-[height] duration-200'
              : 'w-full aspect-video max-h-[34dvh] transition-[height] duration-200'
            : 'w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 aspect-video lg:aspect-auto lg:h-[calc((100vw_-_442px)_*_9_/_16)] xl:h-[calc((min(100vw,1380px)_-_538px)_*_9_/_16)]'
        }`}
      >
        {/* Video Viewport (automatically scales down when Remote Control opens on right side) */}
        <div className="relative flex-1 min-w-0 h-full overflow-hidden bg-slate-950 flex items-center justify-center">
          {/* Left-edge swipe-right strip on Floating Player to expand Remote Control without iframe touch interception */}
          {isFloatingMini && (
            <div
              aria-hidden="true"
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeStart(t.clientX, t.clientY, null, true);
              }}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeMove(t.clientX, t.clientY, 'floating');
              }}
              onTouchEnd={handleMiniSwipeEnd}
              className="absolute inset-y-0 left-0 w-5 z-25 bg-transparent touch-pan-y"
            />
          )}

          {/* Right-edge swipe-left handle strip on Compact Overlay (Floating / Mobile Split) */}
          {isCompactOverlay && !isFullscreen && (
            <div
              aria-hidden="true"
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeStart(t.clientX, t.clientY, null, true);
              }}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (t) {
                  handleMiniSwipeMove(t.clientX, t.clientY, swipeGestureMode);
                }
              }}
              onTouchEnd={handleMiniSwipeEnd}
              onTouchCancel={handleMiniSwipeEnd}
              className="absolute inset-y-4 right-0 w-7 z-25 flex items-center justify-end pr-0.5 touch-pan-y"
            >
              <span className="h-8 w-1 rounded-full bg-white/30" />
            </div>
          )}

          {/* Fullscreen Drawer Launcher: Right-edge Hover (Desktop) & Tap / Swipe-Left Pull-Tab (Mobile/Touch) */}
          {isFullscreen && activeMiniDrawer === 'none' && (
            <div
              onPointerEnter={(e) => {
                if (e.pointerType !== 'touch') {
                  clearFsDockTimer();
                  setFsDockOpen(true);
                }
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== 'touch') {
                  scheduleFsDockAutoHide(220);
                }
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeStart(t.clientX, t.clientY, null, true);
              }}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (t) handleMiniSwipeMove(t.clientX, t.clientY, 'mobile-split');
              }}
              onTouchEnd={handleMiniSwipeEnd}
              onTouchCancel={handleMiniSwipeEnd}
              className="absolute top-16 bottom-16 right-0 z-30 flex items-center justify-end touch-pan-y"
            >
              {fsDockOpen ? (
                <div
                  role="toolbar"
                  aria-label="Fullscreen drawer controls"
                  className="flex flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-white/15 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-xl md-animate-fade-in"
                >
                  <button
                    type="button"
                    onClick={() => {
                      clearFsDockTimer();
                      setFsDockOpen(false);
                      setActiveMiniDrawer('remote');
                    }}
                    title="Remote"
                    aria-label="Remote"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-100 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <RemoteIcon className="h-4 w-4" />
                  </button>
                  {showFloatingPlaylistBtn && (
                    <button
                      type="button"
                      onClick={() => {
                        clearFsDockTimer();
                        setFsDockOpen(false);
                        setActiveMiniDrawer('playlist');
                      }}
                      title="Playlist"
                      aria-label="Playlist"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-100 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <ListVideo className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      clearFsDockTimer();
                      setFsDockOpen(false);
                      setActiveMiniDrawer('settings');
                    }}
                    title="Settings"
                    aria-label="Settings"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-100 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearFsDockTimer();
                      setFsDockOpen(false);
                    }}
                    title="Hide drawer dock"
                    aria-label="Hide drawer dock"
                    className="hidden [@media(hover:none)]:inline-flex h-7 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFsDockOpen(true);
                    scheduleFsDockAutoHide(4000);
                  }}
                  title="Open Remote, Playlist & Settings drawer"
                  aria-label="Open player drawer controls"
                  className="group flex h-full w-6 items-center justify-end pr-1 bg-transparent cursor-pointer focus:outline-none"
                >
                  <span className="flex h-14 w-1.5 items-center justify-center rounded-full bg-white/35 shadow-[0_0_10px_rgba(0,0,0,0.65)] transition-all group-hover:h-16 group-hover:w-2 group-hover:bg-sky-400/90" />
                </button>
              )}
            </div>
          )}

          {isCheckingTwitch ? (
            <div className="flex h-full w-full items-center justify-center bg-slate-950">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div
              style={{ containerType: 'size' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="relative flex items-center justify-center overflow-hidden bg-black"
                style={
                  isTwitch && !selectedTrack && currentTwitchInfo?.isLive
                    ? {
                        width: 'min(100cqw, calc(100cqh * 16 / 9))',
                        height: 'min(100cqh, calc(100cqw * 9 / 16))',
                      }
                    : isTwitch && !selectedTrack
                    ? { width: '100%', height: '100%' }
                    : activeEvent && !selectedTrack && cleanYt.isShorts
                    ? {
                        width: 'min(100cqw, calc(100cqh * 9 / 16))',
                        height: 'min(100cqh, calc(100cqw * 16 / 9))',
                      }
                    : {
                        width: 'min(100cqw, calc(100cqh * 16 / 9))',
                        height: 'min(100cqh, calc(100cqw * 9 / 16))',
                      }
                }
              >
                {showTwitchOfflineBanner && (
                  <div className="absolute top-3 right-3 z-20 pointer-events-none rounded bg-black/85 px-2.5 py-1 text-right font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-400 border border-amber-500/50 shadow-xl backdrop-blur-md">
                    <div className="text-white">{activeStation.callsign}</div>
                    <div className="text-[10px] text-rose-500 animate-pulse tracking-wider">OFFLINE</div>
                  </div>
                )}

                {showChannel4Indicator && (
                  <div className="pointer-events-none absolute top-3 right-3 z-20">
                    <div
                      className={`shrink-0 rounded bg-black/85 text-right font-mono font-extrabold uppercase tracking-widest text-sky-400 border border-sky-400/50 shadow-xl backdrop-blur-md ${
                        isCompactOverlay ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                      }`}
                    >
                      <div className="text-white">VOD_CH4</div>
                      <div
                        className={`text-emerald-400 tracking-wider ${
                          isCompactOverlay ? 'text-[9px]' : 'text-[10px]'
                        }`}
                      >
                        ON DEMAND
                      </div>
                    </div>
                  </div>
                )}

                {showTwitchOfflineBanner && twitchProfileBanner ? (
                  <img
                    src={twitchProfileBanner}
                    alt={`${activeStation.callsign} profile banner`}
                    referrerPolicy="no-referrer"
                    onError={() => setBannerLoadFailed(true)}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <iframe
                    ref={playerIframeRef}
                    key={playerSrc}
                    src={playerSrc}
                    onLoad={() => {
                      if (!isTwitch) {
                        sendYtListeningHandshake();
                        window.setTimeout(sendYtListeningHandshake, 250);
                        window.setTimeout(sendYtListeningHandshake, 800);
                      }
                    }}
                    title={
                      selectedTrack
                        ? selectedTrack.title
                        : activeEvent
                        ? activeEvent.title
                        : `${activeStation.label} (${activeStation.callsign})`
                    }
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    className={`h-full w-full border-0 relative z-0 ${
                      isDragging || resizeCorner !== null ? 'pointer-events-none' : ''
                    }`}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Responsive Right-Side Drawer inside Floating / Mobile Split / Mobile Fullscreen Player */}
        {canShowMiniDrawer && (
          <aside
            ref={miniDrawerRef}
            aria-label={
              activeMiniDrawer === 'playlist'
                ? 'Floating Playlist Drawer'
                : activeMiniDrawer === 'settings'
                ? 'Floating Player Settings Drawer'
                : 'Remote Control Drawer'
            }
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) handleMiniSwipeStart(t.clientX, t.clientY, e.currentTarget);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) handleMiniSwipeMove(t.clientX, t.clientY, swipeGestureMode);
            }}
            onTouchEnd={handleMiniSwipeEnd}
            onTouchCancel={handleMiniSwipeEnd}
            style={{
              width:
                activeMiniDrawer === 'remote'
                  ? remoteBrowsePlayEvents
                    ? isFullscreen && isDesktopOrTablet
                      ? 'clamp(180px, 32%, 310px)'
                      : 'clamp(146px, 44%, 270px)'
                    : isFullscreen && isDesktopOrTablet
                    ? 'clamp(150px, 26%, 250px)'
                    : 'clamp(112px, 36%, 220px)'
                  : activeMiniDrawer === 'settings'
                  ? isFullscreen && isDesktopOrTablet
                    ? 'clamp(160px, 28%, 280px)'
                    : 'clamp(124px, 38%, 260px)'
                  : activeMiniDrawer === 'playlist'
                  ? isFullscreen && isDesktopOrTablet
                    ? 'clamp(190px, 34%, 330px)'
                    : 'clamp(144px, 44%, 280px)'
                  : '0px',
            }}
            className={`shrink-0 overflow-hidden bg-slate-900/95 flex flex-col transition-[width,padding,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeMiniDrawer !== 'none'
                ? `${isMiniCompactHeight ? 'p-1.5' : 'p-2'} border-l border-white/10 opacity-100`
                : 'border-l-0 p-0 opacity-0 pointer-events-none'
            }`}
          >
            {/* Fullscreen Drawer Switcher & Close Header (shown when top bar is outside fullscreen surface) */}
            {isFullscreen && activeMiniDrawer !== 'none' && (
              <div className="mb-1.5 flex items-center justify-between gap-1 border-b border-white/10 pb-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveMiniDrawer('remote')}
                    aria-pressed={activeMiniDrawer === 'remote'}
                    title="Remote"
                    aria-label="Remote"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      activeMiniDrawer === 'remote'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <RemoteIcon className="h-3.5 w-3.5" />
                  </button>
                  {showFloatingPlaylistBtn && (
                    <button
                      type="button"
                      onClick={() => setActiveMiniDrawer('playlist')}
                      aria-pressed={activeMiniDrawer === 'playlist'}
                      title="Playlist"
                      aria-label="Playlist"
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        activeMiniDrawer === 'playlist'
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      <ListVideo className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveMiniDrawer('settings')}
                    aria-pressed={activeMiniDrawer === 'settings'}
                    title="Settings"
                    aria-label="Settings"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      activeMiniDrawer === 'settings'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMiniDrawer('none')}
                  title="Close drawer"
                  aria-label="Close drawer"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex-1 min-h-0">
            {activeMiniDrawer === 'remote' && !remoteBrowsePlayEvents && (() => {
              const fsChannelBtnHeight = isMiniCompactHeight
                ? 42
                : Math.min(82, Math.max(54, Math.round(miniDrawerDims.height * 0.12)));
              const fsPlayEventBtnHeight = isMiniCompactHeight
                ? 38
                : Math.min(64, Math.max(46, Math.round(miniDrawerDims.height * 0.095)));

              const keypadContent = (
                <div
                  className={`grid w-full grid-cols-2 min-w-0 ${
                    isFullscreen ? 'shrink-0' : 'h-full grid-rows-3 min-h-0'
                  } ${
                    isMiniCompactHeight
                      ? 'gap-1'
                      : miniDrawerDims.height >= 300
                      ? 'gap-2'
                      : 'gap-1.5'
                  }`}
                >
                  {STATIONS.map((station) => {
                    const isSelected =
                      !activeEvent && activeStation.callsign === station.callsign;
                    const isMiniSpacious =
                      miniDrawerDims.height >= 320 && miniDrawerDims.width >= 165;
                    return (
                      <button
                        key={`mini-remote-${station.callsign}`}
                        type="button"
                        onClick={() => onSelectStation(station)}
                        aria-label={`${station.label} — ${station.callsign}`}
                        style={
                          isFullscreen
                            ? { height: `${fsChannelBtnHeight}px` }
                            : undefined
                        }
                        className={`flex w-full flex-col items-center justify-center rounded-xl border px-1.5 py-1 text-center transition-colors cursor-pointer min-w-0 min-h-0 ${
                          isFullscreen ? '' : 'h-full'
                        } ${
                          isSelected
                            ? 'aero-button-primary border-transparent text-white shadow-sm'
                            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/15'
                        }`}
                      >
                        <span
                          className={`font-display font-bold leading-none tabular-nums ${
                            isMiniSpacious
                              ? 'text-lg sm:text-xl'
                              : isMiniWide
                              ? 'text-sm sm:text-base'
                              : 'text-xs sm:text-sm'
                          }`}
                        >
                          {station.number}
                        </span>
                        {!hideMiniCallsigns && (
                          <span
                            className={`max-w-full truncate font-mono font-semibold leading-normal ${
                              isMiniSpacious
                                ? 'mt-1.5 text-[10px]'
                                : 'mt-1 text-[8.5px] sm:text-[9.5px]'
                            } ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}
                          >
                            {station.callsign}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* 5th Button below Channel 4: Play Event (opens List View playlist navigation inside drawer) */}
                  <button
                    type="button"
                    onClick={() => setRemoteBrowsePlayEvents(true)}
                    aria-label="Play Event Playlists"
                    title="Browse Play Event playlists"
                    style={
                      isFullscreen
                        ? { height: `${fsPlayEventBtnHeight}px` }
                        : undefined
                    }
                    className={`col-span-2 flex w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-1 text-center transition-colors cursor-pointer min-w-0 min-h-0 ${
                      isFullscreen ? '' : 'h-full'
                    } ${
                      activeEvent
                        ? 'aero-button-primary border-transparent text-white shadow-sm'
                        : 'border-sky-400/35 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25'
                    }`}
                  >
                    <ListVideo
                      className={`shrink-0 ${
                        miniDrawerDims.height >= 320 && miniDrawerDims.width >= 165
                          ? 'h-4 w-4'
                          : 'h-3.5 w-3.5'
                      }`}
                    />
                    <span
                      className={`font-display font-bold leading-normal py-0.5 whitespace-nowrap ${
                        isMiniCompactHeight
                          ? 'text-[10.5px]'
                          : miniDrawerDims.height >= 320 && miniDrawerDims.width >= 165
                          ? 'text-xs sm:text-sm'
                          : 'text-[11px] sm:text-xs'
                      }`}
                    >
                      Play Event
                    </span>
                  </button>
                </div>
              );

              if (!isFullscreen) {
                return keypadContent;
              }

              return (
                <div className="flex h-full w-full flex-col justify-start overflow-y-auto pt-1">
                  {keypadContent}
                </div>
              );
            })()}

            {activeMiniDrawer === 'remote' && remoteBrowsePlayEvents && (
              <div className="flex h-full flex-col gap-1 min-h-0 text-[11px]">
                {/* Folder Navigation Header inside Remote Control */}
                <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1 shrink-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentYear) {
                          setCurrentYear(null);
                        } else if (currentEra) {
                          setCurrentEra(null);
                        } else {
                          setRemoteBrowsePlayEvents(false);
                        }
                      }}
                      title={
                        currentEra || currentYear
                          ? 'Up one folder'
                          : 'Back to Channels'
                      }
                      aria-label={
                        currentEra || currentYear
                          ? 'Up one folder'
                          : 'Back to Channels'
                      }
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-slate-200 hover:bg-white/20 cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </button>
                    <span className="truncate font-mono text-[10px] font-bold text-white">
                      {currentYear
                        ? `${currentEra} / ${currentYear}`
                        : currentEra || 'Play Event'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(currentEra || currentYear) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentEra(null);
                          setCurrentYear(null);
                        }}
                        title="Back to home"
                        aria-label="Back to home"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-slate-200 hover:bg-white/20 cursor-pointer"
                      >
                        <Home className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRemoteBrowsePlayEvents(false)}
                      title="Back to Channels 1–4"
                      aria-label="Back to Channels 1–4"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-sky-300 hover:bg-white/20 cursor-pointer"
                    >
                      <RemoteIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Play Event List View inside Remote Drawer */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-white/10 pr-0.5">
                  {!currentEra && (
                    <>
                      {eraSummaries.map((folder) => {
                        const hasActiveInside = activeEvent?.era === folder.era;
                        return (
                          <button
                            key={`mini-era-${folder.era}`}
                            type="button"
                            onClick={() => {
                              setCurrentEra(folder.era);
                              setCurrentYear(null);
                            }}
                            className={`flex w-full items-center justify-between gap-1.5 text-left transition-colors cursor-pointer ${
                              isMiniCompactHeight ? 'px-1.5 py-1' : 'px-2 py-1.5'
                            } ${
                              hasActiveInside
                                ? 'bg-sky-500/20 text-sky-100'
                                : 'text-slate-200 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                              <div className="min-w-0">
                                <div className="truncate font-display text-[10.5px] font-bold leading-tight">
                                  {folder.era}
                                </div>
                                {!isMiniCompactHeight && (
                                  <div className="font-mono text-[8.5px] text-slate-400 tabular-nums truncate">
                                    {folder.yearLabel} · {folder.count}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                          </button>
                        );
                      })}

                      {yearEndItems.map((rootEv) => {
                        const isSelected = activeEvent?.id === rootEv.id;
                        return (
                          <button
                            key={`mini-root-${rootEv.id}`}
                            type="button"
                            onClick={() => onSelectEvent(rootEv)}
                            className={`flex w-full items-center justify-between gap-1.5 text-left transition-colors cursor-pointer ${
                              isMiniCompactHeight ? 'px-1.5 py-1' : 'px-2 py-1.5'
                            } ${
                              isSelected
                                ? 'aero-button-primary text-white'
                                : 'text-slate-200 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ListVideo
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  isSelected ? 'text-white' : 'text-sky-400'
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="truncate font-display text-[10.5px] font-bold leading-snug">
                                  {rootEv.title}
                                </div>
                                {!isMiniCompactHeight && (rootEv.dateLabel || rootEv.year) && (
                                  <div
                                    className={`font-mono text-[8.5px] truncate ${
                                      isSelected ? 'text-sky-100' : 'text-slate-400'
                                    }`}
                                  >
                                    {rootEv.dateLabel || rootEv.year}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Play className="h-2.5 w-2.5 shrink-0 opacity-85" />
                          </button>
                        );
                      })}
                    </>
                  )}

                  {currentEra &&
                    !currentYear &&
                    yearsInCurrentEra.map((yrGroup) => {
                      const hasActiveInside =
                        activeEvent?.era === currentEra &&
                        activeEvent?.year === yrGroup.year;
                      return (
                        <button
                          key={`mini-yr-${yrGroup.year}`}
                          type="button"
                          onClick={() => setCurrentYear(yrGroup.year)}
                          className={`flex w-full items-center justify-between gap-1.5 text-left transition-colors cursor-pointer ${
                            isMiniCompactHeight ? 'px-1.5 py-1' : 'px-2 py-1.5'
                          } ${
                            hasActiveInside
                              ? 'bg-sky-500/20 text-sky-100'
                              : 'text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-bold tabular-nums leading-snug">
                                {yrGroup.year}
                              </div>
                              {!isMiniCompactHeight && (
                                <div className="text-[8.5px] text-slate-400 tabular-nums">
                                  {yrGroup.items.length}{' '}
                                  {yrGroup.items.length === 1 ? 'event' : 'events'}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                        </button>
                      );
                    })}

                  {currentEra &&
                    currentYear &&
                    eventsInCurrentYear.map((ev) => {
                      const isSelected = activeEvent?.id === ev.id;
                      return (
                        <button
                          key={`mini-ev-${ev.id}`}
                          type="button"
                          onClick={() => onSelectEvent(ev)}
                          className={`flex w-full items-center justify-between gap-1.5 text-left transition-colors cursor-pointer ${
                            isMiniCompactHeight ? 'px-1.5 py-1' : 'px-2 py-1.5'
                          } ${
                            isSelected
                              ? 'aero-button-primary text-white'
                              : 'text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <ListVideo
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? 'text-white' : 'text-sky-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-display text-[10.5px] font-bold leading-snug">
                                {ev.title}
                              </div>
                              {!isMiniCompactHeight && ev.dateLabel && (
                                <div
                                  className={`font-mono text-[8.5px] tabular-nums truncate ${
                                    isSelected ? 'text-sky-100' : 'text-slate-400'
                                  }`}
                                >
                                  {ev.dateLabel}
                                </div>
                              )}
                            </div>
                          </div>
                          <Play className="h-2.5 w-2.5 shrink-0 opacity-85" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {activeMiniDrawer === 'settings' && (() => {
              const useTwoColSettings = miniDrawerDims.width >= 180;
              const isSpaciousSettings = miniDrawerDims.height >= 260;
              const tileMinHeight = isMiniCompactHeight
                ? undefined
                : useTwoColSettings
                ? Math.min(88, Math.max(46, Math.round(miniDrawerDims.height * 0.25)))
                : Math.min(56, Math.max(36, Math.round(miniDrawerDims.height * 0.17)));
              return (
                <div className="flex h-full flex-col justify-center overflow-y-auto text-[11px]">
                  <div className="mx-auto w-full max-w-[260px]">
                    {!isMiniCompactHeight && (
                      <div
                        className={`px-1 font-mono font-bold uppercase tracking-wider text-slate-400 ${
                          isSpaciousSettings ? 'mb-2 text-[10px]' : 'mb-1.5 text-[9.5px]'
                        }`}
                      >
                        Settings
                      </div>
                    )}

                    <div
                      className={`grid w-full ${
                        useTwoColSettings ? 'grid-cols-2' : 'grid-cols-1'
                      } ${
                        isMiniCompactHeight
                          ? 'gap-1'
                          : isSpaciousSettings
                          ? 'gap-2'
                          : 'gap-1.5'
                      }`}
                    >
                      {/* Restore */}
                      {floatingEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMiniDrawer('none');
                            if (document.fullscreenElement) {
                              document.exitFullscreen().catch(() => {});
                            }
                            onToggleFloating?.();
                            if (!isActiveTab) {
                              onGoToLive?.();
                            }
                          }}
                          style={tileMinHeight ? { minHeight: `${tileMinHeight}px` } : undefined}
                          className={`flex w-full items-center rounded-xl border border-white/10 bg-white/5 font-semibold text-slate-100 transition-colors hover:bg-white/15 cursor-pointer min-w-0 ${
                            useTwoColSettings
                              ? 'flex-col justify-center gap-1.5 px-2 py-2 text-center'
                              : isMiniCompactHeight
                              ? 'justify-start gap-1.5 px-2 py-1 text-left text-[10.5px]'
                              : 'justify-start gap-2 px-2.5 py-2 text-left text-[11px]'
                          }`}
                        >
                          {isDesktopOrTablet ? (
                            <PictureInPicture2
                              className={`shrink-0 text-sky-400 ${
                                useTwoColSettings && isSpaciousSettings
                                  ? 'h-4 w-4'
                                  : 'h-3.5 w-3.5'
                              }`}
                            />
                          ) : (
                            <PanelBottom
                              className={`shrink-0 text-sky-400 ${
                                useTwoColSettings && isSpaciousSettings
                                  ? 'h-4 w-4'
                                  : 'h-3.5 w-3.5'
                              }`}
                            />
                          )}
                          <span
                            className={`max-w-full truncate ${
                              useTwoColSettings && isSpaciousSettings ? 'text-xs' : ''
                            }`}
                          >
                            Restore
                          </span>
                        </button>
                      )}

                      {/* Fullscreen */}
                      <button
                        type="button"
                        onClick={handleToggleFullscreen}
                        style={tileMinHeight ? { minHeight: `${tileMinHeight}px` } : undefined}
                        className={`flex w-full items-center rounded-xl border border-white/10 bg-white/5 font-semibold text-slate-100 transition-colors hover:bg-white/15 cursor-pointer min-w-0 ${
                          useTwoColSettings
                            ? 'flex-col justify-center gap-1.5 px-2 py-2 text-center'
                            : isMiniCompactHeight
                            ? 'justify-start gap-1.5 px-2 py-1 text-left text-[10.5px]'
                            : 'justify-start gap-2 px-2.5 py-2 text-left text-[11px]'
                        }`}
                      >
                        <Maximize2
                          className={`shrink-0 text-slate-300 ${
                            useTwoColSettings && isSpaciousSettings
                              ? 'h-4 w-4'
                              : 'h-3.5 w-3.5'
                          }`}
                        />
                        <span
                          className={`max-w-full truncate ${
                            useTwoColSettings && isSpaciousSettings ? 'text-xs' : ''
                          }`}
                        >
                          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        </span>
                      </button>

                      {/* Open Twitch / Open YouTube */}
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={tileMinHeight ? { minHeight: `${tileMinHeight}px` } : undefined}
                        className={`flex w-full items-center rounded-xl border border-white/10 bg-white/5 font-semibold text-slate-100 transition-colors hover:bg-white/15 min-w-0 ${
                          useTwoColSettings
                            ? `${
                                floatingEnabled ? 'col-span-2 flex-row' : 'flex-col'
                              } justify-center gap-2 px-3 py-2 text-center`
                            : isMiniCompactHeight
                            ? 'justify-start gap-1.5 px-2 py-1 text-left text-[10.5px]'
                            : 'justify-start gap-2 px-2.5 py-2 text-left text-[11px]'
                        }`}
                      >
                        <ExternalLink
                          className={`shrink-0 text-slate-300 ${
                            useTwoColSettings && isSpaciousSettings
                              ? 'h-4 w-4'
                              : 'h-3.5 w-3.5'
                          }`}
                        />
                        <span
                          className={`max-w-full truncate ${
                            useTwoColSettings && isSpaciousSettings ? 'text-xs' : ''
                          }`}
                        >
                          {miniExternalText}
                        </span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeMiniDrawer === 'playlist' && showFloatingPlaylistBtn && (
              <div className="flex h-full flex-col gap-1.5 min-h-0 text-[11px]">
                <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1 shrink-0">
                  <div className="min-w-0">
                    {activePlaylistId ? (
                      <a
                        href={`https://www.youtube.com/playlist?list=${encodeURIComponent(activePlaylistId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-display text-[11px] font-bold text-white hover:text-sky-300 hover:underline block"
                        title="Open full playlist on YouTube"
                      >
                        {activePlaylistTitle || 'Playlist'}
                      </a>
                    ) : (
                      <div className="truncate font-display text-[11px] font-bold text-white">
                        {activePlaylistTitle || 'Playlist'}
                      </div>
                    )}
                    {!isMiniCompactHeight && (
                      <div className="font-mono text-[9px] text-slate-400 tabular-nums">
                        {playlistLoading
                          ? 'Syncing...'
                          : `${playlistTracks.length} tracks`}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedTrack && (
                      <button
                        type="button"
                        onClick={() => setSelectedTrack(null)}
                        title="Return to full playlist"
                        aria-label="Return to full playlist"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-sky-300 hover:bg-white/20 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPlaylistSyncNonce((n) => n + 1)}
                      disabled={playlistLoading}
                      title="Sync YouTube playlist"
                      aria-label="Sync YouTube playlist"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-slate-200 hover:bg-white/20 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${playlistLoading ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {playlistLoading && playlistTracks.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                    <span className="text-[10px]">Syncing playlist...</span>
                  </div>
                ) : playlistError && playlistTracks.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center px-1">
                    <p className="text-[10px] text-rose-300">{playlistError}</p>
                    <button
                      type="button"
                      onClick={() => setPlaylistSyncNonce((n) => n + 1)}
                      className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/20 cursor-pointer"
                    >
                      Retry Sync
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      ref={miniPlaylistScrollRef}
                      className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-1 pr-0.5"
                    >
                      {playlistTracks.map((item, idx) => {
                        const isCurrent = selectedTrack?.videoId === item.videoId;
                        return (
                          <button
                            key={`mini-pl-${item.videoId}`}
                            type="button"
                            data-active-track={isCurrent ? 'true' : undefined}
                            onClick={() =>
                              setSelectedTrack({
                                videoId: item.videoId,
                                title: item.title,
                                index: idx,
                                total: playlistTracks.length,
                              })
                            }
                            className={`flex w-full items-start gap-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                              isMiniCompactHeight ? 'px-1.5 py-0.5' : 'px-1.5 py-1'
                            } ${
                              isCurrent
                                ? 'aero-button-primary text-white shadow-sm'
                                : 'bg-white/5 text-slate-200 hover:bg-white/15'
                            }`}
                          >
                            <span
                              className={`font-mono text-[9.5px] font-bold shrink-0 pt-0.5 tabular-nums ${
                                isCurrent ? 'text-sky-100' : 'text-slate-400'
                              }`}
                            >
                              {idx + 1}.
                            </span>
                            <span
                              className={`line-clamp-2 font-medium leading-snug min-w-0 ${
                                isMiniWide ? 'text-[10.5px]' : 'text-[10px]'
                              }`}
                            >
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedTrack && playlistTracks.length > 1 && (
                      <div className="flex items-center justify-between gap-1 border-t border-white/10 pt-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStepTrack(-1)}
                          aria-label="Previous video"
                          className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-md bg-white/10 py-1 text-[10px] font-semibold text-white hover:bg-white/20 cursor-pointer"
                        >
                          <ChevronLeft className="h-3 w-3" />
                          <span>Prev</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepTrack(1)}
                          aria-label="Next video"
                          className="inline-flex flex-1 items-center justify-center gap-0.5 rounded-md bg-white/10 py-1 text-[10px] font-semibold text-white hover:bg-white/20 cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
          </aside>
        )}
      </div>

      {/* Playlist Drawer Modal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden={!showPlaylistDrawer}
            className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md transition-[opacity,visibility] duration-300 ease-out ${
              showPlaylistDrawer
                ? 'opacity-100 visible pointer-events-auto'
                : 'opacity-0 invisible pointer-events-none'
            }`}
            onClick={() => setShowPlaylistDrawer(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="YouTube Playlist Videos"
              className={`aero-glass relative flex flex-col w-full max-w-2xl h-[82dvh] max-h-[82dvh] sm:h-[85vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/60 dark:border-slate-700/80 overflow-hidden transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showPlaylistDrawer
                  ? 'translate-y-0 sm:scale-100 opacity-100'
                  : 'translate-y-full sm:translate-y-6 sm:scale-95 opacity-0'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/75 shrink-0">
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300">
                    <ListVideo className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    {activePlaylistId ? (
                      <a
                        href={`https://www.youtube.com/playlist?list=${encodeURIComponent(activePlaylistId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate hover:text-sky-600 dark:hover:text-sky-300 hover:underline block"
                        title="Open full playlist on YouTube"
                      >
                        {activePlaylistTitle || 'Playlist Videos'}
                      </a>
                    ) : (
                      <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {activePlaylistTitle || 'Playlist Videos'}
                      </h3>
                    )}
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      {playlistTracks.length > 0
                        ? `${playlistTracks.length} individual videos`
                        : playlistLoading
                        ? 'Syncing latest playlist...'
                        : 'Video Tracklist'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {activePlaylistId && (
                    <button
                      type="button"
                      onClick={() => setPlaylistSyncNonce((n) => n + 1)}
                      disabled={playlistLoading}
                      title="Sync latest videos & order from YouTube"
                      aria-label="Sync playlist"
                      className="inline-flex h-8 w-8 sm:w-auto sm:px-2.5 items-center justify-center gap-1 rounded-xl border border-slate-200/90 bg-white/85 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${playlistLoading ? 'animate-spin' : ''}`}
                      />
                      <span className="hidden sm:inline">Sync</span>
                    </button>
                  )}
                  {activePlaylistId && (
                    <a
                      href={`https://www.youtube.com/playlist?list=${encodeURIComponent(activePlaylistId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open full playlist on YouTube"
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPlaylistDrawer(false)}
                    aria-label="Close playlist"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shrink-0 shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {isTwitch && !activeEvent ? (
                <div className="flex-1 overflow-y-auto p-6 text-center space-y-3 flex flex-col justify-center items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 dark:bg-purple-500/25 dark:text-purple-300">
                    <Tv className="h-6 w-6" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    Currently streaming {activeStation.callsign} on Twitch
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Twitch channels stream a continuous live feed. To browse and select individual YouTube playlist videos, switch to Channel 4 or a Play Event below:
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const ch4 = STATIONS.find((s) => s.number === 4) || STATIONS[3];
                        onSelectStation(ch4);
                        setShowPlaylistDrawer(true);
                      }}
                      className="aero-button-primary rounded-xl px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Switch to Channel 4 (VOD_ch4)
                    </button>
                    {allPlayEvents[0] && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEvent(allPlayEvents[0]);
                          setShowPlaylistDrawer(true);
                        }}
                        className="rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        Browse {allPlayEvents[0].title}
                      </button>
                    )}
                  </div>
                </div>
              ) : activeEvent?.kind === 'youtube-video' && !activePlaylistId ? (
                <div className="flex-1 overflow-y-auto p-6 text-center space-y-3 flex flex-col justify-center items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-300">
                    <Play className="h-6 w-6" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {activeEvent.title} is a Single Video
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    This item is registered as an individual video rather than a multi-track playlist.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEvent =
                        allPlayEvents.find((e) => e.kind === 'youtube-playlist') ||
                        allPlayEvents[0];
                      if (nextEvent) onSelectEvent(nextEvent);
                      setShowPlaylistDrawer(true);
                    }}
                    className="aero-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Open Playlist Events
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-4 sm:px-6 py-2 bg-white/40 dark:bg-slate-900/40 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={playlistFilterQuery}
                        onChange={(e) => setPlaylistFilterQuery(e.target.value)}
                        placeholder={`Search within ${playlistTracks.length > 0 ? `${playlistTracks.length} videos` : 'playlist'}...`}
                        className="w-full rounded-xl border border-slate-200/90 bg-white/90 py-1.5 sm:py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-white"
                      />
                      {playlistFilterQuery && (
                        <button
                          type="button"
                          onClick={() => setPlaylistFilterQuery('')}
                          aria-label="Clear search"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    ref={modalPlaylistScrollRef}
                    className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-2 divide-y divide-slate-200/70 dark:divide-slate-800/80"
                  >
                    {playlistLoading ? (
                      <div className="py-12 text-center space-y-3">
                        <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600 dark:text-sky-400" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Syncing all videos from YouTube...
                        </p>
                      </div>
                    ) : playlistError && playlistTracks.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                          {playlistError}
                        </p>
                        {activePlaylistId && (
                          <a
                            href={`https://www.youtube.com/playlist?list=${activePlaylistId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aero-button-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                          >
                            <span>Open Playlist on YouTube</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ) : filteredPlaylistTracks.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No videos matching “{playlistFilterQuery}”.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 py-1">
                        {filteredPlaylistTracks.map((item, idx) => {
                          const originalIdx = playlistTracks.findIndex((t) => t.videoId === item.videoId);
                          const isCurrentPlaying = selectedTrack?.videoId === item.videoId;
                          return (
                            <button
                              key={item.videoId}
                              type="button"
                              data-active-track={isCurrentPlaying ? 'true' : undefined}
                              onClick={() => {
                                setSelectedTrack({
                                  videoId: item.videoId,
                                  title: item.title,
                                  index: originalIdx >= 0 ? originalIdx : idx,
                                  total: playlistTracks.length,
                                });
                                setShowPlaylistDrawer(false);
                              }}
                              className={`flex w-full items-center justify-between gap-2.5 sm:gap-3 p-2 sm:p-2.5 text-left transition-colors cursor-pointer rounded-2xl ${
                                isCurrentPlaying
                                  ? 'aero-button-primary text-white shadow-sm'
                                  : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <span
                                  className={`font-mono text-xs font-bold w-6 sm:w-7 shrink-0 text-center ${
                                    isCurrentPlaying ? 'text-sky-100' : 'text-slate-400'
                                  }`}
                                >
                                  {originalIdx >= 0 ? originalIdx + 1 : idx + 1}
                                </span>
                                <div className="relative aspect-video h-11 sm:h-12 shrink-0 overflow-hidden rounded-xl bg-black border border-slate-200/70 dark:border-slate-700/60 shadow-sm">
                                  <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    loading="lazy"
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="line-clamp-2 font-display text-xs sm:text-sm font-semibold">
                                    {item.title}
                                  </div>
                                  <div
                                    className={`font-mono text-[10px] mt-0.5 truncate ${
                                      isCurrentPlaying ? 'text-sky-100' : 'text-slate-400'
                                    }`}
                                  >
                                    ID: {item.videoId}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 pl-1 sm:pl-2">
                                {isCurrentPlaying ? (
                                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap">
                                    Playing
                                  </span>
                                ) : (
                                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:bg-sky-400/20 dark:text-sky-300">
                                    <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 shrink-0 text-xs pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <span className="truncate text-slate-600 dark:text-slate-300 font-medium text-[11px] sm:text-xs">
                      {selectedTrack
                        ? `#${selectedTrack.index + 1}: ${selectedTrack.title}`
                        : `${playlistTracks.length} videos in playlist`}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedTrack && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTrack(null);
                            setShowPlaylistDrawer(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shadow-sm whitespace-nowrap"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Full Playlist</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPlaylistDrawer(false)}
                        className="aero-button-primary rounded-xl px-4 py-1.5 text-xs font-semibold text-white cursor-pointer shadow-sm whitespace-nowrap"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Remote Control Buttons */}
      <div
        role="tablist"
        aria-label="Remote Control"
        className={
          isCompactOverlay
            ? 'hidden'
            : isSidebarCollapsed
            ? 'mt-3 grid grid-cols-4 gap-2'
            : 'mt-3 grid grid-cols-4 gap-2 lg:hidden'
        }
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
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-1.5 py-2.5 text-center transition-colors cursor-pointer min-w-0 ${
                isSelected
                  ? 'aero-button-primary border-transparent text-white'
                  : 'border-slate-200/90 bg-white/80 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100'
              }`}
            >
              <span className="font-display text-lg sm:text-xl font-bold leading-none tabular-nums">
                {station.number}
              </span>
              <span
                className={`max-w-full truncate font-mono text-[10px] sm:text-xs font-semibold leading-tight ${
                  isSelected ? 'text-sky-100' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {station.callsign}
              </span>
            </button>
          );
        })}
      </div>
    </section>
    );
  };

  if (!isActiveTab && !floatingEnabled) {
    return null;
  }

  const compactOverlayMode: 'floating' | 'mobile-split' = isDesktopOrTablet
    ? 'floating'
    : 'mobile-split';
  const currentPlayerMode: 'docked' | 'floating' | 'mobile-split' =
    floatingEnabled ? compactOverlayMode : 'docked';

  return (
    <div className={isActiveTab ? 'flex flex-col gap-6' : ''}>
      {/* Persistent Player Node (never changes React position across float/split toggles or tab navigation) */}
      {renderPlayerInner(currentPlayerMode)}

      {/* Placeholder Void Card (shown on Live tab while player is floating or split) */}
      <section
        aria-hidden={!(isActiveTab && floatingEnabled)}
        style={
          isActiveTab && floatingEnabled && dockedHeight
            ? { minHeight: `${dockedHeight}px` }
            : undefined
        }
        className={
          isActiveTab && floatingEnabled
            ? 'aero-glass overflow-hidden rounded-3xl p-3 sm:p-4 flex flex-col'
            : 'hidden'
        }
      >
        <div
          aria-hidden="true"
          className="mb-3 flex min-h-8 items-center justify-between gap-2 px-1 text-xs invisible pointer-events-none select-none"
        >
          <span className="h-8" />
        </div>

        <div className="w-full flex-1 rounded-2xl border border-dashed border-sky-400/40 bg-sky-500/5 flex flex-col justify-center items-center text-center space-y-3 p-4 aspect-video lg:aspect-auto lg:h-[calc((100vw_-_442px)_*_9_/_16)] xl:h-[calc((min(100vw,1380px)_-_538px)_*_9_/_16)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300">
            {isDesktopOrTablet ? (
              <PictureInPicture2 className="h-6 w-6" />
            ) : (
              <PanelBottom className="h-6 w-6" />
            )}
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            {isDesktopOrTablet
              ? 'Video currently playing in floating player'
              : 'Video pinned to bottom split view'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {isDesktopOrTablet
              ? 'You can drag or resize the floating player anywhere on desktop or tablet screens. It keeps playing when you navigate other tabs.'
              : 'The live player is docked at the bottom of your screen so you can scroll events or other tabs above it.'}
          </p>
          <button
            type="button"
            onClick={() => onToggleFloating?.()}
            className="aero-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer shadow-sm"
          >
            Restore
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Remote Control"
          className={
            isSidebarCollapsed
              ? 'mt-3 grid grid-cols-4 gap-2'
              : 'mt-3 grid grid-cols-4 gap-2 lg:hidden'
          }
        >
          {STATIONS.map((station) => {
            const isSelected = !activeEvent && activeStation.callsign === station.callsign;
            return (
              <button
                key={`void-remote-${station.callsign}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${station.label} — ${station.callsign}`}
                onClick={() => onSelectStation(station)}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-1.5 py-2.5 text-center transition-colors cursor-pointer min-w-0 ${
                  isSelected
                    ? 'aero-button-primary border-transparent text-white'
                    : 'border-slate-200/90 bg-white/80 text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100'
                }`}
              >
                <span className="font-display text-lg sm:text-xl font-bold leading-none tabular-nums">
                  {station.number}
                </span>
                <span
                  className={`max-w-full truncate font-mono text-[10px] sm:text-xs font-semibold leading-tight ${
                    isSelected ? 'text-sky-100' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {station.callsign}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Play Event Folder Directory inside a Scrollable Container */}
      <section
        ref={playEventSectionRef}
        aria-hidden={!isActiveTab}
        className={isActiveTab ? 'aero-glass scroll-mt-20 rounded-3xl p-5 sm:p-6 space-y-4' : 'hidden'}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Play Event
            </h2>
            <div
              role="group"
              aria-label="Play Event view mode"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white/75 p-1 dark:border-slate-700 dark:bg-slate-900/70"
            >
              <button
                type="button"
                onClick={() => setEventViewMode('list')}
                aria-pressed={eventViewMode === 'list'}
                title="List view"
                aria-label="List view"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  eventViewMode === 'list'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Rows3 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setEventViewMode('tiles')}
                aria-pressed={eventViewMode === 'tiles'}
                title="Tiles horizontal view"
                aria-label="Tiles view"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  eventViewMode === 'tiles'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* File Explorer Frame */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/75 dark:border-slate-700/80 dark:bg-slate-900/65">
          {/* Address / Breadcrumb Bar */}
          <div className="flex items-center gap-1.5 border-b border-slate-200/80 bg-slate-100/70 px-3 py-2 text-xs dark:border-slate-700/80 dark:bg-slate-950/60">
            <button
              type="button"
              onClick={handleGoUp}
              disabled={!currentEra && !currentYear}
              title="Up one folder"
              aria-label="Up one folder"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer disabled:cursor-default"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentEra(null);
                setCurrentYear(null);
              }}
              disabled={!currentEra && !currentYear}
              title="Back to home"
              aria-label="Back to home"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer disabled:cursor-default"
            >
              <Home className="h-3.5 w-3.5" />
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
          <div
            className={
              eventViewMode === 'tiles'
                ? 'max-h-[340px] overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
                : 'max-h-[300px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/80'
            }
          >
            {!currentEra && (
              <>
                {eraSummaries.map((folder) => {
                  const hasActiveInside = activeEvent?.era === folder.era;
                  if (eventViewMode === 'tiles') {
                    return (
                      <button
                        key={folder.era}
                        type="button"
                        onClick={() => {
                          setCurrentEra(folder.era);
                          setCurrentYear(null);
                        }}
                        className={`group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                          hasActiveInside
                            ? 'border-sky-500/80 bg-sky-500/10 shadow-sm ring-2 ring-sky-500/30 dark:bg-sky-500/15'
                            : 'border-slate-200/80 bg-white/70 hover:bg-white hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 group-hover:scale-105 transition-transform dark:bg-amber-400/20 dark:text-amber-300">
                          <Folder className="h-6 w-6 fill-amber-500/20" />
                        </div>
                        <div className="mt-2.5 truncate font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white max-w-full">
                          {folder.era}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] sm:text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                          {folder.yearLabel} · {folder.count} items
                        </div>
                      </button>
                    );
                  }

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

                {yearEndItems.map((rootEv) =>
                  eventViewMode === 'tiles' ? (
                    <button
                      key={rootEv.id}
                      type="button"
                      onClick={() => onSelectEvent(rootEv)}
                      className={`group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                        activeEvent?.id === rootEv.id
                          ? 'aero-button-primary border-transparent text-white shadow-md'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${
                          activeEvent?.id === rootEv.id
                            ? 'bg-white/20 text-white'
                            : 'bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300'
                        }`}
                      >
                        <ListVideo className="h-6 w-6" />
                      </div>
                      <div
                        className={`mt-2.5 truncate font-display text-xs sm:text-sm font-bold max-w-full ${
                          activeEvent?.id === rootEv.id ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {rootEv.title}
                      </div>
                      {(rootEv.dateLabel || rootEv.year) && (
                        <div
                          className={`mt-0.5 font-mono text-[10px] sm:text-[11px] tabular-nums ${
                            activeEvent?.id === rootEv.id ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {rootEv.dateLabel || rootEv.year}
                        </div>
                      )}
                    </button>
                  ) : (
                    <button
                      key={rootEv.id}
                      type="button"
                      onClick={() => onSelectEvent(rootEv)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                        activeEvent?.id === rootEv.id
                          ? 'aero-button-primary text-white'
                          : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ListVideo
                          className={`h-4 w-4 shrink-0 ${
                            activeEvent?.id === rootEv.id
                              ? 'text-white'
                              : 'text-sky-600 dark:text-sky-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-display text-sm font-bold">
                            {rootEv.title}
                          </div>
                          {(rootEv.dateLabel || rootEv.year) && (
                            <div
                              className={`font-mono text-[11px] ${
                                activeEvent?.id === rootEv.id
                                  ? 'text-sky-100'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {rootEv.dateLabel || rootEv.year}
                            </div>
                          )}
                        </div>
                      </div>
                      <Play
                        className={`h-3.5 w-3.5 shrink-0 ${
                          activeEvent?.id === rootEv.id
                            ? 'text-white'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      />
                    </button>
                  )
                )}
              </>
            )}

            {currentEra && !currentYear &&
              yearsInCurrentEra.map((yrGroup) => {
                const hasActiveInside =
                  activeEvent?.era === currentEra &&
                  activeEvent?.year === yrGroup.year;

                if (eventViewMode === 'tiles') {
                  return (
                    <button
                      key={yrGroup.year}
                      type="button"
                      onClick={() => setCurrentYear(yrGroup.year)}
                      className={`group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                        hasActiveInside
                          ? 'border-sky-500/80 bg-sky-500/10 shadow-sm ring-2 ring-sky-500/30 dark:bg-sky-500/15'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 group-hover:scale-105 transition-transform dark:bg-amber-400/20 dark:text-amber-300">
                        <FolderOpen className="h-6 w-6 fill-amber-500/20" />
                      </div>
                      <div className="mt-2.5 font-mono text-base font-extrabold text-slate-900 tabular-nums dark:text-white">
                        {yrGroup.year}
                      </div>
                      <div className="mt-0.5 text-[10px] sm:text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                        {yrGroup.items.length} {yrGroup.items.length === 1 ? 'event' : 'events'}
                      </div>
                    </button>
                  );
                }

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

            {currentEra && currentYear &&
              eventsInCurrentYear.map((ev) => {
                const isSelected = activeEvent?.id === ev.id;

                if (eventViewMode === 'tiles') {
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className={`group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'aero-button-primary border-transparent text-white shadow-md'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300'
                        }`}
                      >
                        <ListVideo className="h-5 w-5" />
                      </div>
                      <div className="mt-2.5 w-full">
                        <div
                          className={`truncate font-display text-xs sm:text-sm font-bold ${
                            isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                        {ev.dateLabel && (
                          <div
                            className={`mt-0.5 font-mono text-[10px] sm:text-[11px] tabular-nums ${
                              isSelected ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {ev.dateLabel}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                }

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
                        {ev.dateLabel && (
                          <div
                            className={`font-mono text-[11px] tabular-nums ${
                              isSelected
                                ? 'text-sky-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {ev.dateLabel}
                          </div>
                        )}
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
