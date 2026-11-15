export type DiaryFont = 'sans' | 'serif' | 'mono' | 'hand';

export type AttachmentType =
  | 'image'
  | 'gif'
  | 'video'
  | 'audio'
  | 'document'
  | 'embed'
  | 'link';

export type EmbedKind =
  | 'youtube-video'
  | 'youtube-playlist'
  | 'vimeo'
  | 'soundcloud'
  | 'spotify'
  | 'generic';

export interface MediaAttachment {
  id: string;
  type: AttachmentType;
  url: string;
  title?: string;
  subtitle?: string;
  mimeType?: string;
  fileSize?: number;
  embedKind?: EmbedKind;
  embedUrl?: string;
}

export interface Post {
  id: string;
  title: string;
  bodyHtml: string;
  font: DiaryFont;
  manualTags: string[];
  inlineTags: string[];
  attachments: MediaAttachment[];
  createdAt: string;
  publishedAt: string;
  scheduledFor: string | null;
  pinnedUntil: string | null;
  isDraft?: boolean;
}

export type BannerMode = 'default' | 'slideshow' | 'window' | 'daily-hours';

export interface BannerSchedule {
  id: string;
  title: string;
  subtitle: string;
  subtitleHtml?: string;
  imageUrl: string;
  mode: BannerMode;
  startAt?: string;
  endAt?: string;
  dailyStartHour?: number;
  dailyEndHour?: number;
  priority: number;
}

export type CountdownFormat = 'full' | 'days-only' | 'compact' | 'date-only';

export interface EventCountdown {
  id: string;
  title: string;
  targetAt: string;
  tag?: string;
  location?: string;
  bodyHtml?: string;
  font?: DiaryFont;
  displayFormat?: CountdownFormat;
  attachments?: MediaAttachment[];
  milestoneBodyHtml?: string;
  milestoneFont?: DiaryFont;
  milestoneAttachments?: MediaAttachment[];
}

export type ThemePresetId =
  | 'aero-daylight'
  | 'twilight-lagoon'
  | 'meadow-mint'
  | 'crystal-pearl'
  | 'sunset-glass'
  | 'metro-prism-light'
  | 'metro-eclipse-dark';

export type ThemeId = ThemePresetId | (string & {});

export type SurfaceStyle = 'aero-glass' | 'crisp-2026';

export interface CustomThemePreset {
  id: string;
  name: string;
  isDark: boolean;
  canvasBg: string;
  surfaceStyle: SurfaceStyle;
  accentStart: string;
  accentEnd: string;
  backdropImageUrl?: string;
}

export interface DesignSettings {
  theme: ThemeId;
  surfaceStyle: SurfaceStyle;
  customBackdropUrl?: string;
  customThemes?: CustomThemePreset[];
}

export interface IntranetState {
  posts: Post[];
  banners: BannerSchedule[];
  countdowns: EventCountdown[];
  design: DesignSettings;
  serverTime: string;
}

export type ActiveView = 'timeline' | 'live' | 'settings' | 'install';
export type BackendTab = 'compose' | 'countdowns' | 'tags' | 'banners' | 'design';
