import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileCode2,
  Image as ImageIcon,
  ImageOff,
  Maximize2,
  Palette,
  Pause,
  Pin,
  Play,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Tv,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import type { DesignSettings, EventCountdown, Post } from '../types';
import { formatPostTimestamp, getMergedPostTags, stripHtml } from '../lib/mediaUtils';
import { fetchJsonWithRetry } from '../lib/apiClient';
import { dateFilterBoundToMs, DEFAULT_TIME_ZONE } from '../lib/timeZones';
import { formatCountdownDisplay } from './Sidebar';
import { STATIONS, type BroadcastChannel } from './LiveTvView';
import {
  ANDROID_WIDGET_PACKAGE,
  ANDROID_WIDGET_TEMPLATES,
} from '../data/androidWidgetTemplates';
import { YmdDateInput } from './YmdDateInputs';
import { downloadWidgetCodeZip } from '../lib/downloadWidgetZip';
import {
  syncCountdownsToNative,
  syncCountdownSelectionToNative,
} from '../lib/widgetBridge';

interface MobileWidgetStudioViewProps {
  posts: Post[];
  countdowns: EventCountdown[];
  nowMs: number;
  design?: DesignSettings;
  activeStation?: BroadcastChannel;
  onOpenTimeline?: () => void;
  onOpenLive?: () => void;
  onOpenCountdown?: (countdownId: string) => void;
}

type LauncherWallpaperId = 'slate' | 'daylight' | 'amoled' | 'emerald' | 'sunset';
type WidgetId = 'countdown' | 'liveTile' | 'diaryCard' | 'feedCard';
type WidgetColorThemeId =
  | 'transparent'
  | 'slate'
  | 'midnight'
  | 'sky'
  | 'emerald'
  | 'rose'
  | 'lavender'
  | 'amber';
type WidgetSizeDims = { width: number; height: number };
type FeedFilterMode = 'all' | 'pinned' | 'tag' | 'date-range';
type FeedLayoutMode = 'horizontal' | 'list' | 'full';
type LiveSimMode = 'auto' | 'live' | 'offline';

const WALLPAPER_OPTIONS: {
  id: LauncherWallpaperId;
  label: string;
  isLightBackdrop: boolean;
  frameClass: string;
}[] = [
  {
    id: 'slate',
    label: 'Slate Studio',
    isLightBackdrop: false,
    frameClass:
      'bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-950 text-white',
  },
  {
    id: 'daylight',
    label: 'Daylight Sky',
    isLightBackdrop: true,
    frameClass:
      'bg-gradient-to-br from-sky-200 via-cyan-100 to-slate-200 text-slate-900',
  },
  {
    id: 'amoled',
    label: 'Midnight AMOLED',
    isLightBackdrop: false,
    frameClass:
      'bg-gradient-to-b from-neutral-950 via-slate-950 to-black text-white',
  },
  {
    id: 'emerald',
    label: 'Emerald Mesh',
    isLightBackdrop: false,
    frameClass:
      'bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-950 text-white',
  },
  {
    id: 'sunset',
    label: 'Warm Horizon',
    isLightBackdrop: false,
    frameClass:
      'bg-gradient-to-br from-rose-900 via-indigo-950 to-slate-950 text-white',
  },
];

const WIDGET_THEME_OPTIONS: {
  id: WidgetColorThemeId;
  label: string;
  swatchClass: string;
}[] = [
  {
    id: 'transparent',
    label: 'Adaptive Transparent',
    swatchClass:
      'bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_50%,rgba(148,163,184,0.35)_50%)] border-slate-400',
  },
  { id: 'slate', label: 'White', swatchClass: 'bg-white border-slate-300' },
  { id: 'midnight', label: 'Midnight', swatchClass: 'bg-slate-900 border-slate-700' },
  { id: 'sky', label: 'Sky Blue', swatchClass: 'bg-sky-200 border-sky-400' },
  { id: 'emerald', label: 'Emerald', swatchClass: 'bg-emerald-200 border-emerald-400' },
  { id: 'rose', label: 'Rose', swatchClass: 'bg-rose-200 border-rose-400' },
  { id: 'lavender', label: 'Lavender', swatchClass: 'bg-violet-200 border-violet-400' },
  { id: 'amber', label: 'Warm Amber', swatchClass: 'bg-amber-200 border-amber-400' },
];

const WIDGET_TAB_LABELS: { id: WidgetId; label: string }[] = [
  { id: 'countdown', label: 'Countdown' },
  { id: 'liveTile', label: 'My Diaries Live' },
  { id: 'diaryCard', label: 'Single Post' },
  { id: 'feedCard', label: 'Feed Card' },
];

function getWidgetThemeClasses(
  themeId: WidgetColorThemeId,
  isLightWallpaper: boolean
): {
  shell: string;
  muted: string;
  accent: string;
  divider: string;
  chip: string;
} {
  switch (themeId) {
    case 'transparent':
      return isLightWallpaper
        ? {
            shell:
              'bg-transparent text-slate-950 border border-transparent shadow-none',
            muted: 'text-slate-800/85',
            accent: 'text-sky-900',
            divider: 'border-slate-900/20',
            chip: 'bg-slate-950/10 text-slate-950 border border-slate-950/15',
          }
        : {
            shell:
              'bg-transparent text-white border border-transparent shadow-none',
            muted: 'text-white/80',
            accent: 'text-sky-300',
            divider: 'border-white/25',
            chip: 'bg-white/10 text-white border border-white/20',
          };
    case 'midnight':
      return {
        shell:
          'bg-slate-900 text-slate-100 border border-slate-700/90 shadow-[0_18px_42px_rgba(2,6,23,0.5)]',
        muted: 'text-slate-400',
        accent: 'text-sky-400',
        divider: 'border-slate-700/80',
        chip: 'bg-slate-800 text-sky-300',
      };
    case 'sky':
      return {
        shell:
          'bg-sky-50 text-sky-950 border border-sky-200 shadow-[0_14px_34px_rgba(2,132,199,0.18)]',
        muted: 'text-sky-800/75',
        accent: 'text-sky-700',
        divider: 'border-sky-200/90',
        chip: 'bg-sky-100 text-sky-800',
      };
    case 'emerald':
      return {
        shell:
          'bg-emerald-50 text-emerald-950 border border-emerald-200 shadow-[0_14px_34px_rgba(5,150,105,0.18)]',
        muted: 'text-emerald-800/75',
        accent: 'text-emerald-700',
        divider: 'border-emerald-200/90',
        chip: 'bg-emerald-100 text-emerald-800',
      };
    case 'rose':
      return {
        shell:
          'bg-rose-50 text-rose-950 border border-rose-200 shadow-[0_14px_34px_rgba(225,29,72,0.16)]',
        muted: 'text-rose-800/75',
        accent: 'text-rose-700',
        divider: 'border-rose-200/90',
        chip: 'bg-rose-100 text-rose-800',
      };
    case 'lavender':
      return {
        shell:
          'bg-violet-50 text-violet-950 border border-violet-200 shadow-[0_14px_34px_rgba(124,58,237,0.16)]',
        muted: 'text-violet-800/75',
        accent: 'text-violet-700',
        divider: 'border-violet-200/90',
        chip: 'bg-violet-100 text-violet-800',
      };
    case 'amber':
      return {
        shell:
          'bg-amber-50 text-amber-950 border border-amber-200 shadow-[0_14px_34px_rgba(217,119,6,0.16)]',
        muted: 'text-amber-800/75',
        accent: 'text-amber-700',
        divider: 'border-amber-200/90',
        chip: 'bg-amber-100 text-amber-800',
      };
    case 'slate':
    default:
      return {
        shell:
          'bg-white text-slate-900 border border-slate-200/90 shadow-[0_16px_38px_rgba(15,23,42,0.16)]',
        muted: 'text-slate-500',
        accent: 'text-sky-700',
        divider: 'border-slate-200/85',
        chip: 'bg-slate-100 text-slate-800',
      };
  }
}

function isGifAttachment(att?: { type?: string; url?: string; mimeType?: string }): boolean {
  if (!att) return false;
  if (att.type === 'gif') return true;
  if (att.mimeType?.toLowerCase().includes('gif')) return true;
  return Boolean(att.url && /\.gif(\?|$)/i.test(att.url));
}

function getStaticGifFallbackUrl(url: string): string {
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/f_jpg,pg_1/');
  }
  return url;
}

function getFirstSentences(text: string, maxChars = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const match = clean.match(/^[^.!?]+[.!?]+(?:\s+[^.!?]+[.!?]+)?/);
  const candidate = match ? match[0].trim() : clean;
  if (candidate.length <= maxChars) return candidate;
  return `${candidate.slice(0, maxChars - 1).trimEnd()}…`;
}

function estimateTimerEmWidth(str: string): number {
  let em = 0;
  for (const ch of str) {
    if (ch === ' ') em += 0.24;
    else if (ch === ':' || ch === '.' || ch === '-') em += 0.30;
    else if (ch >= '0' && ch <= '9') em += 0.60;
    else em += 0.58;
  }
  return Math.max(3, em);
}

const ResizableWidgetBox: React.FC<{
  size: WidgetSizeDims;
  onChangeSize: (next: WidgetSizeDims) => void;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  cornerRadius: number;
  autoHeight?: boolean;
  transparentGuide?: boolean;
  children: (measured: WidgetSizeDims) => React.ReactNode;
}> = ({
  size,
  onChangeSize,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  cornerRadius,
  autoHeight = false,
  transparentGuide = false,
  children,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<WidgetSizeDims>(size);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w > 0 && h > 0) {
          setMeasured((prev) =>
            prev.width === w && prev.height === h ? prev : { width: w, height: h }
          );
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = boxRef.current?.getBoundingClientRect();
    const startW = rect ? Math.round(rect.width) : size.width;
    const startH = rect ? Math.round(rect.height) : size.height;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const nextW = Math.max(
        minWidth,
        Math.min(maxWidth, Math.round(startW + (ev.clientX - startX)))
      );
      const nextH = Math.max(
        minHeight,
        Math.min(maxHeight, Math.round(startH + (ev.clientY - startY)))
      );
      onChangeSize({ width: nextW, height: nextH });
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={boxRef}
        style={{
          width: `${size.width}px`,
          maxWidth: '100%',
          borderRadius: `${cornerRadius}px`,
          ...(autoHeight
            ? { minHeight: `${size.height}px` }
            : { height: `${size.height}px` }),
        }}
        className={`group/resize relative flex flex-col transition-[box-shadow,outline-color] ${
          transparentGuide
            ? 'outline-1 outline-dashed outline-current/25 hover:outline-sky-400/70'
            : ''
        } ${dragging ? 'ring-2 ring-sky-400/80' : ''}`}
      >
        <div className={autoHeight ? 'w-full' : 'h-full w-full min-h-0'}>
          {children(measured)}
        </div>

        {/* Bottom-Right Resize Grip Handle */}
        <div
          role="slider"
          aria-label="Drag corner to resize widget preview"
          aria-valuetext={`${measured.width} by ${measured.height} pixels`}
          tabIndex={-1}
          title="Drag corner to resize widget"
          onPointerDown={handleGripPointerDown}
          className="absolute -bottom-1 -right-1 z-30 flex h-6 w-6 cursor-nwse-resize items-end justify-end p-1.5 opacity-60 transition-opacity group-hover/resize:opacity-100 touch-none select-none"
        >
          <span className="block h-2.5 w-2.5 rounded-br-[4px] border-r-2 border-b-2 border-sky-400 shadow-sm" />
        </div>
      </div>
      <div className="mt-1.5 font-mono text-[10px] opacity-65 tabular-nums">
        {measured.width} × {measured.height} px · drag corner to resize
      </div>
    </div>
  );
};

const WidgetVisualMedia: React.FC<{
  url: string;
  alt: string;
  isGif: boolean;
  animateGif: boolean;
  uncropped?: boolean;
  cornerRadius?: number;
  className?: string;
}> = ({
  url,
  alt,
  isGif,
  animateGif,
  uncropped = false,
  cornerRadius,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'loaded' | 'error'>(
    () => (url && url.trim() ? 'loading' : 'error')
  );

  useEffect(() => {
    const trimmed = url?.trim() || '';
    setCanvasReady(false);
    setMediaStatus(trimmed ? 'loading' : 'error');
    if (!trimmed || !isGif || animateGif) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth || 320;
      canvas.height = img.naturalHeight || 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setCanvasReady(true);
          setMediaStatus('loaded');
        } catch {
          setCanvasReady(false);
        }
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setCanvasReady(false);
      }
    };
    img.src = getStaticGifFallbackUrl(trimmed);
    return () => {
      cancelled = true;
    };
  }, [url, isGif, animateGif]);

  const staticUrl = getStaticGifFallbackUrl(url);
  const mediaFitClass = uncropped ? 'block w-full h-auto' : 'h-full w-full object-cover';
  const radiusStyle =
    cornerRadius !== undefined ? { borderRadius: `${cornerRadius}px` } : undefined;

  if (mediaStatus === 'error') {
    return (
      <div
        style={radiusStyle}
        role="img"
        aria-label={alt || 'Media unavailable'}
        className={`relative flex flex-col items-center justify-center gap-1.5 overflow-hidden bg-slate-100/90 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 ${
          uncropped ? 'w-full min-h-[120px] px-4 py-6' : 'p-2'
        } ${className}`}
      >
        <ImageOff className={uncropped ? 'h-6 w-6 opacity-75' : 'h-4 w-4 opacity-75'} />
        {uncropped && (
          <span className="text-[11px] font-medium opacity-85">
            Image unavailable
          </span>
        )}
      </div>
    );
  }

  if (isGif && !animateGif) {
    return (
      <div
        style={radiusStyle}
        className={`relative overflow-hidden ${
          uncropped ? `w-full ${mediaStatus === 'loading' ? 'min-h-[120px]' : ''}` : ''
        } ${className}`}
      >
        {mediaStatus === 'loading' && !canvasReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-slate-100/90 text-slate-500 animate-pulse dark:bg-slate-800/80 dark:text-slate-400">
            <ImageIcon className={uncropped ? 'h-6 w-6 opacity-70' : 'h-4 w-4 opacity-70'} />
            {uncropped && (
              <span className="text-[11px] font-medium">Loading image…</span>
            )}
          </div>
        )}
        {canvasReady ? (
          <canvas
            ref={canvasRef}
            aria-label={alt}
            className={mediaFitClass}
          />
        ) : (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <img
              src={staticUrl}
              alt={alt}
              referrerPolicy="no-referrer"
              onLoad={() => setMediaStatus('loaded')}
              onError={() => setMediaStatus('error')}
              className={`${mediaFitClass} transition-opacity duration-200 ${
                mediaStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
        )}
        <span className="absolute top-1.5 right-1.5 z-20 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
          <Pause className="h-2.5 w-2.5" />
          STATIC
        </span>
      </div>
    );
  }

  return (
    <div
      style={radiusStyle}
      className={`relative overflow-hidden ${
        uncropped ? `w-full ${mediaStatus === 'loading' ? 'min-h-[120px]' : ''}` : ''
      } ${className}`}
    >
      {mediaStatus === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-slate-100/90 text-slate-500 animate-pulse dark:bg-slate-800/80 dark:text-slate-400">
          <ImageIcon className={uncropped ? 'h-6 w-6 opacity-70' : 'h-4 w-4 opacity-70'} />
          {uncropped && (
            <span className="text-[11px] font-medium">Loading image…</span>
          )}
        </div>
      )}
      <img
        src={url}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setMediaStatus('loaded')}
        onError={() => setMediaStatus('error')}
        className={`${mediaFitClass} transition-opacity duration-200 ${
          mediaStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {isGif && animateGif && (
        <span className="absolute top-1.5 right-1.5 z-20 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
          <Play className="h-2.5 w-2.5 fill-current" />
          GIF
        </span>
      )}
    </div>
  );
};

interface TwitchTileStatus {
  isLive: boolean;
  bannerImageUrl: string | null;
  streamTitle: string | null;
  loading: boolean;
}

export const MobileWidgetStudioView: React.FC<MobileWidgetStudioViewProps> = ({
  posts,
  countdowns,
  nowMs,
  activeStation,
  onOpenTimeline,
  onOpenLive,
  onOpenCountdown,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [wallpaper, setWallpaper] = useState<LauncherWallpaperId>('slate');
  const [widgetCornerRadius, setWidgetCornerRadius] = useState<number>(12);
  const [widgetThemes, setWidgetThemes] = useState<
    Record<WidgetId, WidgetColorThemeId>
  >({
    countdown: 'slate',
    liveTile: 'slate',
    diaryCard: 'slate',
    feedCard: 'slate',
  });

  // 1. Countdown widget state (adaptive & never shows clock icon)
  const [selectedCountdownId, setSelectedCountdownId] = useState<string>(
    () => countdowns[0]?.id || ''
  );
  const [countdownBoxSize, setCountdownBoxSize] = useState<WidgetSizeDims>({
    width: 240,
    height: 142,
  });

  // 2. My Diaries Live Tile state (Channel 1, 2, or 3)
  const liveChannels = useMemo(() => STATIONS.slice(0, 3), []);
  const [selectedLiveChannelNum, setSelectedLiveChannelNum] = useState<number>(
    () => {
      if (activeStation && activeStation.number >= 1 && activeStation.number <= 3) {
        return activeStation.number;
      }
      return 1;
    }
  );
  const [liveBoxSize, setLiveBoxSize] = useState<WidgetSizeDims>({
    width: 235,
    height: 185,
  });
  const [liveSimMode, setLiveSimMode] = useState<LiveSimMode>('auto');
  const [twitchStatusByCallsign, setTwitchStatusByCallsign] = useState<
    Record<string, TwitchTileStatus>
  >({});

  // 3. Single Post widget state (defaults to Wide view)
  const [selectedDiaryPostId, setSelectedDiaryPostId] = useState<string>(
    () => posts[0]?.id || ''
  );
  const [animateDiaryGif, setAnimateDiaryGif] = useState(true);
  const [singlePostBoxSize, setSinglePostBoxSize] = useState<WidgetSizeDims>({
    width: 460,
    height: 340,
  });

  // 4. Feed Card widget state (defaults to Full View)
  const [feedLayout, setFeedLayout] = useState<FeedLayoutMode>('full');
  const [feedFilterMode, setFeedFilterMode] = useState<FeedFilterMode>('all');
  const [selectedFeedTag, setSelectedFeedTag] = useState<string>('');
  const [feedDateFrom, setFeedDateFrom] = useState('');
  const [feedDateTo, setFeedDateTo] = useState('');
  const [feedMaxItems, setFeedMaxItems] = useState<number>(3);
  const [animateFeedGif, setAnimateFeedGif] = useState(true);
  const [feedBoxSize, setFeedBoxSize] = useState<WidgetSizeDims>({
    width: 470,
    height: 390,
  });

  // Expand modal (publish readiness) & Options Setup Preview modal
  const [expandedWidget, setExpandedWidget] = useState<WidgetId | null>(null);
  const [optionsPreviewWidget, setOptionsPreviewWidget] = useState<WidgetId | null>(null);

  const [activeCodeId, setActiveCodeId] = useState<string>(
    ANDROID_WIDGET_TEMPLATES[0].id
  );

  useEffect(() => {
    if (!selectedDiaryPostId && posts[0]?.id) {
      setSelectedDiaryPostId(posts[0].id);
    }
  }, [posts, selectedDiaryPostId]);

  useEffect(() => {
    if (!selectedCountdownId && countdowns[0]?.id) {
      setSelectedCountdownId(countdowns[0].id);
    }
  }, [countdowns, selectedCountdownId]);

  useEffect(() => {
    if (countdowns.length > 0) {
      syncCountdownsToNative(countdowns);
    }
  }, [countdowns]);

  useEffect(() => {
    const selected =
      countdowns.find((c) => c.id === selectedCountdownId) ||
      countdowns[0] ||
      null;
    if (selected) {
      syncCountdownSelectionToNative(selected, true);
    }
  }, [countdowns, selectedCountdownId]);

  const selectedLiveChannel = useMemo(
    () =>
      liveChannels.find((c) => c.number === selectedLiveChannelNum) ||
      liveChannels[0],
    [liveChannels, selectedLiveChannelNum]
  );

  // Fetch live / offline status for selected Channel 1 / 2 / 3
  useEffect(() => {
    const channel = selectedLiveChannel?.callsign;
    if (!channel) return;
    const key = channel.toLowerCase();
    let cancelled = false;

    setTwitchStatusByCallsign((prev) => ({
      ...prev,
      [key]: {
        isLive: prev[key]?.isLive ?? false,
        bannerImageUrl: prev[key]?.bannerImageUrl ?? null,
        streamTitle: prev[key]?.streamTitle ?? null,
        loading: !prev[key],
      },
    }));

    fetchJsonWithRetry<{
      isLive?: boolean;
      bannerImageUrl?: string | null;
      streamTitle?: string | null;
    }>(`/api/twitch-status?channel=${encodeURIComponent(channel)}`, {
      timeoutMs: 20000,
      retries: 2,
    })
      .then(
        (data) => {
          if (cancelled) return;
          setTwitchStatusByCallsign((prev) => ({
            ...prev,
            [key]: {
              isLive: Boolean(data.isLive),
              bannerImageUrl: data.bannerImageUrl || null,
              streamTitle: data.streamTitle || null,
              loading: false,
            },
          }));
        }
      )
      .catch(() => {
        if (cancelled) return;
        setTwitchStatusByCallsign((prev) => ({
          ...prev,
          [key]: {
            isLive: false,
            bannerImageUrl: prev[key]?.bannerImageUrl ?? null,
            streamTitle: null,
            loading: false,
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLiveChannel?.callsign]);

  const availableTags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of posts) {
      for (const t of getMergedPostTags(p)) {
        const k = t.toLowerCase();
        if (!seen.has(k)) seen.set(k, t);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  useEffect(() => {
    if (!selectedFeedTag && availableTags[0]) {
      setSelectedFeedTag(availableTags[0]);
    }
  }, [availableTags, selectedFeedTag]);

  const diaryPost = useMemo(
    () => posts.find((p) => p.id === selectedDiaryPostId) || posts[0] || null,
    [posts, selectedDiaryPostId]
  );
  const diaryVisual = diaryPost?.attachments.find(
    (a) => a.type === 'image' || a.type === 'gif'
  );
  const diaryTags = diaryPost ? getMergedPostTags(diaryPost) : [];

  const feedPosts = useMemo(() => {
    const fromMs = dateFilterBoundToMs(feedDateFrom, 'start', DEFAULT_TIME_ZONE);
    const toMs = dateFilterBoundToMs(feedDateTo, 'end', DEFAULT_TIME_ZONE);

    const filtered = posts.filter((p) => {
      if (feedFilterMode === 'pinned') {
        return !!p.pinnedUntil && new Date(p.pinnedUntil).getTime() > nowMs;
      }
      if (feedFilterMode === 'tag' && selectedFeedTag) {
        return getMergedPostTags(p).some(
          (t) => t.toLowerCase() === selectedFeedTag.toLowerCase()
        );
      }
      if (feedFilterMode === 'date-range') {
        const ts = new Date(p.publishedAt).getTime();
        if (fromMs !== null && !Number.isNaN(fromMs) && ts < fromMs) return false;
        if (toMs !== null && !Number.isNaN(toMs) && ts > toMs) return false;
      }
      return true;
    });

    const ordered =
      feedFilterMode === 'all'
        ? [...filtered].sort((a, b) => {
            const aPinned = !!a.pinnedUntil && new Date(a.pinnedUntil).getTime() > nowMs;
            const bPinned = !!b.pinnedUntil && new Date(b.pinnedUntil).getTime() > nowMs;
            if (aPinned !== bPinned) return aPinned ? -1 : 1;
            return (
              new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
            );
          })
        : filtered;

    return ordered.slice(0, feedMaxItems);
  }, [posts, feedFilterMode, selectedFeedTag, feedDateFrom, feedDateTo, feedMaxItems, nowMs]);

  const activeCountdown = useMemo(
    () =>
      countdowns.find((c) => c.id === selectedCountdownId) ||
      countdowns[0] ||
      null,
    [countdowns, selectedCountdownId]
  );

  useEffect(() => {
    if (countdowns.length > 0) {
      void syncCountdownsToNative(countdowns);
    }
  }, [countdowns]);

  useEffect(() => {
    if (activeCountdown) {
      void syncCountdownSelectionToNative(activeCountdown, true);
    }
  }, [activeCountdown]);

  const countdownTagList = useMemo(() => {
    if (!activeCountdown?.tag) return [];
    return activeCountdown.tag
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, '').trim())
      .filter(Boolean);
  }, [activeCountdown]);

  const liveTileStatus = useMemo<TwitchTileStatus>(() => {
    const key = selectedLiveChannel.callsign.toLowerCase();
    const fetched = twitchStatusByCallsign[key] || {
      isLive: false,
      bannerImageUrl: null,
      streamTitle: null,
      loading: true,
    };

    if (liveSimMode === 'live') {
      return {
        ...fetched,
        isLive: true,
        loading: false,
        streamTitle: fetched.streamTitle || null,
      };
    }
    if (liveSimMode === 'offline') {
      return {
        ...fetched,
        isLive: false,
        loading: false,
      };
    }
    return fetched;
  }, [selectedLiveChannel, twitchStatusByCallsign, liveSimMode]);

  const liveEventTags = useMemo(() => {
    const seen = new Map<string, string>();
    const addTag = (raw: string) => {
      const cleaned = raw.replace(/^#+/, '').trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) seen.set(key, cleaned);
    };

    if (liveTileStatus.streamTitle) {
      const matches = liveTileStatus.streamTitle.match(/#([A-Za-z0-9_]+)/g);
      if (matches) {
        matches.forEach(addTag);
      }
    }
    countdownTagList.forEach(addTag);
    for (const cd of countdowns) {
      if (cd.tag) {
        cd.tag.split(/[\s,]+/).forEach(addTag);
      }
    }
    if (seen.size === 0) {
      addTag('MyDiariesLive');
      addTag(`Ch${selectedLiveChannel.number}`);
    }
    return Array.from(seen.values()).slice(0, 4);
  }, [liveTileStatus.streamTitle, countdownTagList, countdowns, selectedLiveChannel.number]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const activeWallpaper =
    WALLPAPER_OPTIONS.find((w) => w.id === wallpaper) || WALLPAPER_OPTIONS[0];

  const syncedTemplates = useMemo(
    () =>
      ANDROID_WIDGET_TEMPLATES.map((tpl) =>
        tpl.id === 'drawable'
          ? {
              ...tpl,
              code: tpl.code.replace(/android:radius="12dp"/g, `android:radius="${widgetCornerRadius}dp"`),
            }
          : tpl
      ),
    [widgetCornerRadius]
  );

  const activeTemplate = useMemo(
    () =>
      syncedTemplates.find((t) => t.id === activeCodeId) || syncedTemplates[0],
    [activeCodeId, syncedTemplates]
  );

  const previewTimeLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(nowMs);
    } catch {
      return '9:41';
    }
  }, [nowMs]);

  const setWidgetTheme = (widgetId: WidgetId, theme: WidgetColorThemeId) => {
    setWidgetThemes((prev) => ({ ...prev, [widgetId]: theme }));
  };

  const renderWidgetThemePicker = (widgetId: WidgetId, onLightSurface = false) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <Palette className="h-3.5 w-3.5 opacity-75 shrink-0" />
      {WIDGET_THEME_OPTIONS.map((t) => {
        const active = widgetThemes[widgetId] === t.id;
        return (
          <button
            key={`${widgetId}-${t.id}`}
            type="button"
            onClick={() => setWidgetTheme(widgetId, t.id)}
            title={t.label}
            aria-label={`${widgetId} theme: ${t.label}`}
            className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${t.swatchClass} ${
              active
                ? `scale-115 ring-2 ring-sky-400 ring-offset-1 ${
                    onLightSurface ? 'ring-offset-white dark:ring-offset-slate-900' : 'ring-offset-slate-900'
                  }`
                : 'opacity-85 hover:opacity-100'
            }`}
          />
        );
      })}
    </div>
  );

  // Adaptive breakpoints:
  // - Smallest stays timer-only while scaling height vertically up to 125px (unless width >= 260 makes it horizontal)
  // - Compact vertical emerges at height >= 126px (timer + fixed-size title)
  // - Expanded vertical emerges at height >= 172px (timer + fixed-size title + fixed-size hashtags)
  const getCountdownModeFromDims = (dims: WidgetSizeDims) => {
    if (dims.height < 126 && dims.width < 260) return 'smallest';
    if (dims.height < 126 && dims.width >= 260) return 'compact-horizontal';
    if (dims.height >= 172) return 'expanded-vertical';
    return 'compact-vertical';
  };

  // Live breakpoints:
  // - Smallest (`width < 195 && height < 145`): Ch # + callsign, channel info vertically centered
  // - Horizontal (`width >= 195 && height < 145`): Ch # -> Channel # (when wide enough, >= 260px) + same-line status badge
  // - Expanded Vertical (`145 <= height < 185`): vertically centered channel info + NOW STREAMING (if live)
  // - Expanded Tall (`height >= 185`): vertically centered channel info + NOW STREAMING (if live) + event hashtags
  const getLiveTileModeFromDims = (dims: WidgetSizeDims) => {
    if (dims.height >= 145) {
      return dims.height >= 185 ? 'expanded-tall' : 'expanded-vertical';
    }
    if (dims.width >= 195) {
      return dims.width >= 260 ? 'horizontal-channel' : 'horizontal-ch';
    }
    return 'smallest';
  };

  // Monotonically non-decreasing timer font size across all forms (fills smallest box more generously)
  const getCountdownTimerFontPx = (dims: WidgetSizeDims, timerStr: string) => {
    const innerWidth = Math.max(88, dims.width - 26);
    const emWidth = estimateTimerEmWidth(timerStr);
    const widthFittedMax = Math.floor(innerWidth / emWidth);
    const hNorm = Math.max(0, Math.min(1, (dims.height - 72) / (210 - 72)));
    const wNorm = Math.max(0, Math.min(1, (dims.width - 140) / (400 - 140)));
    const raw = Math.round(23 + hNorm * 12 + wNorm * 6);
    return Math.max(15, Math.min(40, raw, widthFittedMax));
  };

  // Monotonically non-decreasing Ch # / Channel # font size across all forms
  const getLiveChannelFontPx = (dims: WidgetSizeDims) => {
    const wNorm = Math.max(0, Math.min(1, (dims.width - 132) / (380 - 132)));
    const hNorm = Math.max(0, Math.min(1, (dims.height - 96) / (230 - 96)));
    return Math.round(20 + wNorm * 8 + hNorm * 6);
  };

  // Reusable Widget Preview Renderers
  const renderCountdownWidget = (
    isExpanded = false,
    dims: WidgetSizeDims = countdownBoxSize
  ) => {
    const theme = getWidgetThemeClasses(
      widgetThemes.countdown,
      activeWallpaper.isLightBackdrop
    );
    const timerStr = activeCountdown
      ? formatCountdownDisplay(activeCountdown, nowMs)
      : '00 : 00 : 00 : 00';
    const titleStr = activeCountdown?.title || 'Next Event';
    const effectiveDims = isExpanded ? { width: 320, height: 196 } : dims;
    const mode = getCountdownModeFromDims(effectiveDims);
    const timerFontPx = getCountdownTimerFontPx(effectiveDims, timerStr);
    const radiusStyle = { borderRadius: `${widgetCornerRadius}px` };

    // NEVER render any clock icon inside Countdown widget
    if (mode === 'smallest') {
      return (
        <button
          type="button"
          style={radiusStyle}
          onClick={() => activeCountdown && onOpenCountdown?.(activeCountdown.id)}
          className={`flex h-full w-full items-center justify-center px-2.5 py-2 text-center transition-all cursor-pointer ${theme.shell}`}
        >
          <span
            style={{ fontSize: `${timerFontPx}px` }}
            className="font-display font-extrabold tracking-tight tabular-nums leading-none whitespace-nowrap"
          >
            {timerStr}
          </span>
        </button>
      );
    }

    if (mode === 'compact-horizontal') {
      return (
        <button
          type="button"
          style={radiusStyle}
          onClick={() => activeCountdown && onOpenCountdown?.(activeCountdown.id)}
          className={`flex h-full w-full items-center justify-between gap-2.5 px-3 py-2.5 text-left transition-all cursor-pointer ${theme.shell}`}
        >
          <span
            style={{ fontSize: `${timerFontPx}px` }}
            className="font-display font-extrabold tracking-tight tabular-nums leading-none shrink-0 whitespace-nowrap"
          >
            {timerStr}
          </span>
          <span className="font-display text-[13px] font-bold truncate text-right min-w-0">
            {titleStr}
          </span>
        </button>
      );
    }

    if (mode === 'compact-vertical') {
      return (
        <button
          type="button"
          style={radiusStyle}
          onClick={() => activeCountdown && onOpenCountdown?.(activeCountdown.id)}
          className={`flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 py-3 text-center transition-all cursor-pointer ${theme.shell}`}
        >
          <div
            style={{ fontSize: `${timerFontPx}px` }}
            className="font-display font-extrabold tracking-tight tabular-nums leading-tight whitespace-nowrap"
          >
            {timerStr}
          </div>
          <div className="font-display text-[13px] font-bold line-clamp-2 max-w-full">
            {titleStr}
          </div>
        </button>
      );
    }

    // expanded-vertical: includes timer, fixed-size event title, and fixed-size hashtags
    return (
      <button
        type="button"
        style={radiusStyle}
        onClick={() => activeCountdown && onOpenCountdown?.(activeCountdown.id)}
        className={`flex h-full w-full flex-col justify-between gap-3 px-3.5 py-3.5 text-left transition-all cursor-pointer ${theme.shell}`}
      >
        <div>
          <div
            style={{ fontSize: `${timerFontPx}px` }}
            className="font-display font-extrabold tracking-tight tabular-nums leading-tight whitespace-nowrap"
          >
            {timerStr}
          </div>
          <h4 className="mt-1.5 font-display text-[13px] font-bold line-clamp-2">
            {titleStr}
          </h4>
        </div>

        <div className={`flex flex-wrap items-center gap-1.5 border-t pt-2.5 ${theme.divider}`}>
          {countdownTagList.length > 0 ? (
            countdownTagList.map((tag) => (
              <span
                key={tag}
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${theme.chip}`}
              >
                #{tag}
              </span>
            ))
          ) : (
            <span className={`font-mono text-[11px] ${theme.muted}`}>
              #NextOnMD
            </span>
          )}
        </div>
      </button>
    );
  };

  const renderLiveTileWidget = (
    isExpanded = false,
    dims: WidgetSizeDims = liveBoxSize
  ) => {
    const theme = getWidgetThemeClasses(
      widgetThemes.liveTile,
      activeWallpaper.isLightBackdrop
    );
    const isLive = liveTileStatus.isLive;
    const effectiveDims = isExpanded ? { width: 280, height: 215 } : dims;
    const mode = getLiveTileModeFromDims(effectiveDims);
    const channelFontPx = getLiveChannelFontPx(effectiveDims);
    const radiusStyle = { borderRadius: `${widgetCornerRadius}px` };

    const statusBadge = liveTileStatus.loading ? (
      <span className={`rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold ${theme.chip}`}>
        SYNC...
      </span>
    ) : isLive ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 font-mono text-[9.5px] font-extrabold text-white shadow-sm">
        <Radio className="h-2.5 w-2.5 animate-pulse" />
        LIVE
      </span>
    ) : (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold ${theme.chip}`}>
        OFFLINE
      </span>
    );

    // 1. Smallest form: channel info vertically centered + callsign below + top-right status badge
    if (mode === 'smallest') {
      return (
        <button
          type="button"
          style={radiusStyle}
          onClick={() => onOpenLive?.()}
          className={`group relative flex h-full w-full flex-col justify-between overflow-hidden px-3.5 py-3 text-left transition-transform active:scale-[0.98] cursor-pointer ${theme.shell}`}
        >
          <div className="flex h-5 items-center justify-end w-full shrink-0">
            {statusBadge}
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div
              style={{ fontSize: `${channelFontPx}px` }}
              className="font-display font-extrabold tracking-tight leading-none truncate"
            >
              Ch {selectedLiveChannel.number}
            </div>
            <div className={`mt-1.5 font-mono text-[10px] font-semibold tracking-wide truncate ${theme.muted}`}>
              {selectedLiveChannel.callsign}
            </div>
          </div>

          <div className="h-4 w-full shrink-0" aria-hidden="true" />
        </button>
      );
    }

    // 2. Horizontal expand: Channel #; channel info vertically centered
    if (mode === 'horizontal-ch' || mode === 'horizontal-channel') {
      const channelText = `Channel ${selectedLiveChannel.number}`;

      return (
        <button
          type="button"
          style={radiusStyle}
          onClick={() => onOpenLive?.()}
          className={`group relative flex h-full w-full items-center justify-between gap-3 overflow-hidden px-4 py-3 text-left transition-transform active:scale-[0.98] cursor-pointer ${theme.shell}`}
        >
          <div
            style={{ fontSize: `${channelFontPx}px` }}
            className="min-w-0 flex-1 font-display font-extrabold tracking-tight leading-none truncate"
          >
            {channelText}
          </div>

          <div className="shrink-0">{statusBadge}</div>
        </button>
      );
    }

    // 3. Expanded vertical & expanded tall:
    //    - Channel info stays vertically centered (Channel #)
    //    - Includes NOW STREAMING (if live) and eventually event hashtags when tall enough
    const expandedChannelText = `Channel ${selectedLiveChannel.number}`;
    const showHashtags = mode === 'expanded-tall';
    const showBrandTitle = effectiveDims.width >= 190;

    return (
      <button
        type="button"
        style={radiusStyle}
        onClick={() => onOpenLive?.()}
        className={`group relative flex h-full w-full flex-col justify-between overflow-hidden px-3.5 py-3 text-left transition-transform active:scale-[0.98] cursor-pointer ${theme.shell}`}
      >
        <div className="flex items-center justify-between gap-2 relative z-10 shrink-0 min-h-[20px]">
          {showBrandTitle ? (
            <span className={`text-[10px] font-extrabold tracking-[0.12em] uppercase truncate ${theme.accent}`}>
              My Diaries Live
            </span>
          ) : (
            <span className={`text-[10px] font-extrabold tracking-[0.1em] uppercase truncate ${theme.accent}`}>
              MD Live
            </span>
          )}
          <div className="shrink-0">{statusBadge}</div>
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center relative z-10 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {effectiveDims.width >= 195 && (
              <Tv className={`h-4 w-4 shrink-0 ${theme.accent}`} />
            )}
            <span
              style={{ fontSize: `${channelFontPx}px` }}
              className="font-display font-extrabold tracking-tight leading-none truncate"
            >
              {expandedChannelText}
            </span>
          </div>
          <div className={`mt-1 font-mono text-[10px] font-semibold tracking-wide truncate ${theme.muted}`}>
            {selectedLiveChannel.callsign}
          </div>
          {isLive && (
            <div className="mt-1 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-rose-500">
              NOW STREAMING
            </div>
          )}
          {isLive && liveTileStatus.streamTitle && effectiveDims.width >= 195 && (
            <p className={`mt-0.5 text-[11px] line-clamp-1 ${theme.muted}`}>
              {liveTileStatus.streamTitle}
            </p>
          )}
        </div>

        {showHashtags ? (
          <div className={`relative z-10 shrink-0 border-t pt-2 space-y-1.5 ${theme.divider}`}>
            <div className="flex flex-wrap items-center gap-1">
              {liveEventTags.slice(0, effectiveDims.width >= 230 ? 3 : 2).map((tag) => (
                <span
                  key={tag}
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${theme.chip}`}
                >
                  #{tag}
                </span>
              ))}
            </div>
            {effectiveDims.width >= 220 && (
              <div className={`flex items-center justify-between text-[11px] font-semibold ${theme.accent}`}>
                <span>{isLive ? 'Watch Broadcast' : 'Open Station'}</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`relative z-10 shrink-0 flex items-center justify-between border-t pt-2 text-[11px] font-semibold ${theme.divider} ${theme.accent}`}
          >
            <span className="truncate">{isLive ? 'Watch Broadcast' : 'Open Station'}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        )}
      </button>
    );
  };

  const renderSinglePostWidget = (
    isExpanded = false,
    dims: WidgetSizeDims = singlePostBoxSize
  ) => {
    const theme = getWidgetThemeClasses(
      widgetThemes.diaryCard,
      activeWallpaper.isLightBackdrop
    );
    const visualIsGif = isGifAttachment(diaryVisual);
    const postTitle = diaryPost?.title?.trim() || '';
    const postBody = diaryPost ? stripHtml(diaryPost.bodyHtml).trim() : '';
    const w = isExpanded ? 460 : dims.width;
    const isNarrow = w < 270;
    const isWide = w >= 400;

    return (
      <div
        style={{ borderRadius: `${widgetCornerRadius}px` }}
        className={`flex h-full w-full flex-col overflow-hidden transition-colors ${theme.shell}`}
      >
        <div
          className={`flex-1 min-h-0 overflow-y-auto ${
            isExpanded ? 'max-h-[480px]' : ''
          }`}
        >
          {diaryVisual && (
            <WidgetVisualMedia
              url={diaryVisual.url}
              alt={diaryVisual.title || postTitle || 'Post attachment'}
              isGif={visualIsGif}
              animateGif={animateDiaryGif}
              uncropped={true}
              className="bg-black/10"
            />
          )}

          <div className={`${isNarrow ? 'p-3 space-y-1.5' : isWide ? 'p-4 space-y-2' : 'p-3.5 space-y-2'}`}>
            {postTitle && (
              <h4 className={`font-display font-bold line-clamp-2 ${isNarrow ? 'text-sm' : isWide ? 'text-lg' : 'text-base'}`}>
                {postTitle}
              </h4>
            )}

            {diaryPost && (
              <div className={`flex flex-wrap items-center gap-2 font-mono tabular-nums ${isNarrow ? 'text-[10px]' : 'text-[11px]'} ${theme.muted}`}>
                <span>{formatPostTimestamp(diaryPost.publishedAt)}</span>
                {diaryTags[0] && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={theme.accent}>#{diaryTags[0]}</span>
                  </>
                )}
              </div>
            )}

            {diaryPost ? (
              postBody && (
                <p
                  className={`leading-relaxed ${
                    isExpanded
                      ? 'text-xs line-clamp-6'
                      : isNarrow
                      ? 'text-[11px] line-clamp-3'
                      : isWide
                      ? 'text-xs sm:text-sm line-clamp-5'
                      : 'text-xs line-clamp-4'
                  } ${theme.muted}`}
                >
                  {postBody}
                </p>
              )
            ) : (
              <p className={`text-xs leading-relaxed ${theme.muted}`}>
                Publish a post in Timeline to display it here.
              </p>
            )}

            <div className={`flex items-center justify-end border-t pt-2 text-xs ${theme.divider}`}>
              <button
                type="button"
                onClick={() => onOpenTimeline?.()}
                className={`inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer ${theme.accent}`}
              >
                <span>Open</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFeedCardWidget = (
    isExpanded = false,
    dims: WidgetSizeDims = feedBoxSize
  ) => {
    const theme = getWidgetThemeClasses(
      widgetThemes.feedCard,
      activeWallpaper.isLightBackdrop
    );
    const w = isExpanded ? 440 : dims.width;
    const isNarrow = w < 270;
    const isWide = w >= 400;
    const thumbRadius = Math.max(0, Math.round(widgetCornerRadius * 0.55));

    const filterLabel =
      feedFilterMode === 'pinned'
        ? 'Pinned Posts'
        : feedFilterMode === 'tag' && selectedFeedTag
        ? `#${selectedFeedTag}`
        : feedFilterMode === 'date-range'
        ? 'Date Range'
        : 'All Posts';

    return (
      <div
        style={{ borderRadius: `${widgetCornerRadius}px` }}
        className={`flex h-full w-full flex-col overflow-hidden transition-colors ${theme.shell}`}
      >
        <div
          className={`flex items-center justify-between gap-2 border-b shrink-0 ${
            isNarrow ? 'px-3 py-2' : 'px-4 py-2.5'
          } ${theme.divider}`}
        >
          <div className={`text-xs font-semibold truncate ${theme.muted}`}>
            {filterLabel} · Max {feedMaxItems}
          </div>
          <button
            type="button"
            onClick={() => onOpenTimeline?.()}
            className={`text-xs font-semibold hover:underline shrink-0 cursor-pointer ${theme.accent}`}
          >
            Open App
          </button>
        </div>

        <div
          className={`flex-1 min-h-0 overflow-y-auto divide-y ${theme.divider} ${
            isExpanded ? 'max-h-[480px]' : ''
          }`}
        >
          {feedPosts.length === 0 ? (
            <div className={`p-5 text-center text-xs ${theme.muted}`}>
              No posts match the current filter ({filterLabel}).
            </div>
          ) : (
            feedPosts.map((post) => {
              const firstVisual = post.attachments.find(
                (a) => a.type === 'image' || a.type === 'gif'
              );
              const isPinned =
                !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
              const tags = getMergedPostTags(post);
              const cleanTitle = post.title?.trim() || '';
              const plainBody = stripHtml(post.bodyHtml).trim();

              if (feedLayout === 'list') {
                const listHeading = cleanTitle || getFirstSentences(plainBody);
                return (
                  <div
                    key={post.id}
                    className={`${isNarrow ? 'px-3 py-2' : 'px-4 py-3'} space-y-1`}
                  >
                    {listHeading && (
                      <h4
                        className={`font-display font-bold line-clamp-2 leading-snug ${
                          isNarrow ? 'text-xs' : isWide ? 'text-sm sm:text-base' : 'text-sm'
                        }`}
                      >
                        {listHeading}
                      </h4>
                    )}
                    <div
                      className={`font-mono tabular-nums ${
                        isNarrow ? 'text-[10px]' : 'text-[11px]'
                      } ${theme.muted}`}
                    >
                      {formatPostTimestamp(post.publishedAt)}
                    </div>
                  </div>
                );
              }

              if (feedLayout === 'full') {
                return (
                  <div key={post.id} className="overflow-hidden">
                    {firstVisual && (
                      <WidgetVisualMedia
                        url={firstVisual.url}
                        alt={firstVisual.title || cleanTitle || 'Post attachment'}
                        isGif={isGifAttachment(firstVisual)}
                        animateGif={animateFeedGif}
                        uncropped={true}
                        className="bg-black/10"
                      />
                    )}
                    <div className={`${isNarrow ? 'p-2.5 space-y-1' : 'p-3.5 space-y-1.5'}`}>
                      <div className={`flex items-center gap-1.5 font-mono text-[10px] tabular-nums ${theme.muted}`}>
                        <span>{formatPostTimestamp(post.publishedAt)}</span>
                        {isPinned && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className={`inline-flex items-center gap-0.5 font-semibold ${theme.accent}`}>
                              <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                              Pinned
                            </span>
                          </>
                        )}
                      </div>
                      {cleanTitle && (
                        <h4
                          className={`font-display font-bold line-clamp-2 ${
                            isNarrow ? 'text-xs' : isWide ? 'text-base' : 'text-sm'
                          }`}
                        >
                          {cleanTitle}
                        </h4>
                      )}
                      {plainBody && (
                        <p
                          className={`leading-relaxed ${
                            isNarrow
                              ? 'text-[11px] line-clamp-2'
                              : isWide
                              ? 'text-xs line-clamp-4'
                              : 'text-xs line-clamp-3'
                          } ${theme.muted}`}
                        >
                          {plainBody}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className={`pt-0.5 flex flex-wrap gap-1.5 text-[10px] font-semibold ${theme.accent}`}>
                          {tags.slice(0, isWide ? 4 : 3).map((t) => (
                            <span key={t}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Default: horizontal
              return (
                <div
                  key={post.id}
                  className={`flex items-start ${isNarrow ? 'p-2.5 gap-2.5' : 'p-3.5 gap-3'}`}
                >
                  {firstVisual && (
                    <WidgetVisualMedia
                      url={firstVisual.url}
                      alt={firstVisual.title || cleanTitle || 'Post attachment'}
                      isGif={isGifAttachment(firstVisual)}
                      animateGif={animateFeedGif}
                      cornerRadius={thumbRadius}
                      className={`shrink-0 bg-slate-200 dark:bg-slate-800 ${
                        isNarrow
                          ? 'h-11 w-11'
                          : isWide
                          ? 'h-16 w-16'
                          : 'h-14 w-14'
                      }`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`flex items-center gap-1.5 font-mono text-[10px] tabular-nums ${theme.muted}`}>
                      <span>{formatPostTimestamp(post.publishedAt)}</span>
                      {isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className={`inline-flex items-center gap-0.5 font-semibold ${theme.accent}`}>
                            <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                            Pinned
                          </span>
                        </>
                      )}
                    </div>
                    {cleanTitle && (
                      <h4
                        className={`mt-0.5 font-display font-bold line-clamp-1 ${
                          isNarrow ? 'text-xs' : isWide ? 'text-sm sm:text-base' : 'text-sm'
                        }`}
                      >
                        {cleanTitle}
                      </h4>
                    )}
                    {plainBody && (
                      <p
                        className={`mt-0.5 ${
                          isNarrow
                            ? 'text-[11px] line-clamp-1'
                            : isWide
                            ? 'text-xs line-clamp-3'
                            : 'text-xs line-clamp-2'
                        } ${theme.muted}`}
                      >
                        {plainBody}
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold ${theme.accent}`}>
                        {tags.slice(0, isWide ? 4 : 3).map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderCornerRoundnessSlider = (onLightSurface = false) => (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={`font-semibold ${
          onLightSurface ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        Corner Roundness:
      </span>
      <input
        type="range"
        min={0}
        max={28}
        step={2}
        value={widgetCornerRadius}
        onChange={(e) => setWidgetCornerRadius(Number(e.target.value))}
        aria-label="Global widget corner roundness"
        className="w-28 accent-sky-600 cursor-pointer"
      />
      <span className="font-mono text-[11px] font-bold tabular-nums text-sky-700 dark:text-sky-300 w-9">
        {widgetCornerRadius}px
      </span>
      <div className="flex items-center gap-1">
        {[
          { label: 'Sharp', value: 4 },
          { label: 'Crisp', value: 12 },
          { label: 'Soft', value: 22 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setWidgetCornerRadius(preset.value)}
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              widgetCornerRadius === preset.value
                ? 'bg-sky-600 text-white shadow-sm'
                : 'border border-slate-200/90 bg-white/75 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );

  const expandedMeta = useMemo(() => {
    if (!expandedWidget) return null;
    if (expandedWidget === 'countdown') {
      const countdownMode = getCountdownModeFromDims(countdownBoxSize);
      return {
        title: 'Countdown Widget',
        sizeLabel: countdownMode,
        themeLabel:
          WIDGET_THEME_OPTIONS.find((t) => t.id === widgetThemes.countdown)?.label ||
          widgetThemes.countdown,
        checks: [
          {
            label: 'Target event selected',
            ok: Boolean(activeCountdown),
            detail: activeCountdown ? activeCountdown.title : 'Add a countdown in Settings → Events',
          },
          {
            label: 'No clock icon displayed',
            ok: true,
            detail: 'Clean numeric timer & typography only',
          },
          {
            label: 'Deep link target ready',
            ok: true,
            detail: activeCountdown ? `#/?countdown=${activeCountdown.id}` : '#/next',
          },
        ],
      };
    }
    if (expandedWidget === 'liveTile') {
      return {
        title: 'My Diaries Live Tile',
        sizeLabel: `${liveBoxSize.width}×${liveBoxSize.height} px`,
        themeLabel:
          WIDGET_THEME_OPTIONS.find((t) => t.id === widgetThemes.liveTile)?.label ||
          widgetThemes.liveTile,
        checks: [
          {
            label: 'Channel selection valid (CH 1–3)',
            ok: true,
            detail: `${selectedLiveChannel.label} (${selectedLiveChannel.callsign})`,
          },
          {
            label: 'Live / Offline status feed active',
            ok: !liveTileStatus.loading,
            detail: liveTileStatus.loading
              ? 'Checking Twitch status...'
              : liveTileStatus.isLive
              ? liveSimMode === 'live'
                ? 'Simulated LIVE (NOW STREAMING)'
                : 'LIVE right now (NOW STREAMING)'
              : liveSimMode === 'offline'
              ? 'Simulated OFFLINE'
              : 'OFFLINE status verified',
          },
          {
            label: 'Deep link target ready',
            ok: true,
            detail: '#/live',
          },
        ],
      };
    }
    if (expandedWidget === 'diaryCard') {
      return {
        title: 'Single Post Widget',
        sizeLabel: `${singlePostBoxSize.width}px wide`,
        themeLabel:
          WIDGET_THEME_OPTIONS.find((t) => t.id === widgetThemes.diaryCard)?.label ||
          widgetThemes.diaryCard,
        checks: [
          {
            label: 'Selected post loaded',
            ok: Boolean(diaryPost),
            detail: diaryPost ? diaryPost.title?.trim() || 'Text / media post' : 'No posts available',
          },
          {
            label: 'First image / GIF attachment (uncropped)',
            ok: true,
            detail: diaryVisual
              ? isGifAttachment(diaryVisual)
                ? `GIF (${animateDiaryGif ? 'animated' : 'paused still'})`
                : 'Full uncropped image rendered'
              : 'No image attached',
          },
          {
            label: 'Deep link target ready',
            ok: true,
            detail: diaryPost ? `?post=${diaryPost.id}` : '#/timeline',
          },
        ],
      };
    }
    return {
      title: 'Feed Card Widget',
      sizeLabel: `${
        feedLayout === 'full' ? 'Full View' : feedLayout === 'list' ? 'List' : 'Horizontal'
      } · Max ${feedMaxItems}`,
      themeLabel:
        WIDGET_THEME_OPTIONS.find((t) => t.id === widgetThemes.feedCard)?.label ||
        widgetThemes.feedCard,
      checks: [
        {
          label: 'Filtered feed populated',
          ok: feedPosts.length > 0,
          detail: `${feedPosts.length} of ${posts.length} entries shown`,
        },
        {
          label: 'Layout & GIF behavior',
          ok: true,
          detail:
            feedLayout === 'list'
              ? 'List mode (title + date only)'
              : animateFeedGif
              ? 'GIF animation enabled on mobile'
              : 'GIF animation paused (static preview)',
        },
        {
          label: 'Widget feed endpoint ready',
          ok: true,
          detail: '/api/widget-feed.json',
        },
      ],
    };
  }, [
    expandedWidget,
    countdownBoxSize,
    liveBoxSize,
    singlePostBoxSize,
    widgetThemes,
    activeCountdown,
    selectedLiveChannel,
    liveTileStatus,
    liveSimMode,
    diaryPost,
    diaryVisual,
    animateDiaryGif,
    feedLayout,
    feedMaxItems,
    feedPosts.length,
    posts.length,
    animateFeedGif,
  ]);

  return (
    <div className="space-y-6">
      {/* Custom Home-Screen Widget Designs & Visual Mockups */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              MD Dashboard Android Widget Studio
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Customize content, adaptive sizing, corner roundness, GIF playback, and color or adaptive transparent themes for each widget.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOptionsPreviewWidget('countdown')}
            className="aero-button-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Widget Setup Options Preview
          </button>
        </div>

        {/* Wallpaper Backdrop Switcher + Global Corner Roundness */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200 mr-1">
              Phone Wallpaper Preview:
            </span>
            {WALLPAPER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWallpaper(opt.id)}
                className={`rounded-xl px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                  wallpaper === opt.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'border border-slate-200/90 bg-white/75 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {renderCornerRoundnessSlider()}
        </div>

        {/* Simulated Android Launcher Frame with All 4 Configurable Widgets */}
        <div
          className={`relative mx-auto overflow-hidden rounded-[2rem] border-4 border-slate-900/90 p-4 sm:p-6 shadow-2xl transition-colors duration-200 dark:border-slate-700 ${activeWallpaper.frameClass}`}
        >
          <div className="mb-5 flex items-center justify-between px-1 font-mono text-[11px] font-semibold opacity-85 tabular-nums">
            <span>{previewTimeLabel}</span>
            <span>MY DIARIES · ANDROID HOME PREVIEW</span>
            <span>5G · 100%</span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* LEFT COLUMN: Adaptive Countdown + My Diaries Live Tile */}
            <div className="space-y-6 lg:col-span-5">
              {/* 1. Adaptive Countdown Widget (No clock icon) */}
              <div className="rounded-2xl border border-white/15 bg-black/20 p-3.5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider opacity-90">
                    1. Countdown (Adaptive)
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOptionsPreviewWidget('countdown')}
                      title="Countdown widget options"
                      aria-label="Countdown widget options"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedWidget('countdown')}
                      title="Expand countdown preview"
                      aria-label="Expand countdown preview"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-2 text-xs">
                  {countdowns.length > 0 && (
                    <select
                      value={activeCountdown?.id || ''}
                      onChange={(e) => setSelectedCountdownId(e.target.value)}
                      aria-label="Select countdown event"
                      className="w-full rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1.5 text-xs text-white"
                    >
                      {countdowns.map((cd) => (
                        <option key={cd.id} value={cd.id}>
                          {cd.title}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'smallest', label: 'Smallest (Timer)', dims: { width: 212, height: 88 } },
                        { id: 'compact-vertical', label: 'Vertical', dims: { width: 230, height: 142 } },
                        { id: 'compact-horizontal', label: 'Horizontal', dims: { width: 320, height: 92 } },
                        { id: 'expanded-vertical', label: 'Expanded (+#Tags)', dims: { width: 270, height: 192 } },
                      ] as const
                    ).map((mode) => {
                      const active = getCountdownModeFromDims(countdownBoxSize) === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setCountdownBoxSize(mode.dims)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'bg-white/10 text-white/85 hover:bg-white/20'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>

                  {renderWidgetThemePicker('countdown')}
                </div>

                <div className="pt-1">
                  <ResizableWidgetBox
                    size={countdownBoxSize}
                    onChangeSize={setCountdownBoxSize}
                    minWidth={140}
                    maxWidth={440}
                    minHeight={72}
                    maxHeight={240}
                    cornerRadius={widgetCornerRadius}
                    transparentGuide={widgetThemes.countdown === 'transparent'}
                  >
                    {(measured) => renderCountdownWidget(false, measured)}
                  </ResizableWidgetBox>
                </div>
              </div>

              {/* 2. My Diaries Live Glanceable Tile */}
              <div className="rounded-2xl border border-white/15 bg-black/20 p-3.5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider opacity-90">
                    2. My Diaries Live Tile
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOptionsPreviewWidget('liveTile')}
                      title="My Diaries Live widget options"
                      aria-label="My Diaries Live widget options"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedWidget('liveTile')}
                      title="Expand My Diaries Live preview"
                      aria-label="Expand My Diaries Live preview"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-1.5">
                    {liveChannels.map((ch) => (
                      <button
                        key={ch.number}
                        type="button"
                        onClick={() => setSelectedLiveChannelNum(ch.number)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          selectedLiveChannelNum === ch.number
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-white/10 text-white/85 hover:bg-white/20'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'smallest', label: 'Smallest (Channel #)', dims: { width: 156, height: 114 } },
                        { id: 'horizontal-ch', label: 'Horiz. (Channel #)', dims: { width: 225, height: 106 } },
                        { id: 'horizontal-channel', label: 'Horiz. (Channel # Wide)', dims: { width: 310, height: 106 } },
                        { id: 'expanded-vertical', label: 'Vertical', dims: { width: 175, height: 168 } },
                        { id: 'expanded-tall', label: 'Expanded (+#Tags)', dims: { width: 270, height: 210 } },
                      ] as const
                    ).map((mode) => {
                      const active = getLiveTileModeFromDims(liveBoxSize) === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setLiveBoxSize(mode.dims)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            mode.id === 'expanded-tall' ? 'col-span-2' : ''
                          } ${
                            active
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'bg-white/10 text-white/85 hover:bg-white/20'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live / Offline Test Simulator */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold text-white/80 mr-0.5">
                      Simulator:
                    </span>
                    {(
                      [
                        { id: 'auto', label: 'Auto (Twitch)' },
                        { id: 'live', label: 'Simulate LIVE' },
                        { id: 'offline', label: 'Simulate OFFLINE' },
                      ] as const
                    ).map((sim) => (
                      <button
                        key={sim.id}
                        type="button"
                        onClick={() => setLiveSimMode(sim.id)}
                        className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold transition-colors cursor-pointer ${
                          liveSimMode === sim.id
                            ? sim.id === 'live'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-sky-500 text-white shadow-sm'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                      >
                        {sim.label}
                      </button>
                    ))}
                  </div>

                  {renderWidgetThemePicker('liveTile')}
                </div>

                <div className="pt-1">
                  <ResizableWidgetBox
                    size={liveBoxSize}
                    onChangeSize={setLiveBoxSize}
                    minWidth={132}
                    maxWidth={440}
                    minHeight={106}
                    maxHeight={260}
                    cornerRadius={widgetCornerRadius}
                    transparentGuide={widgetThemes.liveTile === 'transparent'}
                  >
                    {(measured) => renderLiveTileWidget(false, measured)}
                  </ResizableWidgetBox>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Single Post + Feed Card */}
            <div className="space-y-6 lg:col-span-7">
              {/* 3. Single Post Widget */}
              <div className="rounded-2xl border border-white/15 bg-black/20 p-3.5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider opacity-90">
                    3. Single Post
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOptionsPreviewWidget('diaryCard')}
                      title="Single Post widget options"
                      aria-label="Single Post widget options"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedWidget('diaryCard')}
                      title="Expand Single Post preview"
                      aria-label="Expand Single Post preview"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={diaryPost?.id || ''}
                      onChange={(e) => setSelectedDiaryPostId(e.target.value)}
                      aria-label="Select post for widget"
                      className="min-w-[180px] flex-1 rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1.5 text-xs text-white"
                    >
                      {posts.length === 0 ? (
                        <option value="">No published posts yet</option>
                      ) : (
                        posts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title?.trim() ||
                              stripHtml(p.bodyHtml).slice(0, 42) ||
                              formatPostTimestamp(p.publishedAt)}
                          </option>
                        ))
                      )}
                    </select>

                    <label className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={animateDiaryGif}
                        onChange={(e) => setAnimateDiaryGif(e.target.checked)}
                        className="accent-sky-400"
                      />
                      <span>Animate GIF on mobile</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'compact', label: 'Compact', dims: { width: 250, height: 220 } },
                        { id: 'standard', label: 'Standard', dims: { width: 360, height: 280 } },
                        { id: 'wide', label: 'Wide', dims: { width: 460, height: 340 } },
                      ] as const
                    ).map((sz) => {
                      const active =
                        sz.id === 'compact'
                          ? singlePostBoxSize.width < 270
                          : sz.id === 'wide'
                          ? singlePostBoxSize.width >= 400
                          : singlePostBoxSize.width >= 270 && singlePostBoxSize.width < 400;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => setSinglePostBoxSize(sz.dims)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'bg-white/10 text-white/85 hover:bg-white/20'
                          }`}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>

                  {renderWidgetThemePicker('diaryCard')}
                </div>

                <div className="pt-1">
                  <ResizableWidgetBox
                    size={singlePostBoxSize}
                    onChangeSize={setSinglePostBoxSize}
                    minWidth={210}
                    maxWidth={560}
                    minHeight={150}
                    maxHeight={560}
                    cornerRadius={widgetCornerRadius}
                    transparentGuide={widgetThemes.diaryCard === 'transparent'}
                  >
                    {(measured) => renderSinglePostWidget(false, measured)}
                  </ResizableWidgetBox>
                </div>
              </div>

              {/* 4. Feed Card Widget */}
              <div className="rounded-2xl border border-white/15 bg-black/20 p-3.5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider opacity-90">
                    4. Feed Card
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOptionsPreviewWidget('feedCard')}
                      title="Feed Card widget options"
                      aria-label="Feed Card widget options"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedWidget('feedCard')}
                      title="Expand Feed Card preview"
                      aria-label="Expand Feed Card preview"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Layout Options: Horizontal, List, Full View */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'horizontal', label: 'Horizontal' },
                        { id: 'list', label: 'List' },
                        { id: 'full', label: 'Full View' },
                      ] as { id: FeedLayoutMode; label: string }[]
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setFeedLayout(mode.id)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          feedLayout === mode.id
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'bg-white/10 text-white/85 hover:bg-white/20'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={feedFilterMode}
                      onChange={(e) => setFeedFilterMode(e.target.value as FeedFilterMode)}
                      aria-label="Feed filter mode"
                      className="rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="all">All Posts</option>
                      <option value="pinned">Pinned Only</option>
                      <option value="tag">Certain Hashtag</option>
                      <option value="date-range">Date Range</option>
                    </select>

                    {feedFilterMode === 'tag' && (
                      <select
                        value={selectedFeedTag}
                        onChange={(e) => setSelectedFeedTag(e.target.value)}
                        aria-label="Filter feed by tag"
                        className="rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1.5 text-xs text-white"
                      >
                        {availableTags.length === 0 ? (
                          <option value="">No tags found</option>
                        ) : (
                          availableTags.map((t) => (
                            <option key={t} value={t}>
                              #{t}
                            </option>
                          ))
                        )}
                      </select>
                    )}

                    {feedFilterMode === 'date-range' && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <YmdDateInput
                          value={feedDateFrom}
                          onChange={setFeedDateFrom}
                          ariaLabel="Feed from date"
                          className="w-[126px]"
                          inputClassName="rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1 text-[11px] text-white"
                          iconClassName="text-slate-300 hover:bg-white/10 hover:text-white"
                        />
                        <span className="text-[11px] opacity-80">to</span>
                        <YmdDateInput
                          value={feedDateTo}
                          onChange={setFeedDateTo}
                          ariaLabel="Feed to date"
                          className="w-[126px]"
                          inputClassName="rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1 text-[11px] text-white"
                          iconClassName="text-slate-300 hover:bg-white/10 hover:text-white"
                        />
                      </div>
                    )}

                    <label className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-slate-950/75 px-2.5 py-1.5 text-[11px] font-semibold text-white">
                      <span>Max</span>
                      <select
                        value={feedMaxItems}
                        onChange={(e) => setFeedMaxItems(Number(e.target.value))}
                        aria-label="Maximum feed posts"
                        className="bg-transparent text-white focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n} className="bg-slate-900">
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>

                    {feedLayout !== 'list' && (
                      <label className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={animateFeedGif}
                          onChange={(e) => setAnimateFeedGif(e.target.checked)}
                          className="accent-sky-400"
                        />
                        <span>Animate GIF on mobile</span>
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'compact', label: 'Compact', dims: { width: 250, height: 220 } },
                        { id: 'standard', label: 'Standard', dims: { width: 360, height: 300 } },
                        { id: 'wide', label: 'Wide / Tall', dims: { width: 470, height: 390 } },
                      ] as const
                    ).map((sz) => {
                      const active =
                        sz.id === 'compact'
                          ? feedBoxSize.width < 270
                          : sz.id === 'wide'
                          ? feedBoxSize.width >= 400
                          : feedBoxSize.width >= 270 && feedBoxSize.width < 400;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => setFeedBoxSize(sz.dims)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'bg-white/10 text-white/85 hover:bg-white/20'
                          }`}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>

                  {renderWidgetThemePicker('feedCard')}
                </div>

                <div className="pt-1">
                  <ResizableWidgetBox
                    size={feedBoxSize}
                    onChangeSize={setFeedBoxSize}
                    minWidth={210}
                    maxWidth={560}
                    minHeight={170}
                    maxHeight={520}
                    cornerRadius={widgetCornerRadius}
                    transparentGuide={widgetThemes.feedCard === 'transparent'}
                  >
                    {(measured) => renderFeedCardWidget(false, measured)}
                  </ResizableWidgetBox>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Android Studio Widget Installation Instructions */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Wrench className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                How to Install Widgets into Android Studio (APK Build)
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Follow these steps in your local Capacitor project (<span className="font-mono">{ANDROID_WIDGET_PACKAGE}</span>) before compiling your APK:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadWidgetCodeZip()}
            className="aero-button-primary inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-white cursor-pointer shadow-md shrink-0"
          >
            <Download className="h-4 w-4" />
            Download Widget Code ZIP (for Android Studio Agent)
          </button>
        </div>

        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs text-slate-700 dark:text-slate-300">
          <li className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-slate-700/70 dark:bg-slate-900/60 space-y-1 overflow-hidden">
            <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
              1. Copy XML Layouts &amp; Drawables
            </div>
            <p className="break-all sm:break-normal">
              Save <span className="font-mono">widget_md_countdown.xml</span>, <span className="font-mono">widget_md_live.xml</span>, and <span className="font-mono">widget_md_dashboard.xml</span> into <span className="font-mono">android/app/src/main/res/layout/</span>, and put <span className="font-mono">widget_surface_bg.xml</span> / <span className="font-mono">widget_surface_transparent.xml</span> into <span className="font-mono">res/drawable/</span>.
            </p>
          </li>

          <li className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-slate-700/70 dark:bg-slate-900/60 space-y-1 overflow-hidden">
            <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
              2. Add Provider Info &amp; Kotlin Class
            </div>
            <p className="break-all sm:break-normal">
              Place <span className="font-mono">md_dashboard_widget_info.xml</span> in <span className="font-mono">res/xml/</span> and <span className="font-mono">MdDashboardWidgetProvider.kt</span> in <span className="font-mono">android/app/src/main/java/com/studiomd/dashboard/</span>. Set <span className="font-mono">BASE_URL</span> to your live URL.
            </p>
          </li>

          <li className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-slate-700/70 dark:bg-slate-900/60 space-y-1 overflow-hidden">
            <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
              3. Register Receiver in AndroidManifest.xml
            </div>
            <p className="break-all sm:break-normal">
              Paste the <span className="font-mono">&lt;receiver&gt;</span> snippet from the manifest tab inside <span className="font-mono">&lt;application&gt;</span> in <span className="font-mono">AndroidManifest.xml</span> (and ensure <span className="font-mono">android.permission.INTERNET</span> is declared).
            </p>
          </li>

          <li className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 dark:border-slate-700/70 dark:bg-slate-900/60 space-y-1 overflow-hidden">
            <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
              4. Sync Capacitor &amp; Build APK
            </div>
            <p className="break-all sm:break-normal">
              Run <span className="font-mono">npm run build &amp;&amp; npx cap sync android &amp;&amp; npx cap open android</span>. In Android Studio, click <strong>Sync Project with Gradle Files</strong>, then <strong>Build → Build APK(s)</strong> (or Run on your device) and add the widget from your phone home screen picker.
            </p>
          </li>
        </ol>
      </section>

      {/* Corresponding Android Widget Layout & Code Structure (com.studiomd.dashboard) */}
      <section className="aero-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              <Code2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Android Widget Code Structure ({ANDROID_WIDGET_PACKAGE})
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Select any file below to inspect or copy directly into your Android Studio project.
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyText(`code-${activeTemplate.id}`, activeTemplate.code)}
            className="aero-button-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedKey === `code-${activeTemplate.id}` ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied {activeTemplate.label}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy File
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {syncedTemplates.map((tpl) => {
            const isSelected = tpl.id === activeTemplate.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveCodeId(tpl.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 text-sky-800 dark:border-sky-400/60 dark:bg-sky-950/60 dark:text-sky-200'
                    : 'border-slate-200/90 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300'
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                <span>{tpl.label}</span>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 text-slate-100 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs">
            <span className="font-mono text-sky-300 truncate">{activeTemplate.path}</span>
            <span className="text-slate-400 text-[11px]">{activeTemplate.summary}</span>
          </div>
          <pre className="max-h-96 overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-slate-100">
            <code>{activeTemplate.code}</code>
          </pre>
        </div>
      </section>

      {/* Widget Setup Options Interactive Preview Modal */}
      {typeof document !== 'undefined' &&
        optionsPreviewWidget &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Widget Setup Options Preview"
            onClick={() => setOptionsPreviewWidget(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="aero-glass w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/50 dark:border-slate-700 max-h-[92vh] flex flex-col"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/85 shrink-0">
                <div>
                  <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                    <SlidersHorizontal className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    Widget Options Setup Preview
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preview the mobile widget setup screen and see how your choices look live before placing it on your home screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOptionsPreviewWidget(null)}
                  aria-label="Close widget options preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Widget Selector Bar */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200/70 bg-white/60 px-5 py-2.5 dark:border-slate-800 dark:bg-slate-900/60 shrink-0">
                {WIDGET_TAB_LABELS.map((tab) => {
                  const active = optionsPreviewWidget === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOptionsPreviewWidget(tab.id)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="overflow-y-auto p-5 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
                {/* Left: Configuration Options Sheet */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white/85 p-4 dark:border-slate-700 dark:bg-slate-900/75 space-y-4 text-xs">
                  <div className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200/70 pb-2 dark:border-slate-800">
                    {WIDGET_TAB_LABELS.find((w) => w.id === optionsPreviewWidget)?.label} Settings
                  </div>

                  {optionsPreviewWidget === 'countdown' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Countdown Event
                        </label>
                        <select
                          value={activeCountdown?.id || ''}
                          onChange={(e) => setSelectedCountdownId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          {countdowns.map((cd) => (
                            <option key={cd.id} value={cd.id}>
                              {cd.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {optionsPreviewWidget === 'liveTile' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Channel
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {liveChannels.map((ch) => (
                            <button
                              key={ch.number}
                              type="button"
                              onClick={() => setSelectedLiveChannelNum(ch.number)}
                              className={`rounded-lg px-2 py-1.5 font-semibold cursor-pointer ${
                                selectedLiveChannelNum === ch.number
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {ch.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {optionsPreviewWidget === 'diaryCard' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Select Post
                        </label>
                        <select
                          value={diaryPost?.id || ''}
                          onChange={(e) => setSelectedDiaryPostId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          {posts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title?.trim() ||
                                stripHtml(p.bodyHtml).slice(0, 42) ||
                                formatPostTimestamp(p.publishedAt)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={animateDiaryGif}
                          onChange={(e) => setAnimateDiaryGif(e.target.checked)}
                          className="h-4 w-4 accent-sky-600"
                        />
                        <span>Animate GIF on mobile</span>
                      </label>
                    </div>
                  )}

                  {optionsPreviewWidget === 'feedCard' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Layout Style
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'horizontal', label: 'Horizontal' },
                              { id: 'list', label: 'List' },
                              { id: 'full', label: 'Full View' },
                            ] as { id: FeedLayoutMode; label: string }[]
                          ).map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setFeedLayout(mode.id)}
                              className={`rounded-lg px-2 py-1.5 font-semibold cursor-pointer ${
                                feedLayout === mode.id
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Filter
                          </label>
                          <select
                            value={feedFilterMode}
                            onChange={(e) =>
                              setFeedFilterMode(e.target.value as FeedFilterMode)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="all">All Posts</option>
                            <option value="pinned">Pinned Only</option>
                            <option value="tag">Certain Hashtag</option>
                            <option value="date-range">Date Range</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Max Posts
                          </label>
                          <select
                            value={feedMaxItems}
                            onChange={(e) => setFeedMaxItems(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {feedFilterMode === 'tag' && (
                        <select
                          value={selectedFeedTag}
                          onChange={(e) => setSelectedFeedTag(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          {availableTags.map((t) => (
                            <option key={t} value={t}>
                              #{t}
                            </option>
                          ))}
                        </select>
                      )}

                      {feedFilterMode === 'date-range' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                              From
                            </label>
                            <YmdDateInput
                              value={feedDateFrom}
                              onChange={setFeedDateFrom}
                              ariaLabel="Feed from date"
                              inputClassName="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                              To
                            </label>
                            <YmdDateInput
                              value={feedDateTo}
                              onChange={setFeedDateTo}
                              ariaLabel="Feed to date"
                              inputClassName="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      {feedLayout !== 'list' && (
                        <label className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={animateFeedGif}
                            onChange={(e) => setAnimateFeedGif(e.target.checked)}
                            className="h-4 w-4 accent-sky-600"
                          />
                          <span>Animate GIF on mobile</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Shared Theme & Corner Roundness */}
                  <div className="border-t border-slate-200/70 pt-3 dark:border-slate-800 space-y-3">
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                        Widget Theme
                      </div>
                      {renderWidgetThemePicker(optionsPreviewWidget, true)}
                    </div>

                    {renderCornerRoundnessSlider(true)}
                  </div>
                </div>

                {/* Right: Live Widget Preview Canvas */}
                <div
                  className={`lg:col-span-7 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[340px] shadow-inner ${activeWallpaper.frameClass}`}
                >
                  {optionsPreviewWidget === 'countdown' && (
                    <ResizableWidgetBox
                      size={countdownBoxSize}
                      onChangeSize={setCountdownBoxSize}
                      minWidth={140}
                      maxWidth={440}
                      minHeight={72}
                      maxHeight={240}
                      cornerRadius={widgetCornerRadius}
                      transparentGuide={widgetThemes.countdown === 'transparent'}
                    >
                      {(measured) => renderCountdownWidget(false, measured)}
                    </ResizableWidgetBox>
                  )}
                  {optionsPreviewWidget === 'liveTile' && (
                    <ResizableWidgetBox
                      size={liveBoxSize}
                      onChangeSize={setLiveBoxSize}
                      minWidth={132}
                      maxWidth={440}
                      minHeight={106}
                      maxHeight={260}
                      cornerRadius={widgetCornerRadius}
                      transparentGuide={widgetThemes.liveTile === 'transparent'}
                    >
                      {(measured) => renderLiveTileWidget(false, measured)}
                    </ResizableWidgetBox>
                  )}
                  {optionsPreviewWidget === 'diaryCard' && (
                    <ResizableWidgetBox
                      size={singlePostBoxSize}
                      onChangeSize={setSinglePostBoxSize}
                      minWidth={210}
                      maxWidth={560}
                      minHeight={150}
                      maxHeight={560}
                      cornerRadius={widgetCornerRadius}
                      transparentGuide={widgetThemes.diaryCard === 'transparent'}
                    >
                      {(measured) => renderSinglePostWidget(false, measured)}
                    </ResizableWidgetBox>
                  )}
                  {optionsPreviewWidget === 'feedCard' && (
                    <ResizableWidgetBox
                      size={feedBoxSize}
                      onChangeSize={setFeedBoxSize}
                      minWidth={210}
                      maxWidth={560}
                      minHeight={170}
                      maxHeight={520}
                      cornerRadius={widgetCornerRadius}
                      transparentGuide={widgetThemes.feedCard === 'transparent'}
                    >
                      {(measured) => renderFeedCardWidget(false, measured)}
                    </ResizableWidgetBox>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Expand Widget Preview & Publish Readiness Modal */}
      {typeof document !== 'undefined' &&
        expandedWidget &&
        expandedMeta &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${expandedMeta.title} Expanded Preview`}
            onClick={() => setExpandedWidget(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="aero-glass w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/50 dark:border-slate-700 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80 shrink-0">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    {expandedMeta.title} · Publish Preview
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Layout: {expandedMeta.sizeLabel} · Theme: {expandedMeta.themeLabel} · Corners: {widgetCornerRadius}px
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedWidget(null)}
                  aria-label="Close expanded preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-5">
                {/* Large wallpaper inspection canvas */}
                <div
                  className={`rounded-3xl p-6 sm:p-8 flex items-center justify-center shadow-inner ${activeWallpaper.frameClass}`}
                >
                  <div className="w-full max-w-md flex justify-center">
                    {expandedWidget === 'countdown' && renderCountdownWidget(true)}
                    {expandedWidget === 'liveTile' && renderLiveTileWidget(true)}
                    {expandedWidget === 'diaryCard' && renderSinglePostWidget(true)}
                    {expandedWidget === 'feedCard' && renderFeedCardWidget(true)}
                  </div>
                </div>

                {/* Publish Readiness Checklist */}
                <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/70 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      Publish Readiness Verification
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        expandedMeta.checks.every((c) => c.ok)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}
                    >
                      {expandedMeta.checks.every((c) => c.ok)
                        ? 'Ready to Publish'
                        : 'Needs Content'}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {expandedMeta.checks.map((chk) => (
                      <div
                        key={chk.label}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {chk.ok ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {chk.label}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[55%]">
                          {chk.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
