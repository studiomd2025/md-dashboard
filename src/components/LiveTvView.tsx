import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderOpen,
  LayoutGrid,
  ListVideo,
  Loader2,
  Maximize2,
  PictureInPicture2,
  Play,
  RefreshCw,
  RotateCcw,
  Rows3,
  Search,
  Tv,
  X,
} from 'lucide-react';
import { normalizeShortsToWatchUrl } from '../lib/mediaUtils';

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
  isActiveTab?: boolean;
  floatingEnabled?: boolean;
  onToggleFloating?: () => void;
  isSidebarCollapsed?: boolean;
}

export const LiveTvView: React.FC<LiveTvViewProps> = ({
  activeStation,
  activeEvent,
  onSelectStation,
  onSelectEvent,
  isActiveTab = true,
  floatingEnabled = true,
  onToggleFloating,
  isSidebarCollapsed = false,
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

  const [floatOnLiveTab, setFloatOnLiveTab] = useState(false);
  const [dockedHeight, setDockedHeight] = useState<number | null>(null);
  const dockedSectionRef = useRef<HTMLElement>(null);
  const miniHeaderRef = useRef<HTMLDivElement>(null);

  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [eventViewMode, setEventViewMode] = useState<'list' | 'tiles'>('list');
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [floatSize, setFloatSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
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
    if (!floatingEnabled) {
      setFloatOnLiveTab(false);
    }
  }, [floatingEnabled]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!floatingEnabled && !floatOnLiveTab) return;
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).closest('.fixed')?.getBoundingClientRect();
    const posX = rect ? rect.left : window.innerWidth - 380;
    const posY = rect ? rect.top : window.innerHeight - 260;
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, posX, posY };
  };

  const handleResizeStart = (corner: 'nw' | 'ne' | 'sw' | 'se', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeCorner(corner);
    const rect = (e.currentTarget as HTMLElement).closest('.fixed')?.getBoundingClientRect();
    const startW = rect ? rect.width : 380;
    const startH = rect ? rect.height : 247;
    const startXPos = rect ? rect.left : window.innerWidth - 400;
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
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setFloatPos({
        x: Math.max(10, Math.min(window.innerWidth - 200, dragStartRef.current.posX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 120, dragStartRef.current.posY + dy)),
      });
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!resizeCorner) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.startX;
      let newW = resizeStartRef.current.startW;
      let newX = resizeStartRef.current.startXPos;
      let newY = resizeStartRef.current.startYPos;

      if (resizeCorner === 'se' || resizeCorner === 'ne') {
        newW = Math.max(260, Math.min(window.innerWidth - 40, resizeStartRef.current.startW + dx));
      } else {
        newW = Math.max(260, Math.min(window.innerWidth - 40, resizeStartRef.current.startW - dx));
        newX = resizeStartRef.current.startXPos + (resizeStartRef.current.startW - newW);
      }

      // Strictly preserve 16:9 ratio for the video surface plus the mini-player bar height
      const newH = Math.round(newW * (9 / 16)) + resizeStartRef.current.headerH;

      if (resizeCorner === 'nw' || resizeCorner === 'ne') {
        newY = resizeStartRef.current.startYPos + (resizeStartRef.current.startH - newH);
      }

      setFloatSize({ width: newW, height: newH });
      setFloatPos({ x: newX, y: newY });
    };

    const onMouseUp = () => setResizeCorner(null);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
        const res = await fetch(
          `/api/twitch-status?channel=${encodeURIComponent(channel)}${
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
      } catch {
        if (!cancelled) {
          setTwitchState((prev) =>
            prev.channelKey === key && prev.info
              ? { ...prev, loading: false }
              : {
                  channelKey: key,
                  loading: false,
                  info: {
                    isLive: true,
                    bannerImageUrl: null,
                    offlineImageUrl: null,
                    streamTitle: null,
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
    !currentTwitchInfo.isLive &&
    Boolean(currentTwitchInfo.bannerImageUrl);

  const twitchProfileBanner = currentTwitchInfo?.bannerImageUrl || null;

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
  const shouldFetchPlaylist = showPlaylistDrawer || isChannel4Station;

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

  const renderPlayerInner = (isFloatingMini: boolean) => (
    <section
      ref={!isFloatingMini ? dockedSectionRef : undefined}
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
              minWidth: '260px',
              minHeight: '179px',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }
          : undefined
      }
      className={
        isFloatingMini
          ? `fixed z-40 w-[320px] sm:w-[380px] h-[213px] sm:h-[247px] rounded-2xl border border-slate-700/80 bg-slate-950/95 text-white shadow-2xl backdrop-blur-xl flex flex-col ${
              !floatPos ? 'bottom-5 right-5' : ''
            }`
          : 'aero-glass overflow-hidden rounded-3xl p-3 sm:p-4'
      }
    >
      {/* 4 Corner Resize Handles preserving 16:9 (invisible, no blue corners) */}
      {isFloatingMini && (
        <>
          <div
            onMouseDown={(e) => handleResizeStart('nw', e)}
            aria-hidden="true"
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50 bg-transparent border-0 outline-none select-none"
          />
          <div
            onMouseDown={(e) => handleResizeStart('ne', e)}
            aria-hidden="true"
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50 bg-transparent border-0 outline-none select-none"
          />
          <div
            onMouseDown={(e) => handleResizeStart('sw', e)}
            aria-hidden="true"
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50 bg-transparent border-0 outline-none select-none"
          />
          <div
            onMouseDown={(e) => handleResizeStart('se', e)}
            aria-hidden="true"
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 bg-transparent border-0 outline-none select-none"
          />
        </>
      )}

      {/* Compact Floating Mini-Player Bar (Draggable) */}
      <div
        ref={miniHeaderRef}
        onMouseDown={handleMouseDown}
        className={
          isFloatingMini
            ? 'flex items-center justify-between gap-2 px-3 py-2 text-[11px] bg-slate-900/95 border-b border-white/10 cursor-move select-none shrink-0'
            : 'hidden'
        }
      >
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
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (isActiveTab && floatOnLiveTab) {
                setFloatOnLiveTab(false);
              } else {
                onToggleFloating?.();
              }
            }}
            title={isActiveTab && floatOnLiveTab ? 'Restore' : 'Close floating player'}
            aria-label={isActiveTab && floatOnLiveTab ? 'Restore' : 'Close floating player'}
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Full Player Toolbar (shown on Live tab) */}
      <div
        className={
          isFloatingMini
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

          {/* Floating Player (icon only) */}
          <button
            type="button"
            onClick={() => {
              if (dockedSectionRef.current) {
                setDockedHeight(dockedSectionRef.current.offsetHeight);
              }
              if (!floatingEnabled && onToggleFloating) {
                onToggleFloating();
              }
              setFloatOnLiveTab(true);
            }}
            aria-label="Floating Player"
            title="Floating Player"
            className="relative group inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-sky-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 shrink-0 cursor-pointer"
          >
            <PictureInPicture2 className="h-4 w-4" />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-30 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 dark:bg-slate-800"
            >
              Floating Player
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

      {/* Player Surface */}
      <div
        ref={playerContainerRef}
        className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${
          isFloatingMini
            ? 'flex-1 w-full min-h-0'
            : isFullscreen
            ? 'h-full w-full'
            : 'w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 aspect-video lg:aspect-auto lg:h-[calc((100vw_-_442px)_*_9_/_16)] xl:h-[calc((min(100vw,1380px)_-_538px)_*_9_/_16)]'
        }`}
      >
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
                      isFloatingMini ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                    }`}
                  >
                    <div className="text-white">VOD_CH4</div>
                    <div
                      className={`text-emerald-400 tracking-wider ${
                        isFloatingMini ? 'text-[9px]' : 'text-[10px]'
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
                    <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {activePlaylistTitle || 'Playlist Videos'}
                    </h3>
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
                    <button
                      type="button"
                      onClick={() => {
                        onSelectEvent(PLAY_EVENTS[0]);
                        setShowPlaylistDrawer(true);
                      }}
                      className="rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      Browse {PLAY_EVENTS[0].title}
                    </button>
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
                      const nextEvent = PLAY_EVENTS.find((e) => e.kind === 'youtube-playlist') || PLAY_EVENTS[0];
                      onSelectEvent(nextEvent);
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

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-2 divide-y divide-slate-200/70 dark:divide-slate-800/80">
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
          isFloatingMini
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

  // If we are NOT on the live tab, render ONLY the floating mini-player overlay
  if (!isActiveTab) {
    if (!floatingEnabled) return null;
    return renderPlayerInner(true);
  }

  return (
    <div className="space-y-6">
      {/* If floating on the Live tab, render the floating player + exact-height void placeholder in original position */}
      {floatOnLiveTab ? (
        <>
          {renderPlayerInner(true)}
          <section
            style={dockedHeight ? { minHeight: `${dockedHeight}px` } : undefined}
            className="aero-glass overflow-hidden rounded-3xl p-3 sm:p-4 flex flex-col"
          >
            <div
              aria-hidden="true"
              className="mb-3 flex min-h-8 items-center justify-between gap-2 px-1 text-xs invisible pointer-events-none select-none"
            >
              <span className="h-8" />
            </div>

            <div className="w-full flex-1 rounded-2xl border border-dashed border-sky-400/40 bg-sky-500/5 flex flex-col justify-center items-center text-center space-y-3 p-4 aspect-video lg:aspect-auto lg:h-[calc((100vw_-_442px)_*_9_/_16)] xl:h-[calc((min(100vw,1380px)_-_538px)_*_9_/_16)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300 animate-pulse">
                <PictureInPicture2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Video currently playing in floating player
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You can drag or resize the floating player anywhere on screen. It will keep playing even when you navigate other tabs.
              </p>
              <button
                type="button"
                onClick={() => setFloatOnLiveTab(false)}
                className="aero-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white cursor-pointer shadow-sm"
              >
                Restore
              </button>
            </div>

            <div
              aria-hidden="true"
              className={`${
                isSidebarCollapsed ? 'mt-3 grid grid-cols-4 gap-2' : 'mt-3 grid grid-cols-4 gap-2 lg:hidden'
              } invisible pointer-events-none select-none`}
            >
              {STATIONS.map((station) => (
                <div
                  key={`void-spacer-${station.callsign}`}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-transparent px-1.5 py-2.5"
                >
                  <span className="font-display text-lg sm:text-xl font-bold leading-none">
                    {station.number}
                  </span>
                  <span className="font-mono text-[10px] sm:text-xs font-semibold leading-tight">
                    {station.callsign}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        renderPlayerInner(false)
      )}

      {/* Play Event Folder Directory inside a Scrollable Container */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6 space-y-4">
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

                {yearEndItem && (
                  eventViewMode === 'tiles' ? (
                    <button
                      key={yearEndItem.id}
                      type="button"
                      onClick={() => onSelectEvent(yearEndItem)}
                      className={`group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                        activeEvent?.id === yearEndItem.id
                          ? 'aero-button-primary border-transparent text-white shadow-md'
                          : 'border-slate-200/80 bg-white/70 hover:bg-white hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${
                          activeEvent?.id === yearEndItem.id
                            ? 'bg-white/20 text-white'
                            : 'bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300'
                        }`}
                      >
                        <ListVideo className="h-6 w-6" />
                      </div>
                      <div
                        className={`mt-2.5 truncate font-display text-xs sm:text-sm font-bold max-w-full ${
                          activeEvent?.id === yearEndItem.id ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {yearEndItem.title}
                      </div>
                      <div
                        className={`mt-0.5 font-mono text-[10px] sm:text-[11px] tabular-nums ${
                          activeEvent?.id === yearEndItem.id ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Archive Playlist
                      </div>
                    </button>
                  ) : (
                    <button
                      key={yearEndItem.id}
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
                      className={`group flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all cursor-pointer ${
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
                      <div className="mt-2 w-full">
                        <div
                          className={`truncate font-display text-xs sm:text-sm font-bold ${
                            isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                        <div
                          className={`mt-0.5 font-mono text-[10px] tabular-nums ${
                            isSelected ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {ev.dateLabel}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {ev.kind === 'youtube-video' ? 'Video' : 'Playlist'}
                        </span>
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
