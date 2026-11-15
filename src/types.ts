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
}

export type BannerMode = 'default' | 'window' | 'daily-hours';

export interface BannerSchedule {
  id: string;
  title: string;
  subtitle: string;
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
}

export type ThemePresetId =
  | 'aero-daylight'
  | 'twilight-lagoon'
  | 'meadow-mint'
  | 'crystal-pearl'
  | 'sunset-glass';

export type SurfaceStyle = 'aero-glass' | 'crisp-2026';

export interface DesignSettings {
  theme: ThemePresetId;
  surfaceStyle: SurfaceStyle;
  customBackdropUrl?: string;
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
