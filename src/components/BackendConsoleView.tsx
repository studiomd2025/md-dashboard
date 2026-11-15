import React, { useRef, useState } from 'react';
import {
  Bold,
  CalendarClock,
  Check,
  Edit3,
  FileText,
  Film,
  Hash,
  Image as ImageIcon,
  Italic,
  Layers,
  Link2,
  Lock,
  LogIn,
  LogOut,
  Music,
  Palette,
  Pin,
  Plus,
  Send,
  Trash2,
  Underline,
  Upload,
} from 'lucide-react';
import type {
  BackendTab,
  BannerMode,
  BannerSchedule,
  CountdownFormat,
  CustomThemePreset,
  DesignSettings,
  DiaryFont,
  EventCountdown,
  MediaAttachment,
  Post,
  SurfaceStyle,
  ThemePresetId,
} from '../types';
import {
  formatFileSize,
  formatHourMinute12h,
  formatPostTimestamp,
  getFontClass,
  normalizeTag,
  sanitizeRichHtml,
  stripHtml,
} from '../lib/mediaUtils';
import { uploadMediaFile } from '../lib/cloudinaryUpload';
import { resolveActiveBanner } from './ScheduledBanner';

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
    tag?: string;
    bodyHtml?: string;
    font?: DiaryFont;
    displayFormat?: CountdownFormat;
    attachments?: MediaAttachment[];
    milestoneBodyHtml?: string;
    milestoneFont?: DiaryFont;
    milestoneAttachments?: MediaAttachment[];
  }) => Promise<void>;
  onDeleteCountdown: (id: string) => Promise<void>;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
  onFilterByTag: (tag: string) => void;
  onAddBanner: (payload: Omit<BannerSchedule, 'id'>) => Promise<void>;
  onUpdateBanner: (id: string, patch: Partial<BannerSchedule>) => Promise<void>;
  onDeleteBanner: (id: string) => Promise<void>;
  onUpdateDesign: (next: Partial<DesignSettings>) => Promise<void>;
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
    id: 'aero-daylight',
    label: 'Frutiger Aero Daylight',
    description: 'Sunlit cyan sky, turquoise accents, and clear frosted glass.',
    swatches: ['#eff8fd', '#38bdf8', '#10b981'],
  },
  {
    id: 'twilight-lagoon',
    label: 'Twilight Lagoon (Dark)',
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
    label: 'Frutiger Metro Eclipse (Dark)',
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
    label: 'Frutiger Metro Electric Club (Dark)',
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
];

const PRESET_BANNERS = [
  { label: 'Aero Daylight Horizon', url: '/samples/banner-aero-horizon.jpg' },
  { label: 'Evening Lagoon Twilight', url: '/samples/banner-evening-aurora.jpg' },
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
  onDeleteCountdown,
  onRenameTag,
  onDeleteTag,
  onFilterByTag,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
  onUpdateDesign,
  isAdmin,
  userEmail,
  authError,
  onSignIn,
  onSignOut,
}) => {
  // Tag management state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tagBusy, setTagBusy] = useState(false);

  // Next on MD (Countdown) creator state
  const cdEditorRef = useRef<HTMLDivElement>(null);
  const cdFileRef = useRef<HTMLInputElement>(null);
  const milestoneEditorRef = useRef<HTMLDivElement>(null);
  const milestoneFileRef = useRef<HTMLInputElement>(null);
  const [cdTitle, setCdTitle] = useState('');
  const [cdTarget, setCdTarget] = useState('');
  const [cdTag, setCdTag] = useState('');
  const [cdFormat, setCdFormat] = useState<CountdownFormat>('full');
  const [cdFont, setCdFont] = useState<DiaryFont>('sans');
  const [cdBodyHtml, setCdBodyHtml] = useState('');
  const [cdAttachments, setCdAttachments] = useState<MediaAttachment[]>([]);
  const [cdUploading, setCdUploading] = useState(false);
  const [milestoneFont, setMilestoneFont] = useState<DiaryFont>('sans');
  const [milestoneBodyHtml, setMilestoneBodyHtml] = useState('');
  const [milestoneAttachments, setMilestoneAttachments] = useState<MediaAttachment[]>([]);
  const [milestoneUploading, setMilestoneUploading] = useState(false);

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
  const [bannerImageUrl, setBannerImageUrl] = useState('/samples/banner-aero-horizon.jpg');
  const [bannerMode, setBannerMode] = useState<BannerMode>('slideshow');
  const [bannerStartAt, setBannerStartAt] = useState('');
  const [bannerEndAt, setBannerEndAt] = useState('');
  const [bannerStartHour, setBannerStartHour] = useState(9);
  const [bannerEndHour, setBannerEndHour] = useState(17);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingBackdrop, setIsUploadingBackdrop] = useState(false);
  const [customBackdropInput, setCustomBackdropInput] = useState(
    design.customBackdropUrl || ''
  );

  // Custom Theme Creator state
  const [showCustomThemeBuilder, setShowCustomThemeBuilder] = useState(false);
  const [ctName, setCtName] = useState('');
  const [ctIsDark, setCtIsDark] = useState(false);
  const [ctSurface, setCtSurface] = useState<SurfaceStyle>('aero-glass');
  const [ctCanvasBg, setCtCanvasBg] = useState('#f0f9ff');
  const [ctAccentStart, setCtAccentStart] = useState('#38bdf8');
  const [ctAccentEnd, setCtAccentEnd] = useState('#0284c7');
  const [ctBackdropUrl, setCtBackdropUrl] = useState('');
  const [isUploadingCustomThemeBg, setIsUploadingCustomThemeBg] = useState(false);

  const [uploadError, setUploadError] = useState('');

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

  const handleCreateCountdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdTitle.trim() || !cdTarget) return;
    const cleanedHtml = sanitizeRichHtml(cdEditorRef.current?.innerHTML || cdBodyHtml);
    const cleanedMilestoneHtml = sanitizeRichHtml(
      milestoneEditorRef.current?.innerHTML || milestoneBodyHtml
    );
    await onAddCountdown({
      title: cdTitle.trim(),
      targetAt: new Date(cdTarget).toISOString(),
      tag: cdTag.trim() ? normalizeTag(cdTag) : undefined,
      bodyHtml: cleanedHtml,
      font: cdFont,
      displayFormat: cdFormat,
      attachments: cdAttachments,
      milestoneBodyHtml: cleanedMilestoneHtml,
      milestoneFont,
      milestoneAttachments,
    });
    setCdTitle('');
    setCdTarget('');
    setCdTag('');
    setCdBodyHtml('');
    setCdAttachments([]);
    setMilestoneBodyHtml('');
    setMilestoneAttachments([]);
    if (cdEditorRef.current) cdEditorRef.current.innerHTML = '';
    if (milestoneEditorRef.current) milestoneEditorRef.current.innerHTML = '';
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
    const newTheme: CustomThemePreset = {
      id: `custom-${Date.now()}`,
      name: ctName.trim(),
      isDark: ctIsDark,
      canvasBg: ctCanvasBg,
      surfaceStyle: ctSurface,
      accentStart: ctAccentStart,
      accentEnd: ctAccentEnd,
      backdropImageUrl: ctBackdropUrl.trim() || undefined,
    };
    const nextList = [...(design.customThemes || []), newTheme];
    await onUpdateDesign({
      customThemes: nextList,
      theme: newTheme.id,
      surfaceStyle: newTheme.surfaceStyle,
    });
    setCtName('');
    setCtBackdropUrl('');
    setShowCustomThemeBuilder(false);
  };

  const handleDeleteCustomTheme = async (id: string) => {
    const nextList = (design.customThemes || []).filter((t) => t.id !== id);
    await onUpdateDesign({
      customThemes: nextList,
      ...(design.theme === id ? { theme: 'aero-daylight' } : {}),
    });
  };

  const handleBannerFileChange = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const uploaded = await uploadFileToServer(file);
      if (uploaded?.url) setBannerImageUrl(uploaded.url);
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
    if (!bannerImageUrl.trim()) return;
    const rawHtml = bannerCaptionRef.current?.innerHTML || bannerSubtitleHtml;
    const cleanedCaption = sanitizeRichHtml(rawHtml);
    await onAddBanner({
      title: bannerTitle.trim(),
      subtitle: stripHtml(cleanedCaption),
      subtitleHtml: cleanedCaption,
      imageUrl: bannerImageUrl.trim(),
      mode: bannerMode,
      startAt:
        bannerMode === 'window' && bannerStartAt
          ? new Date(bannerStartAt).toISOString()
          : undefined,
      endAt:
        bannerMode === 'window' && bannerEndAt
          ? new Date(bannerEndAt).toISOString()
          : undefined,
      dailyStartHour: bannerMode === 'daily-hours' ? bannerStartHour : undefined,
      dailyEndHour: bannerMode === 'daily-hours' ? bannerEndHour : undefined,
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
    if (bannerCaptionRef.current) bannerCaptionRef.current.innerHTML = '';
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

  const tabs: {
    id: BackendTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'compose', label: 'Post & Schedule', icon: Send },
    { id: 'countdowns', label: 'Next on MD', icon: CalendarClock },
    { id: 'tags', label: 'Hashtags', icon: Hash },
    { id: 'banners', label: 'Banner', icon: ImageIcon },
    { id: 'design', label: 'Theme', icon: Palette },
  ];

  return (
    <div className="space-y-5">
      {/* Settings Sub-Navigation */}
      <section className="aero-glass rounded-3xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Settings
            </h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Manage posts, drafts, Next on MD countdowns, Hashtags, Banners, and Theme.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
                Owner Sign In
              </button>
            )}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Settings Sections"
          className="mt-4 flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100/90 p-1.5 dark:bg-slate-800/80"
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
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {tab.label}
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
              Owner Sign-In Required
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-600 dark:text-slate-300">
              Sign in with the dashboard owner Google account (<span className="font-mono">officialmdworkspace@gmail.com</span>) to create posts, manage drafts, update Next on MD, edit banners, or modify hashtags.
            </p>
            {userEmail && (
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                Currently signed in as {userEmail}. Please switch to the owner account.
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
              Sign in with Google
            </button>
            {userEmail && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
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
                        Scheduled · {formatPostTimestamp(post.scheduledFor || post.publishedAt)}
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
                        <span>{formatPostTimestamp(post.publishedAt)}</span>
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
          <section className="aero-glass rounded-3xl p-6">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Next on MD — Countdown Setup
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Create customized event countdowns with rich text notes (RTF), display format options, optional hashtags, and optional multimedia files. The Next on MD widget appears in the sidebar automatically whenever at least one countdown is active.
            </p>

            <form onSubmit={handleCreateCountdown} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={cdTitle}
                    onChange={(e) => setCdTitle(e.target.value)}
                    placeholder="e.g., Kyoto Autumn Trip"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Target Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={cdTarget}
                    onChange={(e) => setCdTarget(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Countdown Display Format
                  </label>
                  <select
                    value={cdFormat}
                    onChange={(e) => setCdFormat(e.target.value as CountdownFormat)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="full">Full Timer (00 : 00 : 00 : 00)</option>
                    <option value="days-only">Days Remaining (e.g. 14 days left)</option>
                    <option value="compact">Compact Clock (HH:MM:SS)</option>
                    <option value="date-only">Target Date Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Hashtag (optional)
                  </label>
                  <input
                    type="text"
                    value={cdTag}
                    onChange={(e) => setCdTag(e.target.value)}
                    placeholder="Optional #EventTag"
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
                  <select
                    value={cdFont}
                    onChange={(e) => setCdFont(e.target.value as DiaryFont)}
                    className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="sans">DM Sans</option>
                    <option value="serif">Fraunces Serif</option>
                    <option value="mono">JetBrains Mono</option>
                    <option value="hand">Caveat Journal</option>
                  </select>
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

              {/* Optional Multimedia Upload for Countdown */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Optional Countdown Multimedia (Image, GIF, Video, Audio, File)
                  </span>
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {cdUploading ? 'Uploading...' : 'Attach Media'}
                  </button>
                </div>

                {cdAttachments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
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
              </div>

              {/* Optional Milestone Content When Countdown Ends */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 space-y-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    When Countdown Ends — Optional Milestone Content (RTF & Multimedia)
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Replaces the pre-event note automatically as soon as the timer reaches zero.
                  </p>
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
                    <select
                      value={milestoneFont}
                      onChange={(e) => setMilestoneFont(e.target.value as DiaryFont)}
                      className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="sans">DM Sans</option>
                      <option value="serif">Fraunces Serif</option>
                      <option value="mono">JetBrains Mono</option>
                      <option value="hand">Caveat Journal</option>
                    </select>
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

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Optional Milestone Multimedia (Image, GIF, Video, Audio, File)
                  </span>
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {milestoneUploading ? 'Uploading...' : 'Attach Milestone Media'}
                  </button>
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

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={cdUploading || milestoneUploading}
                  className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add to Next on MD
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
                No countdowns configured. The Next on MD sidebar card stays hidden until you add one.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-700/60">
                {countdowns.map((cd) => (
                  <div
                    key={cd.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {cd.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {formatPostTimestamp(cd.targetAt)} · Format: {cd.displayFormat || 'full'}
                        {cd.tag ? ` · #${cd.tag}` : ''}
                        {cd.attachments?.length ? ` · ${cd.attachments.length} file(s)` : ''}
                        {cd.milestoneBodyHtml || cd.milestoneAttachments?.length
                          ? ' · Milestone configured'
                          : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteCountdown(cd.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              No banner is shown by default. Upload a wide photo or animated GIF here to display one or schedule banner swaps.
            </p>

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
                  placeholder="Leave blank for clean image-only banner"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Banner Caption / Subtitle (select text and click Link for clickable CTA)
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
                      className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300 cursor-pointer"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Add Link to Selected Text
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
                    onChange={(e) => setBannerImageUrl(e.target.value)}
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
                    disabled={isUploadingBanner}
                    onClick={() => bannerFileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {isUploadingBanner ? 'Uploading...' : 'Upload Image / GIF'}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-slate-500">Built-in presets:</span>
                  {PRESET_BANNERS.map((p) => (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => setBannerImageUrl(p.url)}
                      className="font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Activation Mode
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
                    <input
                      type="datetime-local"
                      required
                      value={bannerStartAt}
                      onChange={(e) => setBannerStartAt(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                      End At
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={bannerEndAt}
                      onChange={(e) => setBannerEndAt(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
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
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="aero-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Save Banner
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
                                )} – ${formatHourMinute12h(b.dailyEndHour ?? 23, 59)}`
                              : b.mode === 'window'
                              ? 'Scheduled Window'
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

      {/* Tab 5: Theme */}
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
                  Sign in as Owner to save globally
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {isAdmin
                ? 'Switch between Frutiger Aero, Frutiger Metro, and 2026 minimal palettes, or create and save your own custom theme.'
                : 'Preview themes locally in your browser. Owner sign-in is required to create themes or save global defaults.'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {THEME_PRESETS.map((preset) => {
                const selected = design.theme === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdateDesign({ theme: preset.id })}
                    className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-sky-500 bg-sky-50/70 dark:border-sky-400 dark:bg-sky-950/40'
                        : 'border-slate-200/80 bg-white/60 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40'
                    }`}
                  >
                    <div>
                      <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {preset.label}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {preset.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {preset.swatches.map((hex) => (
                        <span
                          key={hex}
                          style={{ backgroundColor: hex }}
                          className="h-4 w-4 rounded-full border border-white shadow-sm"
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* + Add New Theme card directly below Crystal Pearl Minimal */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCustomThemeBuilder((v) => !v)}
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

            {/* Integrated Sub-Panel inside Theme */}
            {isAdmin && showCustomThemeBuilder && (
              <form
                onSubmit={handleSaveCustomTheme}
                className="space-y-4 rounded-2xl border border-slate-200/90 bg-white/75 p-5 dark:border-slate-700 dark:bg-slate-900/70"
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
                    Save & Apply Theme
                  </button>
                </div>
              </form>
            )}
          </div>

          {(design.customThemes?.length ?? 0) > 0 && (
            <div className="border-t border-slate-200/70 pt-5 dark:border-slate-700/60">
              <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                My Saved Custom Themes ({design.customThemes?.length})
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(design.customThemes || []).map((ct) => {
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
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomTheme(ct.id)}
                            aria-label={`Delete theme ${ct.name}`}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
    </div>
  );
};
