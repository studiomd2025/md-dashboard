import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  Film,
  Hash,
  Image as ImageIcon,
  Italic,
  Layers,
  Link2,
  ListVideo,
  Lock,
  LogIn,
  LogOut,
  Music,
  Palette,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Underline,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  AccessRequestRecord,
  BackendTab,
  BannerMode,
  BannerSchedule,
  CollaboratorRecord,
  CountdownFormat,
  CustomThemePreset,
  DesignSettings,
  DiaryFont,
  EventCountdown,
  MediaAttachment,
  PlayEventRecord,
  Post,
  SurfaceStyle,
  ThemePresetId,
} from '../types';
import {
  formatExpandedCountdownDate,
  formatFileSize,
  formatHourMinute12h,
  formatPostTimestamp,
  getFontClass,
  normalizeTag,
  sanitizeRichHtml,
  stripHtml,
} from '../lib/mediaUtils';
import {
  DEFAULT_TIME_ZONE,
  getTimeZoneAbbr,
  isoToWallClockInput,
  wallClockToIso,
} from '../lib/timeZones';
import { uploadMediaFile } from '../lib/cloudinaryUpload';
import { BOOTSTRAP_OWNER_EMAILS } from '../lib/firebase';
import {
  getCustomOnlyThemes,
  PRELOADED_EDITABLE_THEME_IDS,
  PRELOADED_THEME_DEFAULTS,
  resolvePreloadedThemePreset,
} from '../lib/themeColors';
import { resolveActiveBanner } from './ScheduledBanner';
import { TimeZoneSelect } from './TimeZoneSelect';
import { FontSelect } from './FontSelect';
import { YmdDateInput, YmdDateTimeInput } from './YmdDateInputs';
import { mergePlayEvents, PLAY_EVENTS, type PlayEventItem } from './LiveTvView';

interface BackendConsoleViewProps {
  activeTab: BackendTab;
  onSelectTab: (tab: BackendTab) => void;
  posts: Post[];
  scheduledPosts: Post[];
  draftPosts: Post[];
  countdowns: EventCountdown[];
  tagCounts: { tag: string; count: number }[];
  banners: BannerSchedule[];
  design: DesignSettings;
  now: Date;
  onOpenNewComposer: () => void;
  onEditPost: (post: Post) => void;
  onDeletePost: (id: string) => Promise<void>;
  onPublishNow: (post: Post) => Promise<void>;
  onTogglePin: (post: Post) => Promise<void>;
  onAddCountdown: (payload: {
    title: string;
    targetAt: string;
    timeZone?: string;
    tag?: string;
    bodyHtml?: string;
    font?: DiaryFont;
    displayFormat?: CountdownFormat;
    attachments?: MediaAttachment[];
    milestoneBodyHtml?: string;
    milestoneFont?: DiaryFont;
    milestoneAttachments?: MediaAttachment[];
  }) => Promise<void>;
  onUpdateCountdown: (
    id: string,
    payload: Omit<EventCountdown, 'id'>
  ) => Promise<void>;
  onDeleteCountdown: (id: string) => Promise<void>;
  customPlayEvents?: PlayEventRecord[];
  onAddPlayEvent?: (payload: Omit<PlayEventRecord, 'id'>) => Promise<void>;
  onUpdatePlayEvent?: (
    id: string,
    payload: Omit<PlayEventRecord, 'id'>
  ) => Promise<void>;
  onDeletePlayEvent?: (id: string) => Promise<void>;
  onRestorePlayEvent?: (id: string) => Promise<void>;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
  onFilterByTag: (tag: string) => void;
  onAddBanner: (payload: Omit<BannerSchedule, 'id'>) => Promise<void>;
  onUpdateBanner: (id: string, patch: Partial<BannerSchedule>) => Promise<void>;
  onDeleteBanner: (id: string) => Promise<void>;
  onUpdateDesign: (next: Partial<DesignSettings>) => Promise<void>;
  collaborators: CollaboratorRecord[];
  accessRequests: AccessRequestRecord[];
  onAddCollaborator: (email: string, note?: string) => Promise<void>;
  onRemoveCollaborator: (emailId: string) => Promise<void>;
  onApproveRequest: (req: AccessRequestRecord) => Promise<void>;
  onDeclineRequest: (uid: string) => Promise<void>;
  onOpenRegister: () => void;
  hasPendingRequest?: boolean;
  isAdmin: boolean;
  userEmail?: string | null;
  authError?: string;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const THEME_PRESETS: {
  id: ThemePresetId;
  label: string;
  description: string;
  swatches: [string, string, string];
}[] = [
  {
    id: 'default',
    label: 'System Default',
    description: 'Adapts automatically to your device Light or Dark mode with clean neutral gray surfaces.',
    swatches: ['#f3f4f6', '#64748b', '#121417'],
  },
  {
    id: 'aero-daylight',
    label: 'Frutiger Aero Daylight',
    description: 'Sunlit cyan sky, turquoise accents, and clear frosted glass.',
    swatches: ['#eff8fd', '#38bdf8', '#10b981'],
  },
  {
    id: 'twilight-lagoon',
    label: 'Twilight Lagoon',
    description: 'Deep ocean slate canvas with luminous cyan-emerald glass.',
    swatches: ['#06131c', '#0ea5e9', '#10b981'],
  },
  {
    id: 'metro-prism-light',
    label: 'Frutiger Metro Daylight',
    description: 'Bright geometric vector ribbons and rings over crisp light glass.',
    swatches: ['#f4fbff', '#06b6d4', '#2563eb'],
  },
  {
    id: 'metro-eclipse-dark',
    label: 'Frutiger Metro Eclipse',
    description: 'Midnight obsidian canvas with sleek cyan-teal Frutiger Metro vector art.',
    swatches: ['#050d17', '#22d3ee', '#0284c7'],
  },
  {
    id: 'metro-ipod-pop',
    label: 'Frutiger Metro Neon Pop',
    description: 'Bright iPod-era lime, hot pink, cyan, and tangerine vector burst over light glass.',
    swatches: ['#f7fff4', '#ec4899', '#84cc16'],
  },
  {
    id: 'metro-ipod-electric',
    label: 'Frutiger Metro Electric Club',
    description: 'Deep midnight violet canvas with glowing neon cyan, acid lime, and hot pink swooshes.',
    swatches: ['#0b0719', '#22d3ee', '#ec4899'],
  },
  {
    id: 'meadow-mint',
    label: 'Meadow Mint Breeze',
    description: 'Fresh botanical mint canvas with emerald glass highlights.',
    swatches: ['#ecfdf5', '#34d399', '#0284c7'],
  },
  {
    id: 'sunset-glass',
    label: 'Sunset Tangerine Glass',
    description: 'Warm nostalgic peach-amber glow paired with clean glass.',
    swatches: ['#fff7ed', '#fb923c', '#e11d48'],
  },
  {
    id: 'crystal-pearl',
    label: 'Crystal Pearl Minimal',
    description: 'Crisp 2026 alabaster surfaces with high-contrast slate ink.',
    swatches: ['#f8fafc', '#cbd5e1', '#0f172a'],
  },
  {
    id: 'y2k-chrome-cd',
    label: 'Y2K Liquid Chrome CD',
    description: 'Brushed silver metallic sheen, iridescent CD refraction, and cobalt iMac glass.',
    swatches: ['#cbd5e1', '#e2e8f0', '#2563eb'],
  },
  {
    id: 'y2k-phosphor-grid',
    label: 'Y2K Phosphor Cyber Grid',
    description: 'Early-2000s PS2/Winamp wireframe terminal with acid lime and cyber teal.',
    swatches: ['#07110d', '#a3e635', '#0d9488'],
  },
  {
    id: 'y2k-bubblegum-flip',
    label: 'Y2K Candy Flip Hologram',
    description: '2001 Shibuya flip-phone pearlescent lilac metallic with hot-pink chrome accents.',
    swatches: ['#f3e8ff', '#ec4899', '#7c3aed'],
  },
  {
    id: 'y2k-arcade-peach',
    label: 'Y2K Dreamcast Tangerine',
    description: 'Warm retro cream halftone swirls paired with arcade tangerine and teal.',
    swatches: ['#faf2e4', '#f97316', '#0891b2'],
  },
];

const COUNTDOWN_COLORS = ['#0f172a', '#0284c7', '#059669', '#e11d48', '#d97706'];

export const BackendConsoleView: React.FC<BackendConsoleViewProps> = ({
  activeTab,
  onSelectTab,
  posts,
  scheduledPosts,
  draftPosts,
  countdowns,
  tagCounts,
  banners,
  design,
  now,
  onOpenNewComposer,
  onEditPost,
  onDeletePost,
  onPublishNow,
  onTogglePin,
  onAddCountdown,
  onUpdateCountdown,
  onDeleteCountdown,
  onRenameTag,
  onDeleteTag,
  onFilterByTag,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onUpdateDesign,
  customPlayEvents = [],
  onAddPlayEvent,
  onUpdatePlayEvent,
  onDeletePlayEvent,
  onRestorePlayEvent,
  collaborators,
  accessRequests,
  onAddCollaborator,
  onRemoveCollaborator,
  onApproveRequest,
  onDeclineRequest,
  onOpenRegister,
  hasPendingRequest = false,
  isAdmin,
  userEmail,
  authError,
  onSignIn,
  onSignOut,
}) => {
  // Team management state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamStatusMsg, setTeamStatusMsg] = useState('');
  const [teamErrorMsg, setTeamErrorMsg] = useState('');

  // Tag management state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tagBusy, setTagBusy] = useState(false);

  // Next on MD (Countdown) creator / editor state
  const cdFormRef = useRef<HTMLElement>(null);
  const cdEditorRef = useRef<HTMLDivElement>(null);
  const cdFileRef = useRef<HTMLInputElement>(null);
  const milestoneEditorRef = useRef<HTMLDivElement>(null);
  const milestoneFileRef = useRef<HTMLInputElement>(null);
  const [editingCountdownId, setEditingCountdownId] = useState<string | null>(null);
  const [cdLocation, setCdLocation] = useState<string | undefined>(undefined);
  const [cdTitle, setCdTitle] = useState('');
  const [cdTarget, setCdTarget] = useState('');
  const [cdTimeZone, setCdTimeZone] = useState<string>(DEFAULT_TIME_ZONE);
  const [cdTag, setCdTag] = useState('');
  const [cdFormat, setCdFormat] = useState<CountdownFormat>('full');
  const [cdFont, setCdFont] = useState<DiaryFont>('sans');
  const [cdBodyHtml, setCdBodyHtml] = useState('');
  const [cdAttachments, setCdAttachments] = useState<MediaAttachment[]>([]);
  const [cdUploading, setCdUploading] = useState(false);
  const [cdSaving, setCdSaving] = useState(false);
  const [cdStatusMsg, setCdStatusMsg] = useState('');
  const [milestoneFont, setMilestoneFont] = useState<DiaryFont>('sans');
  const [milestoneBodyHtml, setMilestoneBodyHtml] = useState('');
  const [milestoneAttachments, setMilestoneAttachments] = useState<MediaAttachment[]>([]);
  const [milestoneUploading, setMilestoneUploading] = useState(false);

  // Play Event playlist creator / editor state
  const peFormRef = useRef<HTMLElement>(null);
  const [editingPlayEventId, setEditingPlayEventId] = useState<string | null>(null);
  const [peUrl, setPeUrl] = useState('');
  const [peTitle, setPeTitle] = useState('');
  const [peDate, setPeDate] = useState('');
  const [peEraSelect, setPeEraSelect] = useState<string>('Daliatime Era');
  const [peCustomEra, setPeCustomEra] = useState('');
  const [peScheduleEnabled, setPeScheduleEnabled] = useState(false);
  const [peScheduledAt, setPeScheduledAt] = useState('');
  const [peScheduledTz, setPeScheduledTz] = useState<string>(DEFAULT_TIME_ZONE);
  const [peSaving, setPeSaving] = useState(false);
  const [peStatusMsg, setPeStatusMsg] = useState('');
  const [peErrorMsg, setPeErrorMsg] = useState('');

  // Settings sub-navigation responsive layout state (Observer-backed for precision across sidebar states)
  const tabNavRef = useRef<HTMLDivElement>(null);
  const [tabNavWidth, setTabNavWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? window.innerWidth - 380 : window.innerWidth;
    }
    return 800;
  });

  useEffect(() => {
    const el = tabNavRef.current;
    if (!el) return;

    const updateWidth = () => {
      setTabNavWidth(el.getBoundingClientRect().width);
    };

    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTabNavWidth(entry.contentRect.width);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Banner upload/schedule state
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const bannerCaptionRef = useRef<HTMLDivElement>(null);
  const savedBannerRangeRef = useRef<Range | null>(null);
  const backdropFileRef = useRef<HTMLInputElement>(null);
  const customThemeBackdropRef = useRef<HTMLInputElement>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitleHtml, setBannerSubtitleHtml] = useState('');
  const [showBannerLinkInput, setShowBannerLinkInput] = useState(false);
  const [bannerLinkUrl, setBannerLinkUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerMode, setBannerMode] = useState<BannerMode>('slideshow');
  const [bannerStartAt, setBannerStartAt] = useState('');
  const [bannerEndAt, setBannerEndAt] = useState('');
  const [bannerStartHour, setBannerStartHour] = useState(9);
  const [bannerEndHour, setBannerEndHour] = useState(17);
  const [bannerTimeZone, setBannerTimeZone] = useState<string>(DEFAULT_TIME_ZONE);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerStatusMsg, setBannerStatusMsg] = useState('');
  const [bannerPreviewError, setBannerPreviewError] = useState(false);
  const [isUploadingBackdrop, setIsUploadingBackdrop] = useState(false);
  const [customBackdropInput, setCustomBackdropInput] = useState(
    design.customBackdropUrl || ''
  );

  // Custom Theme Creator & Editor state
  const [showCustomThemeBuilder, setShowCustomThemeBuilder] = useState(false);
  const [editingCustomThemeId, setEditingCustomThemeId] = useState<string | null>(null);
  const [showManagePlaylistsDrawer, setShowManagePlaylistsDrawer] = useState(false);
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [manageEraFilter, setManageEraFilter] = useState<string>('all');
  const [ctName, setCtName] = useState('');
  const [ctIsDark, setCtIsDark] = useState(false);
  const [ctSurface, setCtSurface] = useState<SurfaceStyle>('aero-glass');
  const [ctCanvasBg, setCtCanvasBg] = useState('#f0f9ff');
  const [ctAccentStart, setCtAccentStart] = useState('#38bdf8');
  const [ctAccentEnd, setCtAccentEnd] = useState('#0284c7');
  const [ctBackdropUrl, setCtBackdropUrl] = useState('');
  const [isUploadingCustomThemeBg, setIsUploadingCustomThemeBg] = useState(false);

  const [uploadError, setUploadError] = useState('');

  const formatActionError = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) {
      try {
        const parsed = JSON.parse(err.message) as { error?: string };
        return parsed?.error || err.message;
      } catch {
        return err.message;
      }
    }
    return fallback;
  };

  const activeBanner = resolveActiveBanner(banners, now);
  const nowMs = now.getTime();

  const uploadFileToServer = async (
    file: File
  ): Promise<{ url: string; fileName: string; mimeType: string; fileSize: number } | null> => {
    setUploadError('');
    try {
      return await uploadMediaFile(file);
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to upload file. Please check file size and try again.'
      );
      return null;
    }
  };

  const handleCountdownMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCdUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFileToServer(file);
        if (!uploaded) continue;
        let type: MediaAttachment['type'] = 'document';
        if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
          type = 'gif';
        } else if (file.type.startsWith('image/')) {
          type = 'image';
        } else if (file.type.startsWith('video/')) {
          type = 'video';
        } else if (file.type.startsWith('audio/')) {
          type = 'audio';
        }
        setCdAttachments((prev) => [
          ...prev,
          {
            id: `cd-att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type,
            url: uploaded.url,
            title: uploaded.fileName,
            mimeType: uploaded.mimeType,
            fileSize: uploaded.fileSize,
          },
        ]);
      }
    } finally {
      setCdUploading(false);
      if (cdFileRef.current) cdFileRef.current.value = '';
    }
  };

  const execCdFormat = (command: string, value?: string) => {
    cdEditorRef.current?.focus();
    document.execCommand(command, false, value);
    if (cdEditorRef.current) {
      setCdBodyHtml(cdEditorRef.current.innerHTML);
    }
  };

  const execMilestoneFormat = (command: string, value?: string) => {
    milestoneEditorRef.current?.focus();
    document.execCommand(command, false, value);
    if (milestoneEditorRef.current) {
      setMilestoneBodyHtml(milestoneEditorRef.current.innerHTML);
    }
  };

  const handleMilestoneMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setMilestoneUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFileToServer(file);
        if (!uploaded) continue;
        let type: MediaAttachment['type'] = 'document';
        if (file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')) {
          type = 'gif';
        } else if (file.type.startsWith('image/')) {
          type = 'image';
        } else if (file.type.startsWith('video/')) {
          type = 'video';
        } else if (file.type.startsWith('audio/')) {
          type = 'audio';
        }
        setMilestoneAttachments((prev) => [
          ...prev,
          {
            id: `ms-att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type,
            url: uploaded.url,
            title: uploaded.fileName,
            mimeType: uploaded.mimeType,
            fileSize: uploaded.fileSize,
          },
        ]);
      }
    } finally {
      setMilestoneUploading(false);
      if (milestoneFileRef.current) milestoneFileRef.current.value = '';
    }
  };

  const resetCountdownForm = () => {
    setEditingCountdownId(null);
    setCdLocation(undefined);
    setCdTitle('');
    setCdTarget('');
    setCdTimeZone(DEFAULT_TIME_ZONE);
    setCdTag('');
    setCdFormat('full');
    setCdFont('sans');
    setCdBodyHtml('');
    setCdAttachments([]);
    setMilestoneFont('sans');
    setMilestoneBodyHtml('');
    setMilestoneAttachments([]);
    if (cdEditorRef.current) cdEditorRef.current.innerHTML = '';
    if (milestoneEditorRef.current) milestoneEditorRef.current.innerHTML = '';
  };

  const handleStartEditCountdown = (cd: EventCountdown) => {
    const tz = cd.timeZone || DEFAULT_TIME_ZONE;
    const safeBody = sanitizeRichHtml(cd.bodyHtml || '');
    const safeMilestone = sanitizeRichHtml(cd.milestoneBodyHtml || '');

    setUploadError('');
    setCdStatusMsg('');
    setEditingCountdownId(cd.id);
    setCdLocation(cd.location);
    setCdTitle(cd.title || '');
    setCdTimeZone(tz);
    setCdTarget(isoToWallClockInput(cd.targetAt, tz));
    setCdTag(cd.tag || '');
    setCdFormat(cd.displayFormat === 'compact' ? 'full' : (cd.displayFormat || 'full'));
    setCdFont(cd.font || 'sans');
    setCdBodyHtml(safeBody);
    setCdAttachments(cd.attachments ? [...cd.attachments] : []);
    setMilestoneFont(cd.milestoneFont || 'sans');
    setMilestoneBodyHtml(safeMilestone);
    setMilestoneAttachments(
      cd.milestoneAttachments ? [...cd.milestoneAttachments] : []
    );

    if (cdEditorRef.current) cdEditorRef.current.innerHTML = safeBody;
    if (milestoneEditorRef.current) {
      milestoneEditorRef.current.innerHTML = safeMilestone;
    }

    cdFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateCountdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdTitle.trim() || !cdTarget) return;
    setUploadError('');
    setCdStatusMsg('');
    const cleanedHtml = sanitizeRichHtml(cdEditorRef.current?.innerHTML || cdBodyHtml);
    const cleanedMilestoneHtml = sanitizeRichHtml(
      milestoneEditorRef.current?.innerHTML || milestoneBodyHtml
    );
    const payload: Omit<EventCountdown, 'id'> = {
      title: cdTitle.trim(),
      targetAt: wallClockToIso(cdTarget, cdTimeZone),
      timeZone: cdTimeZone,
      tag: cdTag.trim() ? normalizeTag(cdTag) : undefined,
      location: cdLocation,
      bodyHtml: cleanedHtml,
      font: cdFont,
      displayFormat: cdFormat,
      attachments: cdAttachments,
      milestoneBodyHtml: cleanedMilestoneHtml,
      milestoneFont,
      milestoneAttachments,
    };

    setCdSaving(true);
    try {
      const wasEditing = Boolean(editingCountdownId);
      if (editingCountdownId) {
        await onUpdateCountdown(editingCountdownId, payload);
      } else {
        await onAddCountdown(payload);
      }
      resetCountdownForm();
      setCdStatusMsg(wasEditing ? 'Countdown updated.' : 'Countdown added.');
    } catch (err) {
      setUploadError(formatActionError(err, 'Failed to save countdown.'));
    } finally {
      setCdSaving(false);
    }
  };

  const parsePlayEventLink = (
    rawUrl: string
  ): {
    kind: 'youtube-playlist' | 'youtube-video';
    mediaId: string;
    normalizedUrl: string;
  } | null => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (
        host === 'youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'music.youtube.com' ||
        host === 'youtu.be'
      ) {
        const listId = parsed.searchParams.get('list');
        if (listId) {
          return {
            kind: 'youtube-playlist',
            mediaId: listId,
            normalizedUrl: trimmed,
          };
        }
        let videoId = parsed.searchParams.get('v');
        if (host === 'youtu.be') {
          videoId = parsed.pathname.replace(/^\//, '').split('/')[0] || null;
        } else if (parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/')[2] || null;
        } else if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/')[2] || null;
        }
        if (videoId) {
          return {
            kind: 'youtube-video',
            mediaId: videoId,
            normalizedUrl: trimmed,
          };
        }
      }
    } catch {
      // ignore invalid URL syntax
    }
    if (/^PL[a-zA-Z0-9_-]{8,}$/.test(trimmed)) {
      return {
        kind: 'youtube-playlist',
        mediaId: trimmed,
        normalizedUrl: `https://www.youtube.com/playlist?list=${encodeURIComponent(trimmed)}`,
      };
    }
    return null;
  };

  const resetPlayEventForm = () => {
    setEditingPlayEventId(null);
    setPeUrl('');
    setPeTitle('');
    setPeDate('');
    setPeEraSelect('Daliatime Era');
    setPeCustomEra('');
    setPeScheduleEnabled(false);
    setPeScheduledAt('');
    setPeScheduledTz(DEFAULT_TIME_ZONE);
    setPeErrorMsg('');
  };

  const handleStartEditPlayEvent = (ev: PlayEventRecord) => {
    setEditingPlayEventId(ev.id);
    setPeUrl(ev.url);
    setPeTitle(ev.title);
    const isoDate = /^\d{4}\.\d{1,2}\.\d{1,2}$/.test(ev.dateLabel)
      ? ev.dateLabel
          .split('.')
          .map((part, idx) => (idx > 0 ? part.padStart(2, '0') : part))
          .join('-')
      : '';
    setPeDate(isoDate || ev.dateLabel);
    const knownEras = ['Interim Era', 'Caratime Era', 'Daliatime Era'];
    if (!ev.era) {
      setPeEraSelect('Daliatime Era');
      setPeCustomEra('');
    } else if (knownEras.includes(ev.era)) {
      setPeEraSelect(ev.era);
      setPeCustomEra('');
    } else {
      setPeEraSelect('custom');
      setPeCustomEra(ev.era);
    }
    if (ev.scheduledFor) {
      const tz = ev.scheduledTimeZone || DEFAULT_TIME_ZONE;
      setPeScheduleEnabled(true);
      setPeScheduledTz(tz);
      setPeScheduledAt(isoToWallClockInput(ev.scheduledFor, tz));
    } else {
      setPeScheduleEnabled(false);
      setPeScheduledTz(DEFAULT_TIME_ZONE);
      setPeScheduledAt('');
    }
    setPeStatusMsg('');
    setPeErrorMsg('');
    peFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSavePlayEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peTitle.trim() || !peUrl.trim() || peSaving) return;
    setPeErrorMsg('');
    setPeStatusMsg('');

    const parsedLink = parsePlayEventLink(peUrl);
    if (!parsedLink) {
      setPeErrorMsg(
        'Please enter a valid YouTube playlist link (containing ?list=...) or YouTube video URL.'
      );
      return;
    }

    if (peEraSelect === 'custom' && !peCustomEra.trim()) {
      setPeErrorMsg('Please enter a name for the new Era.');
      return;
    }

    if (peScheduleEnabled && !peScheduledAt.trim()) {
      setPeErrorMsg('Please choose a scheduled publish date & time, or turn off Schedule.');
      return;
    }

    const rawDate = peDate.trim();
    let dateLabel = rawDate;
    let year = 'Archive';
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-');
      dateLabel = `${y}.${m}.${d}`;
      year = y;
    } else if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(rawDate)) {
      year = rawDate.split('.')[0];
    } else {
      const ym = rawDate.match(/(20\d{2}|19\d{2})/);
      if (ym) year = ym[1];
      if (!dateLabel) dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      if (year === 'Archive' && !rawDate) year = String(new Date().getFullYear());
    }

    const resolvedEra =
      peEraSelect === 'custom' ? peCustomEra.trim() : peEraSelect;

    const scheduledFor =
      peScheduleEnabled && peScheduledAt.trim()
        ? wallClockToIso(peScheduledAt, peScheduledTz)
        : null;
    const scheduledTimeZone =
      peScheduleEnabled && scheduledFor ? peScheduledTz : null;

    setPeSaving(true);
    try {
      const payload: Omit<PlayEventRecord, 'id'> = {
        title: peTitle.trim(),
        url: parsedLink.normalizedUrl,
        kind: parsedLink.kind,
        mediaId: parsedLink.mediaId,
        dateLabel,
        year,
        era: resolvedEra,
        scheduledFor,
        scheduledTimeZone,
      };
      const isFutureSchedule = Boolean(
        scheduledFor && new Date(scheduledFor).getTime() > Date.now()
      );
      if (editingPlayEventId && onUpdatePlayEvent) {
        await onUpdatePlayEvent(editingPlayEventId, payload);
        setPeStatusMsg(
          isFutureSchedule
            ? 'Playlist scheduled for Live → Play Event.'
            : 'Playlist updated in Live → Play Event.'
        );
      } else if (onAddPlayEvent) {
        await onAddPlayEvent(payload);
        setPeStatusMsg(
          isFutureSchedule
            ? 'Playlist scheduled for Live → Play Event.'
            : 'Playlist added to Live → Play Event.'
        );
      }
      resetPlayEventForm();
    } catch (err) {
      setPeErrorMsg(formatActionError(err, 'Could not save playlist.'));
    } finally {
      setPeSaving(false);
    }
  };

  const handleCustomThemeBackdropUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingCustomThemeBg(true);
    try {
      const uploaded = await uploadFileToServer(file);
      if (uploaded?.url) setCtBackdropUrl(uploaded.url);
    } finally {
      setIsUploadingCustomThemeBg(false);
      if (customThemeBackdropRef.current) customThemeBackdropRef.current.value = '';
    }
  };

  const handleSaveCustomTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctName.trim()) return;
    setUploadError('');
    const themes = design.customThemes || [];
    let nextList: CustomThemePreset[];
    let resolvedThemeId = editingCustomThemeId || `custom-${Date.now()}`;

    const newTheme: CustomThemePreset = {
      id: resolvedThemeId,
      name: ctName.trim(),
      isDark: ctIsDark,
      canvasBg: ctCanvasBg,
      surfaceStyle: ctSurface,
      accentStart: ctAccentStart,
      accentEnd: ctAccentEnd,
      backdropImageUrl: ctBackdropUrl.trim() || undefined,
    };

    if (editingCustomThemeId) {
      const exists = themes.some((t) => t.id === editingCustomThemeId);
      if (exists) {
        nextList = themes.map((t) => (t.id === editingCustomThemeId ? newTheme : t));
      } else {
        nextList = [...themes, newTheme];
      }
    } else {
      nextList = [...themes, newTheme];
    }

    try {
      await onUpdateDesign({
        customThemes: nextList,
        theme: resolvedThemeId,
        surfaceStyle: newTheme.surfaceStyle,
      });
      setCtName('');
      setCtBackdropUrl('');
      setEditingCustomThemeId(null);
      setShowCustomThemeBuilder(false);
    } catch (err) {
      setUploadError(formatActionError(err, 'Failed to save custom theme.'));
    }
  };

  const handleEditPreloadedTheme = (presetId: string) => {
    if (presetId === 'default') return;
    const resolved = resolvePreloadedThemePreset(presetId, design.customThemes);
    if (!resolved) return;
    setEditingCustomThemeId(presetId);
    setCtName(resolved.name);
    setCtIsDark(resolved.isDark);
    setCtSurface(resolved.surfaceStyle || 'aero-glass');
    setCtCanvasBg(resolved.canvasBg || '#f0f9ff');
    setCtAccentStart(resolved.accentStart || '#38bdf8');
    setCtAccentEnd(resolved.accentEnd || '#0284c7');
    setCtBackdropUrl(resolved.backdropImageUrl || '');
    setShowCustomThemeBuilder(true);
  };

  const handleResetPreloadedTheme = async (presetId: string) => {
    if (presetId === 'default') return;
    const nextList = (design.customThemes || []).filter((t) => t.id !== presetId);
    const defaultBase = PRELOADED_THEME_DEFAULTS[presetId];
    if (editingCustomThemeId === presetId) {
      setEditingCustomThemeId(null);
      setShowCustomThemeBuilder(false);
    }
    await onUpdateDesign({
      customThemes: nextList,
      ...(design.theme === presetId && defaultBase
        ? { surfaceStyle: defaultBase.surfaceStyle }
        : {}),
    });
  };

  const customOnlyThemes = useMemo(
    () => getCustomOnlyThemes(design.customThemes),
    [design.customThemes]
  );

  const handleStartEditCustomTheme = (ct: CustomThemePreset) => {
    setEditingCustomThemeId(ct.id);
    setCtName(ct.name);
    setCtIsDark(ct.isDark);
    setCtSurface(ct.surfaceStyle || 'aero-glass');
    setCtCanvasBg(ct.canvasBg || '#f0f9ff');
    setCtAccentStart(ct.accentStart || '#38bdf8');
    setCtAccentEnd(ct.accentEnd || '#0284c7');
    setCtBackdropUrl(ct.backdropImageUrl || '');
    setShowCustomThemeBuilder(true);
  };

  const handleDeleteCustomTheme = async (id: string) => {
    const nextList = (design.customThemes || []).filter((t) => t.id !== id);
    await onUpdateDesign({
      customThemes: nextList,
      ...(design.theme === id ? { theme: 'default' } : {}),
    });
  };

  const handleBannerFileChange = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingBanner(true);
    setBannerStatusMsg('');
    setBannerPreviewError(false);
    try {
      const uploaded = await uploadFileToServer(file);
      if (uploaded?.url) {
        setBannerImageUrl(uploaded.url);
        setBannerStatusMsg('Image uploaded. Click Save Banner below to publish it.');
      }
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  const handleBackdropFileChange = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingBackdrop(true);
    try {
      const uploaded = await uploadFileToServer(file);
      if (uploaded?.url) {
        setCustomBackdropInput(uploaded.url);
        await onUpdateDesign({ customBackdropUrl: uploaded.url });
      }
    } finally {
      setIsUploadingBackdrop(false);
      if (backdropFileRef.current) backdropFileRef.current.value = '';
    }
  };

  const captureBannerSelection = () => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      bannerCaptionRef.current?.contains(sel.anchorNode)
    ) {
      savedBannerRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const execBannerCaptionFormat = (command: string, value?: string) => {
    bannerCaptionRef.current?.focus();
    if (savedBannerRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedBannerRangeRef.current);
      }
    }
    document.execCommand(command, false, value);
    if (bannerCaptionRef.current) {
      setBannerSubtitleHtml(bannerCaptionRef.current.innerHTML);
    }
  };

  const handleApplyBannerLink = () => {
    const trimmed = bannerLinkUrl.trim();
    if (!trimmed) return;
    const normalized =
      /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#')
        ? trimmed
        : `https://${trimmed}`;

    bannerCaptionRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedBannerRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedBannerRangeRef.current);
    }

    const activeSel = window.getSelection();
    if (activeSel && activeSel.toString().length > 0) {
      document.execCommand('createLink', false, normalized);
    } else {
      const anchorHtml = `<a href="${normalized.replace(/"/g, '&quot;')}">${normalized}</a>`;
      document.execCommand('insertHTML', false, anchorHtml);
    }

    if (bannerCaptionRef.current) {
      setBannerSubtitleHtml(bannerCaptionRef.current.innerHTML);
    }
    savedBannerRangeRef.current = null;
    setBannerLinkUrl('');
    setShowBannerLinkInput(false);
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl.trim() || isSavingBanner || isUploadingBanner) return;
    setUploadError('');
    setBannerStatusMsg('');
    setIsSavingBanner(true);
    const rawHtml = bannerCaptionRef.current?.innerHTML || bannerSubtitleHtml;
    const cleanedCaption = sanitizeRichHtml(rawHtml);
    const clampedStartHour = Math.max(0, Math.min(23, Math.floor(Number(bannerStartHour) || 0)));
    const clampedEndHour = Math.max(0, Math.min(23, Math.floor(Number(bannerEndHour) || 0)));
    try {
      await onAddBanner({
        title: bannerTitle.trim(),
        subtitle: stripHtml(cleanedCaption),
        subtitleHtml: cleanedCaption,
        imageUrl: bannerImageUrl.trim(),
        mode: bannerMode,
        startAt:
          bannerMode === 'window' && bannerStartAt
            ? wallClockToIso(bannerStartAt, bannerTimeZone)
            : undefined,
        endAt:
          bannerMode === 'window' && bannerEndAt
            ? wallClockToIso(bannerEndAt, bannerTimeZone)
            : undefined,
        dailyStartHour: bannerMode === 'daily-hours' ? clampedStartHour : undefined,
        dailyEndHour: bannerMode === 'daily-hours' ? clampedEndHour : undefined,
        timeZone:
          bannerMode === 'window' || bannerMode === 'daily-hours'
            ? bannerTimeZone
            : undefined,
        priority:
          bannerMode === 'window'
            ? 40
            : bannerMode === 'daily-hours'
            ? 20
            : bannerMode === 'slideshow'
            ? 15
            : 50,
      });
      setBannerTitle('');
      setBannerSubtitleHtml('');
      setBannerImageUrl('');
      setBannerStartAt('');
      setBannerEndAt('');
      setBannerTimeZone(DEFAULT_TIME_ZONE);
      if (bannerCaptionRef.current) bannerCaptionRef.current.innerHTML = '';
      setBannerStatusMsg('Banner saved! It is now listed below and active on your dashboard.');
    } catch (err) {
      setUploadError(formatActionError(err, 'Failed to save banner.'));
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleConfirmRenameTag = async (oldTag: string) => {
    if (!renameValue.trim() || renameValue.trim() === oldTag) {
      setEditingTag(null);
      return;
    }
    setTagBusy(true);
    try {
      await onRenameTag(oldTag, renameValue.trim());
      setEditingTag(null);
      setRenameValue('');
    } finally {
      setTagBusy(false);
    }
  };

  const handleAddCollaboratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamErrorMsg('');
    setTeamStatusMsg('');
    setTeamBusy(true);
    try {
      await onAddCollaborator(inviteEmail, inviteNote);
      setTeamStatusMsg(
        `Authorized ${inviteEmail.trim().toLowerCase()} as a co-manager.`
      );
      setInviteEmail('');
      setInviteNote('');
    } catch (err) {
      setTeamErrorMsg(
        err instanceof Error ? err.message : 'Could not add co-manager.'
      );
    } finally {
      setTeamBusy(false);
    }
  };

  const tabs: {
    id: BackendTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'compose', label: 'Timeline', icon: Send },
    { id: 'countdowns', label: 'Events', icon: CalendarClock },
    { id: 'tags', label: 'Hashtags', icon: Hash },
    { id: 'banners', label: 'Banner', icon: ImageIcon },
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      badge: isAdmin && accessRequests.length > 0 ? accessRequests.length : undefined,
    },
    { id: 'design', label: 'Theme', icon: Palette },
  ];

  // Settings tabs responsive layout:
  // 1. Narrow (< 540px, e.g. when 'New Post' is relocated): 3 columns, 2 rows (3x2 layout).
  //    Labels are included down to 340px (where 3 columns have ample space); icons-only below 340px.
  // 2. Intermediate (540px <= width < 730px): 1 single line of 6 tabs.
  //    To avoid any label truncation, remove labels and leave icons only in that single line.
  // 3. Wide (width >= 730px): 1 single line of 6 tabs with both icons and labels visible.
  const is3x2 = tabNavWidth < 540;
  const showLabels = is3x2 ? tabNavWidth >= 340 : tabNavWidth >= 730;

  return (
    <div className="space-y-5">
      {/* Settings Sub-Navigation */}
      <section className="aero-glass rounded-3xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Settings
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isAdmin ? (
              <button
                type="button"
                onClick={onOpenNewComposer}
                className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                New Post
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        <div
          ref={tabNavRef}
          role="tablist"
          aria-label="Settings Sections"
          className={`mt-4 grid gap-1.5 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/80 ${
            is3x2 ? 'grid-cols-3' : 'grid-cols-6'
          }`}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 sm:px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
                title={tab.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {showLabels && (
                  <span className="whitespace-nowrap">{tab.label}</span>
                )}
                {tab.badge ? (
                  <span
                    className={
                      showLabels
                        ? 'ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shrink-0'
                        : 'absolute top-1 right-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs'
                    }
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {!isAdmin && activeTab !== 'design' && (
        <section className="aero-glass rounded-3xl p-8 text-center space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Sign In with Google for Instant Access
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-600 dark:text-slate-300">
              Any verified Google account automatically gets co-manager access upon signing in—no approval step needed. Sign in to create posts, manage drafts, update Countdown events, or edit banners.
            </p>
            {userEmail && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                Signed in as <span className="font-mono">{userEmail}</span>.{' '}
                {hasPendingRequest
                  ? 'Please switch to a verified Google account.'
                  : 'Please use a verified Google account to continue.'}
              </p>
            )}
            {authError && (
              <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
                {authError}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              Continue with Google
            </button>
            {userEmail && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Switch / Sign Out
              </button>
            )}
          </div>
        </section>
      )}

      {uploadError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError('')}
            className="font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab 1: Posting, Drafts & Scheduling Manager */}
      {isAdmin && activeTab === 'compose' && (
        <div className="space-y-5">
          {/* Drafts */}
          <section className="aero-glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Drafts ({draftPosts.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saved unpublished drafts. Edit anytime or publish straight to the timeline.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenNewComposer}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                + New Draft
              </button>
            </div>

            {draftPosts.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                No drafts saved yet. Click Save Draft in the post composer to store one here.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
                {draftPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-sky-700 tabular-nums dark:text-sky-300">
                        Draft · Saved {formatPostTimestamp(post.createdAt)}
                        {post.attachments.length > 0
                          ? ` · ${post.attachments.length} attachment(s)`
                          : ''}
                      </div>
                      <div className="mt-0.5 truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                        {post.title || 'Untitled Draft'}
                      </div>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {stripHtml(post.bodyHtml) || 'Media draft'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPublishNow(post)}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Post Now
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPost(post)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="aero-glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Scheduled Posts ({scheduledPosts.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Queued posts publish automatically at their scheduled time.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenNewComposer}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Schedule Post
              </button>
            </div>

            {scheduledPosts.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                No posts in the future schedule queue.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
                {scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-amber-700 tabular-nums dark:text-amber-300">
                        Scheduled · {formatPostTimestamp(post.scheduledFor || post.publishedAt, true, post.scheduledTimeZone)} ({getTimeZoneAbbr(post.scheduledTimeZone, post.scheduledFor || post.publishedAt)})
                      </div>
                      <div className="mt-0.5 truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                        {post.title || 'Untitled Scheduled Post'}
                      </div>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {stripHtml(post.bodyHtml) || 'Multimedia post'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPublishNow(post)}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        Post Now
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPost(post)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="aero-glass rounded-3xl p-6">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              All Published & Pinned Posts ({posts.length})
            </h3>
            <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
              {posts.map((post) => {
                const isPinned =
                  !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
                return (
                  <div
                    key={post.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                        <span>{formatPostTimestamp(post.publishedAt, true, post.scheduledTimeZone)}</span>
                        {isPinned && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans font-semibold text-sky-700 dark:text-sky-300">
                              Pinned
                            </span>
                          </>
                        )}
                      </div>
                      <div className="truncate font-display text-sm font-semibold text-slate-900 dark:text-white">
                        {post.title || stripHtml(post.bodyHtml).slice(0, 70) || 'Multimedia Entry'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onTogglePin(post)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <Pin className="h-3 w-3" />
                        {isPinned ? 'Unpin' : 'Pin 7d'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditPost(post)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: Next on MD (Countdown Setup with RTF, Custom Format & Multimedia) */}
      {isAdmin && activeTab === 'countdowns' && (
        <div className="space-y-5">
          <section ref={cdFormRef} className="aero-glass scroll-mt-20 rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingCountdownId ? 'Edit Countdown' : 'Countdown'}
              </h3>
              {editingCountdownId && (
                <button
                  type="button"
                  onClick={resetCountdownForm}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Edit
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Create customized event countdowns with rich text notes (RTF), display format options, optional hashtags, and optional multimedia files. Active countdowns appear in the sidebar automatically.
            </p>

            {cdStatusMsg && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                <span>{cdStatusMsg}</span>
                <button
                  type="button"
                  onClick={() => setCdStatusMsg('')}
                  className="font-semibold hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleCreateCountdown} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Event
                  </label>
                  <input
                    type="text"
                    required
                    value={cdTitle}
                    onChange={(e) => setCdTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Date & Time
                  </label>
                  <YmdDateTimeInput
                    id="countdown-target-input"
                    ariaLabel="Countdown Date & Time"
                    value={cdTarget}
                    onChange={setCdTarget}
                    className="mt-1.5"
                    inputClassName="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <TimeZoneSelect
                    id="countdown-timezone"
                    label="Time Zone"
                    value={cdTimeZone}
                    onChange={setCdTimeZone}
                    className="mt-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Format
                  </label>
                  <select
                    value={cdFormat}
                    onChange={(e) => setCdFormat(e.target.value as CountdownFormat)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="full">Full Timer (00 : 00 : 00 : 00)</option>
                    <option value="days-only">Adaptive Remaining (e.g. 2 months, 2 weeks, 3 days)</option>
                    <option value="d-day">Days Remaining (D-# / D-Day / D+#)</option>
                    <option value="date-only">Target Date Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Hashtag (Optional)
                  </label>
                  <input
                    type="text"
                    value={cdTag}
                    onChange={(e) => setCdTag(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Mini RTF Editor for Countdown */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 dark:border-slate-700 dark:bg-slate-900/75">
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                  <button
                    type="button"
                    onClick={() => execCdFormat('bold')}
                    title="Bold"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCdFormat('italic')}
                    title="Italic"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => execCdFormat('underline')}
                    title="Underline"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
                  {COUNTDOWN_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => execCdFormat('foreColor', c)}
                      style={{ backgroundColor: c }}
                      className="h-4 w-4 rounded-full border border-white shadow-sm cursor-pointer"
                      title={`Text color ${c}`}
                    />
                  ))}
                  <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
                  <input
                    ref={cdFileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                    onChange={(e) => handleCountdownMediaUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={cdUploading}
                    onClick={() => cdFileRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{cdUploading ? 'Uploading...' : 'Upload Media'}</span>
                  </button>
                  <FontSelect
                    id="cd-font-select"
                    value={cdFont}
                    onChange={setCdFont}
                    ariaLabel="Countdown Typeface"
                    className="ml-auto"
                  />
                </div>

                <div
                  ref={cdEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setCdBodyHtml((e.target as HTMLDivElement).innerHTML)}
                  className={`diary-prose min-h-[84px] px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none dark:text-slate-100 ${getFontClass(
                    cdFont
                  )}`}
                />
              </div>

              {cdAttachments.length > 0 && (
                <div className="space-y-1.5">
                  {cdAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        {att.type === 'image' || att.type === 'gif' ? (
                          <ImageIcon className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        ) : att.type === 'video' ? (
                          <Film className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        ) : att.type === 'audio' ? (
                          <Music className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                        )}
                        <span className="truncate">{att.title}</span>
                        {att.fileSize ? (
                          <span className="font-mono text-[10px] text-slate-400">
                            {formatFileSize(att.fileSize)}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCdAttachments((prev) =>
                            prev.filter((a) => a.id !== att.id)
                          )
                        }
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Milestone Content When Countdown Ends */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 space-y-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Milestone (Optional)
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white/85 dark:border-slate-700 dark:bg-slate-900/75">
                  <div className="flex flex-wrap items-center gap-1 border-b border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <button
                      type="button"
                      onClick={() => execMilestoneFormat('bold')}
                      title="Bold"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execMilestoneFormat('italic')}
                      title="Italic"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execMilestoneFormat('underline')}
                      title="Underline"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Underline className="h-3.5 w-3.5" />
                    </button>
                    <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
                    {COUNTDOWN_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => execMilestoneFormat('foreColor', c)}
                        style={{ backgroundColor: c }}
                        className="h-4 w-4 rounded-full border border-white shadow-sm cursor-pointer"
                        title={`Text color ${c}`}
                      />
                    ))}
                    <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
                    <input
                      ref={milestoneFileRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
                      onChange={(e) => handleMilestoneMediaUpload(e.target.files)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={milestoneUploading}
                      onClick={() => milestoneFileRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{milestoneUploading ? 'Uploading...' : 'Upload Media'}</span>
                    </button>
                    <FontSelect
                      id="milestone-font-select"
                      value={milestoneFont}
                      onChange={setMilestoneFont}
                      ariaLabel="Milestone Typeface"
                      className="ml-auto"
                    />
                  </div>

                  <div
                    ref={milestoneEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) =>
                      setMilestoneBodyHtml((e.target as HTMLDivElement).innerHTML)
                    }
                    className={`diary-prose min-h-[76px] px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none dark:text-slate-100 ${getFontClass(
                      milestoneFont
                    )}`}
                  />
                </div>

                {milestoneAttachments.length > 0 && (
                  <div className="space-y-1.5">
                    {milestoneAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          {att.type === 'image' || att.type === 'gif' ? (
                            <ImageIcon className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          ) : att.type === 'video' ? (
                            <Film className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          ) : att.type === 'audio' ? (
                            <Music className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          )}
                          <span className="truncate">{att.title}</span>
                          {att.fileSize ? (
                            <span className="font-mono text-[10px] text-slate-400">
                              {formatFileSize(att.fileSize)}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setMilestoneAttachments((prev) =>
                              prev.filter((a) => a.id !== att.id)
                            )
                          }
                          className="text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {editingCountdownId && (
                  <button
                    type="button"
                    onClick={resetCountdownForm}
                    disabled={cdSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={cdUploading || milestoneUploading || cdSaving}
                  className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  {editingCountdownId ? (
                    <>
                      <Check className="h-4 w-4" />
                      {cdSaving ? 'Saving...' : 'Save Changes'}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {cdSaving ? 'Adding...' : 'Add Countdown'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="aero-glass rounded-3xl p-6">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Active Countdowns ({countdowns.length})
            </h3>
            {countdowns.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                No countdowns configured. The countdown sidebar card stays hidden until you add one.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
                {countdowns.map((cd) => {
                  const isEditingThis = editingCountdownId === cd.id;
                  return (
                    <div
                      key={cd.id}
                      className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                        isEditingThis
                          ? 'rounded-2xl bg-sky-50/70 px-3 dark:bg-sky-950/30'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
                          {cd.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {formatExpandedCountdownDate(cd.targetAt, cd.timeZone)} · Format:{' '}
                          {cd.displayFormat === 'days-only'
                            ? 'Adaptive Remaining'
                            : cd.displayFormat === 'd-day'
                            ? 'Days Remaining (D-#)'
                            : cd.displayFormat === 'compact'
                            ? 'Compact Clock'
                            : cd.displayFormat === 'date-only'
                            ? 'Target Date Only'
                            : 'Full Timer'}
                          {cd.tag ? ` · #${cd.tag}` : ''}
                          {cd.attachments?.length ? ` · ${cd.attachments.length} file(s)` : ''}
                          {cd.milestoneBodyHtml || cd.milestoneAttachments?.length
                            ? ' · Milestone configured'
                            : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditCountdown(cd)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700/80 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isEditingThis ? 'Editing' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingThis) {
                              resetCountdownForm();
                            }
                            onDeleteCountdown(cd.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Add Event Playlist (Live Tab) */}
          <section ref={peFormRef} className="aero-glass scroll-mt-20 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                <ListVideo className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {editingPlayEventId ? 'Edit Event Playlist' : 'Add Event Playlist'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManagePlaylistsDrawer(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/50 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 dark:border-sky-500/50 dark:bg-sky-950/60 dark:text-sky-200 cursor-pointer"
                >
                  <ListVideo className="h-3.5 w-3.5" />
                  Manage Playlists
                </button>
                {editingPlayEventId && (
                  <button
                    type="button"
                    onClick={resetPlayEventForm}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            {peStatusMsg && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                <span>{peStatusMsg}</span>
                <button
                  type="button"
                  onClick={() => setPeStatusMsg('')}
                  className="font-semibold hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {peErrorMsg && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
                <span>{peErrorMsg}</span>
                <button
                  type="button"
                  onClick={() => setPeErrorMsg('')}
                  className="font-semibold hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleSavePlayEvent} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Playlist Link
                  </label>
                  <input
                    type="text"
                    required
                    value={peUrl}
                    onChange={(e) => setPeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/playlist?list=..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={peTitle}
                    onChange={(e) => setPeTitle(e.target.value)}
                    placeholder="Event or playlist title"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Date
                  </label>
                  <YmdDateInput
                    id="pe-date-input"
                    ariaLabel="Playlist Date"
                    value={peDate}
                    onChange={setPeDate}
                    className="mt-1.5"
                    inputClassName="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div className={peEraSelect === 'custom' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Era
                  </label>
                  <select
                    value={peEraSelect}
                    onChange={(e) => setPeEraSelect(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Interim Era">Interim Era</option>
                    <option value="Caratime Era">Caratime Era</option>
                    <option value="Daliatime Era">Daliatime Era</option>
                    <option value="custom">[New Era]</option>
                  </select>
                </div>

                {peEraSelect === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      New Era Name
                    </label>
                    <input
                      type="text"
                      required
                      value={peCustomEra}
                      onChange={(e) => setPeCustomEra(e.target.value)}
                      placeholder="Enter new era name"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="sm:col-span-2 rounded-2xl border border-slate-200/80 bg-white/60 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/50 space-y-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={peScheduleEnabled}
                      onChange={(e) => setPeScheduleEnabled(e.target.checked)}
                      className="h-4 w-4 rounded accent-sky-600"
                    />
                    <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span>Schedule Playlist</span>
                  </label>

                  {peScheduleEnabled && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Publish Date &amp; Time
                        </label>
                        <YmdDateTimeInput
                          id="pe-scheduled-at-input"
                          ariaLabel="Publish Date and Time"
                          value={peScheduledAt}
                          onChange={setPeScheduledAt}
                          className="mt-1"
                          inputClassName="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <TimeZoneSelect
                        id="pe-schedule-tz"
                        compact
                        label="Time Zone"
                        value={peScheduledTz}
                        onChange={setPeScheduledTz}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {editingPlayEventId && (
                  <button
                    type="button"
                    onClick={resetPlayEventForm}
                    disabled={peSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={peSaving}
                  className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  {editingPlayEventId ? (
                    <>
                      <Check className="h-4 w-4" />
                      {peSaving ? 'Saving...' : 'Save Playlist'}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {peSaving
                        ? 'Saving...'
                        : peScheduleEnabled
                        ? 'Schedule Playlist'
                        : 'Add Playlist'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Tab 3: Hashtags Manager */}
      {isAdmin && activeTab === 'tags' && (
        <section className="aero-glass rounded-3xl p-6">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Manage Hashtags
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Rename or merge a hashtag across all posts (updating both inline #tags and dedicated tag boxes), or remove tags cleanly.
            </p>
          </div>

          {tagCounts.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
              No hashtags found yet. Add #EventTags when creating a post.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-slate-200/70 dark:divide-slate-700/60">
              {tagCounts.map(({ tag, count }) => {
                const isEditing = editingTag === tag;
                return (
                  <div
                    key={tag}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-2 min-w-[220px]">
                        <span className="font-mono text-sm text-slate-400">#</span>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRenameTag(tag);
                          }}
                          className="flex-1 rounded-xl border border-sky-400 bg-white px-3 py-1.5 text-sm text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={tagBusy}
                          onClick={() => handleConfirmRenameTag(tag)}
                          className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTag(null)}
                          className="rounded-xl px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onFilterByTag(tag)}
                          className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                        >
                          #{tag}
                        </button>
                        <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {count} {count === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTag(tag);
                            setRenameValue(tag);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Rename / Merge
                        </button>
                        <button
                          type="button"
                          disabled={tagBusy}
                          onClick={() => onDeleteTag(tag)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab 4: Banner Upload & Scheduler */}
      {isAdmin && activeTab === 'banners' && (
        <div className="space-y-5">
          <section className="aero-glass rounded-3xl p-6">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Banner
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Recommended canvas: <span className="font-semibold">1920 × 480 px (4:1)</span> with faces, logos, and text kept inside the center <span className="font-semibold">1280 × 400 px</span> safe zone
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60">
              <img
                src="/assets/aistudio/banner_16758633.png"
                alt="Recommended 1920 × 480 px banner canvas and 1280 × 400 px safe zone guide"
                className="block h-auto w-full object-contain"
              />
            </div>

            <form
              onSubmit={handleCreateBanner}
              className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Banner Caption (optional)
                </label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Banner Caption / Subtitle
                </label>
                <div className="mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-1 border-b border-slate-200/80 bg-slate-50/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
                    <button
                      type="button"
                      onClick={() => execBannerCaptionFormat('bold')}
                      title="Bold"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execBannerCaptionFormat('italic')}
                      title="Italic"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => execBannerCaptionFormat('underline')}
                      title="Underline"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Underline className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        captureBannerSelection();
                      }}
                      onClick={() => {
                        captureBannerSelection();
                        setShowBannerLinkInput((v) => !v);
                      }}
                      title="Add Link to Selected Text"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {showBannerLinkInput && (
                    <div className="flex items-center gap-2 border-b border-slate-200/80 bg-sky-50/70 px-3 py-2 dark:border-slate-700 dark:bg-sky-950/30">
                      <input
                        type="text"
                        value={bannerLinkUrl}
                        onChange={(e) => setBannerLinkUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyBannerLink();
                          }
                        }}
                        placeholder="https://... or #live / #timeline (select text first)"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyBannerLink}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        Apply Link
                      </button>
                    </div>
                  )}

                  <div
                    ref={bannerCaptionRef}
                    contentEditable
                    suppressContentEditableWarning
                    onMouseUp={captureBannerSelection}
                    onKeyUp={captureBannerSelection}
                    onInput={(e) => {
                      setBannerSubtitleHtml((e.target as HTMLDivElement).innerHTML);
                      captureBannerSelection();
                    }}
                    className="diary-prose min-h-[54px] px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Upload Image / Animated GIF or Paste URL
                </label>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    required
                    value={bannerImageUrl}
                    onChange={(e) => {
                      setBannerImageUrl(e.target.value);
                      setBannerPreviewError(false);
                    }}
                    placeholder="https://... or upload an image/GIF"
                    className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    ref={bannerFileRef}
                    type="file"
                    accept="image/*,.gif"
                    onChange={(e) => handleBannerFileChange(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploadingBanner || isSavingBanner}
                    onClick={() => bannerFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-600 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {isUploadingBanner ? 'Uploading...' : 'Upload Image / GIF'}
                  </button>
                </div>

                {bannerImageUrl.trim() && (
                  <div className="mt-2.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900/90 dark:border-slate-700/80">
                    {bannerPreviewError ? (
                      <div className="flex h-28 items-center justify-center px-4 text-xs text-rose-300">
                        Could not load preview for this URL. Check the image link or upload another file.
                      </div>
                    ) : (
                      <img
                        src={bannerImageUrl}
                        alt="Selected banner preview"
                        referrerPolicy="no-referrer"
                        onLoad={() => setBannerPreviewError(false)}
                        onError={() => setBannerPreviewError(true)}
                        className="h-28 w-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Animation
                </label>
                <select
                  value={bannerMode}
                  onChange={(e) => setBannerMode(e.target.value as BannerMode)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="slideshow">Slideshow Rotation (Fade)</option>
                  <option value="default">Single Default Banner</option>
                  <option value="window">Schedule Date & Time Window</option>
                  <option value="daily-hours">Schedule Daily Hours</option>
                </select>
              </div>

              {bannerMode === 'window' && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Start At
                    </label>
                    <YmdDateTimeInput
                      id="banner-start-at"
                      ariaLabel="Banner Start At"
                      value={bannerStartAt}
                      onChange={setBannerStartAt}
                      className="mt-1.5"
                      inputClassName="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      End At
                    </label>
                    <YmdDateTimeInput
                      id="banner-end-at"
                      ariaLabel="Banner End At"
                      value={bannerEndAt}
                      onChange={setBannerEndAt}
                      className="mt-1.5"
                      inputClassName="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <TimeZoneSelect
                    id="banner-window-timezone"
                    label="Time Zone (optional)"
                    value={bannerTimeZone}
                    onChange={setBannerTimeZone}
                    className="sm:col-span-2 mt-1"
                  />
                </div>
              )}

              {bannerMode === 'daily-hours' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Start Hour (0–23)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={bannerStartHour}
                      onChange={(e) => setBannerStartHour(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      End Hour (0–23)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={bannerEndHour}
                      onChange={(e) => setBannerEndHour(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <TimeZoneSelect
                    id="banner-daily-timezone"
                    label="Time Zone (optional)"
                    value={bannerTimeZone}
                    onChange={setBannerTimeZone}
                    className="col-span-2 mt-1"
                  />
                </div>
              )}

              {bannerStatusMsg && (
                <div className="sm:col-span-2 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <span>{bannerStatusMsg}</span>
                  <button
                    type="button"
                    onClick={() => setBannerStatusMsg('')}
                    className="font-semibold hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUploadingBanner || isSavingBanner}
                  className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  {isSavingBanner ? 'Saving Banner...' : 'Save Banner'}
                </button>
              </div>
            </form>
          </section>

          {banners.length === 0 ? (
            <section className="aero-glass rounded-3xl p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No banners active. Your timeline stays clean at the top until you add a banner above.
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {banners.map((b) => {
                const isActive = activeBanner?.id === b.id;
                return (
                  <div
                    key={b.id}
                    className="aero-glass overflow-hidden rounded-3xl flex flex-col"
                  >
                    <div className="h-36 w-full bg-slate-200">
                      <img
                        src={b.imageUrl}
                        alt={b.title || 'Banner'}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
                            {b.mode === 'daily-hours'
                              ? `Daily ${formatHourMinute12h(
                                  b.dailyStartHour ?? 0,
                                  0
                                )} – ${formatHourMinute12h(
                                  b.dailyEndHour ?? 23,
                                  59
                                )} (${getTimeZoneAbbr(b.timeZone)})`
                              : b.mode === 'window'
                              ? `Scheduled Window (${getTimeZoneAbbr(
                                  b.timeZone,
                                  b.startAt || now
                                )})`
                              : b.mode === 'slideshow'
                              ? 'Slideshow Rotation'
                              : 'Default Banner'}
                          </span>
                          {isActive && (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Active Now
                            </span>
                          )}
                        </div>
                        {b.title && b.title.toUpperCase() !== 'MY DIARIES DASHBOARD' && (
                          <h4 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                            {b.title}
                          </h4>
                        )}
                        {(b.subtitleHtml || b.subtitle) && (
                          <div
                            className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline dark:[&_a]:text-sky-300"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeRichHtml(b.subtitleHtml || b.subtitle || ''),
                            }}
                          />
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-xs dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateBanner(b.id, {
                              priority: (activeBanner?.priority ?? 30) + 10,
                              mode: 'default',
                            })
                          }
                          className="font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                        >
                          Activate Now
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBanner(b.id)}
                          className="font-medium text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Team & Co-Managers */}
      {isAdmin && activeTab === 'team' && (
        <div className="space-y-5">
          {/* Instant Access Banner */}
          <section className="rounded-3xl border border-emerald-200/80 bg-emerald-50/85 px-6 py-4 text-xs text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="font-bold">Instant Co-Manager Access Enabled</div>
              <p className="mt-0.5 opacity-90">
                Any new user who signs in with a verified Google account automatically receives co-manager access to this shared timeline without waiting for manual approval, and appears in the directory below.
              </p>
            </div>
          </section>

          {/* Add / Label Co-Manager Directly */}
          <section className="aero-glass rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Add or Tag Co-Manager by Google Email
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Optionally add a teammate&rsquo;s Google email and role label here. Every co-manager publishes to the exact same shared timeline.
              </p>
            </div>

            {teamErrorMsg && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-200">
                {teamErrorMsg}
              </div>
            )}

            {teamStatusMsg && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-200">
                {teamStatusMsg}
              </div>
            )}

            <form
              onSubmit={handleAddCollaboratorSubmit}
              className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]"
            >
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role / Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={240}
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="e.g. Timeline Editor"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={teamBusy}
                  className="aero-button-primary inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{teamBusy ? 'Saving...' : 'Save Member'}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Legacy Pending Requests (shown only if any exist) */}
          {accessRequests.length > 0 && (
          <section className="aero-glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Pending Registration Requests ({accessRequests.length})
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  Previously submitted requests.
                </p>
              </div>
            </div>

              <div className="space-y-2.5">
                {accessRequests.map((req) => (
                  <div
                    key={req.uid}
                    className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/50 dark:bg-amber-950/35"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {req.displayName || req.email}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {req.email}
                        </span>
                      </div>
                      {req.note && (
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          &ldquo;{req.note}&rdquo;
                        </p>
                      )}
                      {req.requestedAt && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Requested {formatPostTimestamp(req.requestedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={teamBusy}
                        onClick={async () => {
                          setTeamBusy(true);
                          setTeamErrorMsg('');
                          try {
                            await onApproveRequest(req);
                            setTeamStatusMsg(`Approved ${req.email} as co-manager.`);
                          } catch (err) {
                            setTeamErrorMsg(
                              err instanceof Error
                                ? err.message
                                : 'Could not approve request.'
                            );
                          } finally {
                            setTeamBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={teamBusy}
                        onClick={async () => {
                          setTeamBusy(true);
                          setTeamErrorMsg('');
                          try {
                            await onDeclineRequest(req.uid);
                            setTeamStatusMsg(`Declined request from ${req.email}.`);
                          } catch (err) {
                            setTeamErrorMsg(
                              err instanceof Error
                                ? err.message
                                : 'Could not decline request.'
                            );
                          } finally {
                            setTeamBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
          </section>
          )}

          {/* Authorized Co-Managers Directory */}
          <section className="aero-glass rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Authorized Co-Managers ({BOOTSTRAP_OWNER_EMAILS.length + collaborators.length})
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                Bootstrap owners are permanently protected. Additional co-managers added from this panel can be revoked anytime.
              </p>
            </div>

            <div className="space-y-2">
              {BOOTSTRAP_OWNER_EMAILS.map((ownerEmail) => (
                <div
                  key={ownerEmail}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200/80 bg-sky-50/70 px-4 py-3 dark:border-sky-800/50 dark:bg-sky-950/35"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-white">
                      {ownerEmail}
                    </span>
                  </div>
                  <span className="rounded-lg bg-sky-600/15 px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:bg-sky-400/20 dark:text-sky-200">
                    Primary Owner
                  </span>
                </div>
              ))}

              {collaborators.map((collab) => (
                <div
                  key={collab.email}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900/65"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {collab.email}
                      </span>
                      {collab.displayName && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({collab.displayName})
                        </span>
                      )}
                    </div>
                    {collab.note && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {collab.note}
                      </p>
                    )}
                    {collab.addedByEmail && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Authorized by {collab.addedByEmail}
                        {collab.addedAt ? ` · ${formatPostTimestamp(collab.addedAt)}` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={teamBusy}
                    onClick={async () => {
                      setTeamBusy(true);
                      setTeamErrorMsg('');
                      try {
                        await onRemoveCollaborator(collab.email);
                        setTeamStatusMsg(`Removed ${collab.email} from team access.`);
                      } catch (err) {
                        setTeamErrorMsg(
                          err instanceof Error
                            ? err.message
                            : 'Could not remove co-manager.'
                        );
                      } finally {
                        setTeamBusy(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab 6: Theme */}
      {activeTab === 'design' && (
        <section className="aero-glass rounded-3xl p-6 space-y-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Theme
              </h3>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                >
                  Sign in to create or delete themes
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {isAdmin
                ? 'Choose any theme for this device without affecting other devices, or create and remove custom themes for everyone below.'
                : 'Choose any theme for this device without affecting other users. Sign in with Google to create or delete custom themes.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {THEME_PRESETS.map((preset) => {
                const selected = design.theme === preset.id;
                const isDefault = preset.id === 'default';
                const override = (design.customThemes || []).find(
                  (t) => t.id === preset.id
                );
                const resolved = isDefault
                  ? null
                  : resolvePreloadedThemePreset(preset.id, design.customThemes);
                const isCustomized = Boolean(override);

                const swatches = resolved
                  ? [resolved.canvasBg, resolved.accentStart, resolved.accentEnd]
                  : preset.swatches;

                return (
                  <div
                    key={preset.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                      selected
                        ? 'border-sky-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/40'
                        : 'border-slate-200/80 bg-white/60 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40'
                    }`}
                  >
                    <div
                      onClick={() =>
                        onUpdateDesign({
                          theme: preset.id,
                          ...(resolved?.surfaceStyle
                            ? { surfaceStyle: resolved.surfaceStyle }
                            : {}),
                        })
                      }
                      className="cursor-pointer flex-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                              {preset.label}
                            </span>
                            {isCustomized && (
                              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Edited
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {swatches.map((hex, idx) => (
                            <span
                              key={`${preset.id}-swatch-${idx}`}
                              style={{ backgroundColor: hex }}
                              className="h-4 w-4 rounded-full border border-white shadow-sm"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-2.5 dark:border-slate-700/40">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDesign({
                            theme: preset.id,
                            ...(resolved?.surfaceStyle
                              ? { surfaceStyle: resolved.surfaceStyle }
                              : {}),
                          })
                        }
                        className={`text-xs font-semibold cursor-pointer ${
                          selected
                            ? 'text-sky-700 dark:text-sky-300 font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {selected ? '✓ Active Theme' : 'Select Theme'}
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && !isDefault && (
                          <>
                            {isCustomized && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetPreloadedTheme(preset.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 cursor-pointer"
                                title="Reset to preloaded default colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reset</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPreloadedTheme(preset.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-200/80 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60 cursor-pointer"
                              title="Edit this preloaded theme"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          </>
                        )}
                        {isDefault && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            <Lock className="h-3 w-3" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add New Theme card directly below preloaded themes */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingCustomThemeId(null);
                  setCtName('');
                  setCtIsDark(false);
                  setCtSurface('aero-glass');
                  setCtCanvasBg('#f0f9ff');
                  setCtAccentStart('#38bdf8');
                  setCtAccentEnd('#0284c7');
                  setCtBackdropUrl('');
                  setShowCustomThemeBuilder((v) => !v);
                }}
                aria-expanded={showCustomThemeBuilder}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed p-4 text-left transition-colors cursor-pointer ${
                  showCustomThemeBuilder
                    ? 'border-sky-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/40'
                    : 'border-slate-300/90 bg-white/55 hover:border-sky-400 hover:bg-white/80 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-sky-500'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-sky-700 dark:text-sky-300">
                    <Plus className="h-4 w-4" />
                    <span>Add New Theme</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    Create and save a custom color & background graphic theme to this list.
                  </p>
                </div>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 whitespace-nowrap shrink-0">
                  {showCustomThemeBuilder ? 'Close' : 'Open Builder'}
                </span>
              </button>
            )}

            {/* Integrated Sub-Panel inside Theme (animated slide expand/collapse) */}
            {isAdmin && (
              <div
                aria-hidden={!showCustomThemeBuilder}
                className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  showCustomThemeBuilder
                    ? 'grid-rows-[1fr] opacity-100 visible'
                    : 'grid-rows-[0fr] opacity-0 invisible pointer-events-none'
                }`}
              >
                <div className="overflow-hidden">
                  <form
                    onSubmit={handleSaveCustomTheme}
                    className={`space-y-4 rounded-2xl border border-slate-200/90 bg-white/75 p-5 dark:border-slate-700 dark:bg-slate-900/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      showCustomThemeBuilder ? 'translate-y-0' : '-translate-y-2'
                    }`}
                  >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      required
                      value={ctName}
                      onChange={(e) => setCtName(e.target.value)}
                      placeholder="e.g., Kyoto Autumn 2026"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Base Brightness Mode
                    </label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCtIsDark(false);
                          if (ctCanvasBg === '#09111c') setCtCanvasBg('#f0f9ff');
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                          !ctIsDark
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        Light Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCtIsDark(true);
                          if (ctCanvasBg === '#f0f9ff') setCtCanvasBg('#09111c');
                        }}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
                          ctIsDark
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        Dark Mode
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                    <span>Canvas Color</span>
                    <input
                      type="color"
                      value={ctCanvasBg}
                      onChange={(e) => setCtCanvasBg(e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                    <span>Accent Top</span>
                    <input
                      type="color"
                      value={ctAccentStart}
                      onChange={(e) => setCtAccentStart(e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                    <span>Accent Bottom</span>
                    <input
                      type="color"
                      value={ctAccentEnd}
                      onChange={(e) => setCtAccentEnd(e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Theme Surface Style
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'aero-glass', label: 'Frosted Glass' },
                        { id: 'crisp-2026', label: 'Crisp Solid' },
                      ] as { id: SurfaceStyle; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCtSurface(opt.id)}
                        className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                          ctSurface === opt.id
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Theme Background Image or GIF (optional)
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={ctBackdropUrl}
                      onChange={(e) => setCtBackdropUrl(e.target.value)}
                      placeholder="Paste URL or upload custom graphic..."
                      className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      ref={customThemeBackdropRef}
                      type="file"
                      accept="image/*,.gif"
                      onChange={(e) =>
                        handleCustomThemeBackdropUpload(e.target.files?.[0])
                      }
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingCustomThemeBg}
                      onClick={() => customThemeBackdropRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploadingCustomThemeBg ? 'Uploading...' : 'Upload Image / GIF'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomThemeBuilder(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {editingCustomThemeId ? 'Save & Apply Changes' : 'Save & Apply Theme'}
                  </button>
                </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {customOnlyThemes.length > 0 && (
            <div className="border-t border-slate-200/70 pt-5 dark:border-slate-700/60">
              <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                My Saved Custom Themes ({customOnlyThemes.length})
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {customOnlyThemes.map((ct) => {
                  const selected = design.theme === ct.id;
                  return (
                    <div
                      key={ct.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
                        selected
                          ? 'border-sky-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/40'
                          : 'border-slate-200/80 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDesign({
                            theme: ct.id,
                            surfaceStyle: ct.surfaceStyle,
                          })
                        }
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
                          {ct.name}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {ct.isDark ? 'Dark' : 'Light'} ·{' '}
                          {ct.surfaceStyle === 'aero-glass' ? 'Glass' : 'Solid'}
                          {ct.backdropImageUrl ? ' · Custom backdrop' : ''}
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {[ct.canvasBg, ct.accentStart, ct.accentEnd].map(
                            (hex, idx) => (
                              <span
                                key={`${ct.id}-${idx}`}
                                style={{ backgroundColor: hex }}
                                className="h-4 w-4 rounded-full border border-white shadow-sm"
                              />
                            )
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCustomTheme(ct)}
                              aria-label={`Edit theme ${ct.name}`}
                              className="rounded-lg p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                              title="Edit custom theme"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomTheme(ct.id)}
                              aria-label={`Delete theme ${ct.name}`}
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Delete custom theme"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200/70 pt-5 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Layers className="h-4 w-4 text-sky-600" />
              <span>Card Surface Material</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(
                [
                  { id: 'aero-glass', label: 'Frutiger Aero Frosted Glass' },
                  { id: 'crisp-2026', label: 'Crisp Solid 2026 Minimal' },
                ] as { id: SurfaceStyle; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateDesign({ surfaceStyle: opt.id })}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    design.surfaceStyle === opt.id
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="border-t border-slate-200/70 pt-5 dark:border-slate-700/60">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Global Background Override Image or GIF (optional)
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={customBackdropInput}
                onChange={(e) => setCustomBackdropInput(e.target.value)}
                placeholder="Paste image/GIF URL or upload from device..."
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <input
                ref={backdropFileRef}
                type="file"
                accept="image/*,.gif"
                onChange={(e) => handleBackdropFileChange(e.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingBackdrop}
                onClick={() => backdropFileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploadingBackdrop ? 'Uploading...' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={() => onUpdateDesign({ customBackdropUrl: customBackdropInput.trim() })}
                className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Apply
              </button>
              {design.customBackdropUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomBackdropInput('');
                    onUpdateDesign({ customBackdropUrl: '' });
                  }}
                  className="rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            </div>
          )}
        </section>
      )}
      {/* Manage Playlists Drawer Modal */}
      {isAdmin &&
        showManagePlaylistsDrawer &&
        typeof document !== 'undefined' &&
        createPortal(
          <ManagePlaylistsModal
            customPlayEvents={customPlayEvents}
            now={now}
            editingPlayEventId={editingPlayEventId}
            searchQuery={manageSearchQuery}
            onSearchChange={setManageSearchQuery}
            eraFilter={manageEraFilter}
            onEraFilterChange={setManageEraFilter}
            onClose={() => setShowManagePlaylistsDrawer(false)}
            onEdit={(ev) => {
              setShowManagePlaylistsDrawer(false);
              window.requestAnimationFrame(() => {
                handleStartEditPlayEvent(ev);
              });
            }}
            onPublishNow={
              onUpdatePlayEvent
                ? (ev) =>
                    onUpdatePlayEvent(ev.id, {
                      title: ev.title,
                      url: ev.url,
                      kind: ev.kind,
                      mediaId: ev.mediaId,
                      dateLabel: ev.dateLabel,
                      year: ev.year,
                      era: ev.era,
                      scheduledFor: null,
                      scheduledTimeZone: null,
                    })
                : undefined
            }
            onDelete={
              onDeletePlayEvent
                ? (id) => {
                    if (editingPlayEventId === id) resetPlayEventForm();
                    return onDeletePlayEvent(id);
                  }
                : undefined
            }
            onRestore={onRestorePlayEvent}
          />,
          document.body
        )}
    </div>
  );
};

interface ManagePlaylistsModalProps {
  customPlayEvents: PlayEventRecord[];
  now: Date;
  editingPlayEventId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  eraFilter: string;
  onEraFilterChange: (era: string) => void;
  onClose: () => void;
  onEdit: (ev: PlayEventRecord) => void;
  onPublishNow?: (ev: PlayEventRecord) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onRestore?: (id: string) => Promise<void>;
}

const ManagePlaylistsModal: React.FC<ManagePlaylistsModalProps> = ({
  customPlayEvents,
  now,
  editingPlayEventId,
  searchQuery,
  onSearchChange,
  eraFilter,
  onEraFilterChange,
  onClose,
  onEdit,
  onPublishNow,
  onDelete,
  onRestore,
}) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const builtInIdSet = useMemo(
    () => new Set(PLAY_EVENTS.map((ev) => ev.id)),
    []
  );
  const overrideMap = useMemo(
    () => new Map(customPlayEvents.map((ev) => [ev.id, ev])),
    [customPlayEvents]
  );

  const allMerged = useMemo(
    () => mergePlayEvents(PLAY_EVENTS, customPlayEvents),
    [customPlayEvents]
  );

  const deletedBuiltIns = useMemo(
    () =>
      PLAY_EVENTS.filter((item) => {
        const ov = overrideMap.get(item.id);
        return Boolean(ov?.isDeleted);
      }),
    [overrideMap]
  );

  const eraOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const ev of allMerged) {
      const e = (ev.era || '').trim();
      if (e && !seen.has(e)) {
        seen.add(e);
        list.push(e);
      }
    }
    return list;
  }, [allMerged]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMerged.filter((ev) => {
      if (eraFilter !== 'all' && (ev.era || '') !== eraFilter) {
        return false;
      }
      if (!q) return true;
      return `${ev.title} ${ev.dateLabel} ${ev.year} ${ev.era} ${ev.url}`
        .toLowerCase()
        .includes(q);
    });
  }, [allMerged, eraFilter, searchQuery]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage Event Playlists"
        onClick={(e) => e.stopPropagation()}
        className="aero-glass flex flex-col w-full max-w-3xl h-[85dvh] max-h-[85dvh] sm:h-[82vh] sm:max-h-[82vh] rounded-t-3xl sm:rounded-3xl border border-white/60 dark:border-slate-700/80 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-5 py-3.5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300">
              <ListVideo className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Manage Playlists
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {allMerged.length} active playlists · Edit, publish, or remove any Play Event
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Manage Playlists"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/60 bg-white/50 px-5 py-2.5 dark:border-slate-800/70 dark:bg-slate-900/50 shrink-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${allMerged.length} playlists...`}
              className="w-full rounded-xl border border-slate-200/90 bg-white/90 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear playlist search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by Era"
            value={eraFilter}
            onChange={(e) => onEraFilterChange(e.target.value)}
            className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 cursor-pointer"
          >
            <option value="all">All Eras ({allMerged.length})</option>
            {eraOptions.map((era) => (
              <option key={era} value={era}>
                {era}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-3 divide-y divide-slate-200/70 dark:divide-slate-800/80">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No playlists matching your filter.
            </div>
          ) : (
            filtered.map((ev) => {
              const isBuiltIn = builtInIdSet.has(ev.id);
              const isOverridden = isBuiltIn && overrideMap.has(ev.id);
              const isEditingThis = editingPlayEventId === ev.id;
              const isScheduledPending = Boolean(
                ev.scheduledFor &&
                  new Date(ev.scheduledFor).getTime() > now.getTime()
              );

              return (
                <div
                  key={ev.id}
                  className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                    isEditingThis
                      ? 'rounded-2xl bg-sky-50/70 px-3 dark:bg-sky-950/30'
                      : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                        {ev.title}
                      </span>
                      {ev.era && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {ev.era}
                        </span>
                      )}
                      {isBuiltIn ? (
                        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                          {isOverridden ? 'Built-in (Edited)' : 'Built-in'}
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Custom
                        </span>
                      )}
                      {isScheduledPending && ev.scheduledFor && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                          <Clock3 className="h-3 w-3" />
                          Scheduled: {formatPostTimestamp(ev.scheduledFor)}
                          {ev.scheduledTimeZone
                            ? ` (${getTimeZoneAbbr(ev.scheduledTimeZone)})`
                            : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                      {ev.dateLabel || ev.year || 'No date'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open on YouTube"
                      aria-label={`Open ${ev.title} on YouTube`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>

                    {isScheduledPending && onPublishNow && (
                      <button
                        type="button"
                        onClick={() => onPublishNow(ev)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Publish Now
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEdit(ev)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700/80 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(ev.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {deletedBuiltIns.length > 0 && onRestore && (
            <div className="pt-4 mt-2 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Removed Built-in Playlists ({deletedBuiltIns.length})
              </div>
              {deletedBuiltIns.map((ev) => (
                <div
                  key={`deleted-${ev.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                      {ev.title}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {ev.dateLabel || ev.year} · {ev.era}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(ev.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-800 dark:text-sky-300 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

