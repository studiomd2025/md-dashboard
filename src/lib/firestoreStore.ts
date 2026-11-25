import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AccessRequestRecord,
  BannerSchedule,
  CollaboratorRecord,
  CustomThemePreset,
  DesignSettings,
  EventCountdown,
  IntranetState,
  MediaAttachment,
  PlayEventRecord,
  Post,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { normalizeShortsToWatchUrl } from './mediaUtils';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function sanitizeAttachments(
  list: MediaAttachment[] | undefined,
  maxItems: number
): MediaAttachment[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, maxItems).map((att) =>
    stripUndefinedDeep({
      id: String(att.id || `att-${Date.now()}`),
      type: att.type,
      url: normalizeShortsToWatchUrl(String(att.url || '')),
      title: att.title ? String(att.title).slice(0, 300) : undefined,
      subtitle: att.subtitle ? String(att.subtitle).slice(0, 500) : undefined,
      mimeType: att.mimeType ? String(att.mimeType).slice(0, 120) : undefined,
      fileSize: typeof att.fileSize === 'number' ? att.fileSize : undefined,
      embedKind: att.embedKind,
      embedUrl: att.embedUrl ? String(att.embedUrl).slice(0, 2000) : undefined,
    })
  );
}

function sanitizeCustomThemes(
  themes: CustomThemePreset[] | undefined
): CustomThemePreset[] {
  if (!Array.isArray(themes)) return [];
  return themes
    .filter((t) => t && t.id && String(t.id) !== 'default')
    .slice(0, 50)
    .map((t) =>
      stripUndefinedDeep({
        id: String(t.id).slice(0, 128),
        name: String(t.name).slice(0, 120),
        isDark: Boolean(t.isDark),
        canvasBg: String(t.canvasBg || '#f0f9ff').slice(0, 32),
        surfaceStyle:
          t.surfaceStyle === 'crisp-2026' ? 'crisp-2026' : 'aero-glass',
        accentStart: String(t.accentStart || '#38bdf8').slice(0, 32),
        accentEnd: String(t.accentEnd || '#0284c7').slice(0, 32),
        backdropImageUrl: t.backdropImageUrl
          ? String(t.backdropImageUrl).slice(0, 2000)
          : undefined,
      })
    );
}

function sanitizeTagList(list: string[] | undefined): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim().slice(0, 80))
    .slice(0, 40);
}

export interface DashboardSubscriptions {
  isAdmin: boolean;
  onPosts: (posts: Post[], initialized: boolean) => void;
  onBanners: (banners: BannerSchedule[]) => void;
  onCountdowns: (countdowns: EventCountdown[]) => void;
  onPlayEvents?: (events: PlayEventRecord[]) => void;
  onDesign: (design: DesignSettings, existsInFirestore: boolean) => void;
  onError: (err: Error) => void;
}

export function subscribeDashboardData({
  isAdmin,
  onPosts,
  onBanners,
  onCountdowns,
  onPlayEvents,
  onDesign,
  onError,
}: DashboardSubscriptions): () => void {
  const unsubs: Unsubscribe[] = [];

  const postsRef = isAdmin
    ? collection(db, 'posts')
    : query(collection(db, 'posts'), where('isDraft', '==', false));

  unsubs.push(
    onSnapshot(
      postsRef,
      (snap) => {
        const rows: Post[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            title: String(raw.title || ''),
            bodyHtml: String(raw.bodyHtml || ''),
            font: raw.font || 'sans',
            manualTags: Array.isArray(raw.manualTags) ? raw.manualTags : [],
            inlineTags: Array.isArray(raw.inlineTags) ? raw.inlineTags : [],
            attachments: Array.isArray(raw.attachments)
              ? (raw.attachments as MediaAttachment[]).map((att) => ({
                  ...att,
                  url: att.url ? normalizeShortsToWatchUrl(String(att.url)) : att.url,
                }))
              : [],
            createdAt: String(raw.createdAt || new Date().toISOString()),
            publishedAt: String(raw.publishedAt || new Date().toISOString()),
            scheduledFor: raw.scheduledFor ?? null,
            scheduledTimeZone: raw.scheduledTimeZone ?? null,
            pinnedUntil: raw.pinnedUntil ?? null,
            pinnedTimeZone: raw.pinnedTimeZone ?? null,
            isDraft: Boolean(raw.isDraft),
          };
        });
        onPosts(rows, !snap.empty);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'posts');
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        const rows: BannerSchedule[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            title: String(raw.title || ''),
            subtitle: String(raw.subtitle || ''),
            subtitleHtml: raw.subtitleHtml ?? undefined,
            imageUrl: String(raw.imageUrl || ''),
            mode: raw.mode || 'slideshow',
            startAt: raw.startAt ?? undefined,
            endAt: raw.endAt ?? undefined,
            dailyStartHour:
              typeof raw.dailyStartHour === 'number' ? raw.dailyStartHour : undefined,
            dailyEndHour:
              typeof raw.dailyEndHour === 'number' ? raw.dailyEndHour : undefined,
            timeZone: raw.timeZone ?? undefined,
            priority: typeof raw.priority === 'number' ? raw.priority : 20,
          };
        });
        rows.sort((a, b) => b.priority - a.priority);
        onBanners(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'banners');
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'countdowns'),
      (snap) => {
        const rows: EventCountdown[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            id: d.id,
            title: String(raw.title || ''),
            targetAt: String(raw.targetAt || ''),
            timeZone: raw.timeZone ?? undefined,
            tag: raw.tag ?? undefined,
            location: raw.location ?? undefined,
            bodyHtml: raw.bodyHtml ?? undefined,
            font: raw.font ?? undefined,
            displayFormat: raw.displayFormat ?? undefined,
            attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
            milestoneBodyHtml: raw.milestoneBodyHtml ?? undefined,
            milestoneFont: raw.milestoneFont ?? undefined,
            milestoneAttachments: Array.isArray(raw.milestoneAttachments)
              ? raw.milestoneAttachments
              : [],
          };
        });
        rows.sort(
          (a, b) =>
            new Date(a.targetAt).getTime() - new Date(b.targetAt).getTime()
        );
        onCountdowns(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'countdowns');
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'config', 'design'),
      (snap) => {
        if (!snap.exists()) {
          onDesign(
            {
              theme: 'default',
              surfaceStyle: 'aero-glass',
              customBackdropUrl: '',
              customThemes: [],
            },
            false
          );
          return;
        }
        const raw = snap.data();
        onDesign(
          {
            theme: String(raw.theme || 'default'),
            surfaceStyle:
              raw.surfaceStyle === 'crisp-2026' ? 'crisp-2026' : 'aero-glass',
            customBackdropUrl: String(raw.customBackdropUrl || ''),
            customThemes: Array.isArray(raw.customThemes) ? raw.customThemes : [],
          },
          true
        );
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'config/design');
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    )
  );

  if (onPlayEvents) {
    unsubs.push(
      onSnapshot(
        collection(db, 'play_events'),
        (snap) => {
          const rows: PlayEventRecord[] = snap.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              title: String(raw.title || ''),
              url: String(raw.url || ''),
              kind:
                raw.kind === 'youtube-video'
                  ? 'youtube-video'
                  : 'youtube-playlist',
              mediaId: String(raw.mediaId || ''),
              dateLabel: String(raw.dateLabel || ''),
              year: String(raw.year || ''),
              era: String(raw.era || ''),
              scheduledFor: raw.scheduledFor ?? null,
              scheduledTimeZone: raw.scheduledTimeZone ?? null,
              isDeleted: Boolean(raw.isDeleted),
            };
          });
          rows.sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
          onPlayEvents(rows);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'play_events');
          } catch (wrapped) {
            onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
          }
        }
      )
    );
  }

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function seedFirestoreIfEmpty(authorId: string): Promise<void> {
  try {
    const designSnap = await getDoc(doc(db, 'config', 'design'));
    const postsSnap = await getDocs(collection(db, 'posts'));
    if (designSnap.exists() || !postsSnap.empty) {
      return;
    }

    const res = await fetch('/api/state');
    if (!res.ok) return;
    const local = (await res.json()) as IntranetState;

    const batch = writeBatch(db);

    for (const post of local.posts || []) {
      const ref = doc(db, 'posts', post.id);
      batch.set(
        ref,
        stripUndefinedDeep({
          title: String(post.title || '').slice(0, 300),
          bodyHtml: String(post.bodyHtml || '').slice(0, 200000),
          font: post.font || 'sans',
          manualTags: sanitizeTagList(post.manualTags),
          inlineTags: sanitizeTagList(post.inlineTags),
          attachments: sanitizeAttachments(post.attachments, 30),
          createdAt: String(post.createdAt || new Date().toISOString()).slice(0, 64),
          publishedAt: String(post.publishedAt || new Date().toISOString()).slice(
            0,
            64
          ),
          scheduledFor: post.scheduledFor ? String(post.scheduledFor).slice(0, 64) : null,
          scheduledTimeZone: post.scheduledTimeZone
            ? String(post.scheduledTimeZone).slice(0, 64)
            : null,
          pinnedUntil: post.pinnedUntil ? String(post.pinnedUntil).slice(0, 64) : null,
          pinnedTimeZone: post.pinnedTimeZone
            ? String(post.pinnedTimeZone).slice(0, 64)
            : null,
          isDraft: Boolean(post.isDraft),
          authorId,
          serverCreatedAt: serverTimestamp(),
          serverUpdatedAt: serverTimestamp(),
        })
      );
    }

    for (const b of local.banners || []) {
      const ref = doc(db, 'banners', b.id);
      batch.set(
        ref,
        stripUndefinedDeep({
          title: String(b.title || '').slice(0, 200),
          subtitle: String(b.subtitle || '').slice(0, 1000),
          subtitleHtml: b.subtitleHtml
            ? String(b.subtitleHtml).slice(0, 4000)
            : null,
          imageUrl: String(b.imageUrl || '').slice(
            0,
            2000
          ),
          mode: b.mode || 'slideshow',
          startAt: b.startAt ? String(b.startAt).slice(0, 64) : null,
          endAt: b.endAt ? String(b.endAt).slice(0, 64) : null,
          dailyStartHour:
            typeof b.dailyStartHour === 'number' ? b.dailyStartHour : null,
          dailyEndHour:
            typeof b.dailyEndHour === 'number' ? b.dailyEndHour : null,
          timeZone: b.timeZone ? String(b.timeZone).slice(0, 64) : null,
          priority: typeof b.priority === 'number' ? b.priority : 20,
          authorId,
          serverUpdatedAt: serverTimestamp(),
        })
      );
    }

    for (const cd of local.countdowns || []) {
      const ref = doc(db, 'countdowns', cd.id);
      batch.set(
        ref,
        stripUndefinedDeep({
          title: String(cd.title || 'Upcoming Event').slice(0, 200),
          targetAt: String(cd.targetAt || new Date().toISOString()).slice(0, 64),
          timeZone: cd.timeZone ? String(cd.timeZone).slice(0, 64) : null,
          tag: cd.tag ? String(cd.tag).slice(0, 80) : null,
          location: cd.location ? String(cd.location).slice(0, 200) : null,
          bodyHtml: cd.bodyHtml ? String(cd.bodyHtml).slice(0, 100000) : '',
          font: cd.font || 'sans',
          displayFormat: cd.displayFormat || 'full',
          attachments: sanitizeAttachments(cd.attachments, 20),
          milestoneBodyHtml: cd.milestoneBodyHtml
            ? String(cd.milestoneBodyHtml).slice(0, 100000)
            : '',
          milestoneFont: cd.milestoneFont || 'sans',
          milestoneAttachments: sanitizeAttachments(cd.milestoneAttachments, 20),
          authorId,
          serverUpdatedAt: serverTimestamp(),
        })
      );
    }

    const designPayload = local.design || {
      theme: 'default',
      surfaceStyle: 'aero-glass',
      customBackdropUrl: '',
      customThemes: [],
    };
    batch.set(
      doc(db, 'config', 'design'),
      stripUndefinedDeep({
        theme: String(designPayload.theme || 'default').slice(0, 128),
        surfaceStyle:
          designPayload.surfaceStyle === 'crisp-2026'
            ? 'crisp-2026'
            : 'aero-glass',
        customBackdropUrl: String(designPayload.customBackdropUrl || '').slice(
          0,
          2000
        ),
        customThemes: sanitizeCustomThemes(designPayload.customThemes),
        authorId,
        serverUpdatedAt: serverTimestamp(),
      })
    );

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'posts');
  }
}

export async function createPostDoc(
  authorId: string,
  payload: {
    title: string;
    bodyHtml: string;
    font: Post['font'];
    manualTags: string[];
    inlineTags: string[];
    attachments: MediaAttachment[];
    scheduledFor: string | null;
    scheduledTimeZone?: string | null;
    pinnedUntil: string | null;
    pinnedTimeZone?: string | null;
    isDraft?: boolean;
  }
): Promise<void> {
  const id = `post-${crypto.randomUUID()}`;
  const path = `posts/${id}`;
  const nowIso = new Date().toISOString();
  try {
    await setDoc(
      doc(db, 'posts', id),
      stripUndefinedDeep({
        title: String(payload.title || '').slice(0, 300),
        bodyHtml: String(payload.bodyHtml || '').slice(0, 200000),
        font: payload.font || 'sans',
        manualTags: sanitizeTagList(payload.manualTags),
        inlineTags: sanitizeTagList(payload.inlineTags),
        attachments: sanitizeAttachments(payload.attachments, 30),
        createdAt: nowIso,
        publishedAt: payload.scheduledFor || nowIso,
        scheduledFor: payload.scheduledFor ?? null,
        scheduledTimeZone: payload.scheduledTimeZone
          ? String(payload.scheduledTimeZone).slice(0, 64)
          : null,
        pinnedUntil: payload.pinnedUntil ?? null,
        pinnedTimeZone: payload.pinnedTimeZone
          ? String(payload.pinnedTimeZone).slice(0, 64)
          : null,
        isDraft: Boolean(payload.isDraft),
        authorId,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updatePostDoc(
  postId: string,
  patch: Partial<{
    title: string;
    bodyHtml: string;
    font: Post['font'];
    manualTags: string[];
    inlineTags: string[];
    attachments: MediaAttachment[];
    publishedAt: string;
    scheduledFor: string | null;
    scheduledTimeZone: string | null;
    pinnedUntil: string | null;
    pinnedTimeZone: string | null;
    isDraft: boolean;
  }>
): Promise<void> {
  const path = `posts/${postId}`;
  const updatePayload: Record<string, unknown> = {
    serverUpdatedAt: serverTimestamp(),
  };

  if (patch.title !== undefined)
    updatePayload.title = String(patch.title).slice(0, 300);
  if (patch.bodyHtml !== undefined)
    updatePayload.bodyHtml = String(patch.bodyHtml).slice(0, 200000);
  if (patch.font !== undefined) updatePayload.font = patch.font;
  if (patch.manualTags !== undefined)
    updatePayload.manualTags = sanitizeTagList(patch.manualTags);
  if (patch.inlineTags !== undefined)
    updatePayload.inlineTags = sanitizeTagList(patch.inlineTags);
  if (patch.attachments !== undefined)
    updatePayload.attachments = sanitizeAttachments(patch.attachments, 30);
  if (patch.publishedAt !== undefined)
    updatePayload.publishedAt = String(patch.publishedAt).slice(0, 64);
  if (patch.scheduledFor !== undefined)
    updatePayload.scheduledFor = patch.scheduledFor ?? null;
  if (patch.scheduledTimeZone !== undefined)
    updatePayload.scheduledTimeZone = patch.scheduledTimeZone
      ? String(patch.scheduledTimeZone).slice(0, 64)
      : null;
  if (patch.pinnedUntil !== undefined)
    updatePayload.pinnedUntil = patch.pinnedUntil ?? null;
  if (patch.pinnedTimeZone !== undefined)
    updatePayload.pinnedTimeZone = patch.pinnedTimeZone
      ? String(patch.pinnedTimeZone).slice(0, 64)
      : null;
  if (patch.isDraft !== undefined)
    updatePayload.isDraft = Boolean(patch.isDraft);

  try {
    await updateDoc(doc(db, 'posts', postId), stripUndefinedDeep(updatePayload));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePostDoc(postId: string): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function renameTagBatch(
  oldTag: string,
  newTag: string,
  allPosts: Post[],
  allCountdowns: EventCountdown[]
): Promise<void> {
  const cleanOld = oldTag.replace(/^#+/, '').trim();
  const cleanNew = newTag
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .trim();
  if (!cleanOld || !cleanNew) return;

  const oldLower = cleanOld.toLowerCase();
  const inlineRegex = new RegExp(
    `#${escapeRegExp(cleanOld)}(?![\\p{L}\\p{N}_-])`,
    'giu'
  );

  const replaceList = (list: string[]) => {
    const mapped = list.map((t) => (t.toLowerCase() === oldLower ? cleanNew : t));
    const seen = new Map<string, string>();
    for (const t of mapped) {
      const k = t.toLowerCase();
      if (!seen.has(k)) seen.set(k, t);
    }
    return sanitizeTagList(Array.from(seen.values()));
  };

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const post of allPosts) {
      const hasInline =
        inlineRegex.test(post.title) || inlineRegex.test(post.bodyHtml);
      inlineRegex.lastIndex = 0;
      const hasManual = (post.manualTags || []).some(
        (t) => t.toLowerCase() === oldLower
      );
      const hasInlineArr = (post.inlineTags || []).some(
        (t) => t.toLowerCase() === oldLower
      );
      if (!hasInline && !hasManual && !hasInlineArr) continue;

      batch.update(doc(db, 'posts', post.id), {
        title: post.title.replace(inlineRegex, `#${cleanNew}`).slice(0, 300),
        bodyHtml: post.bodyHtml
          .replace(inlineRegex, `#${cleanNew}`)
          .slice(0, 200000),
        manualTags: replaceList(post.manualTags || []),
        inlineTags: replaceList(post.inlineTags || []),
        serverUpdatedAt: serverTimestamp(),
      });
      count++;
      if (count >= 450) break;
    }

    for (const cd of allCountdowns) {
      if (cd.tag && cd.tag.toLowerCase() === oldLower) {
        batch.update(doc(db, 'countdowns', cd.id), {
          tag: cleanNew.slice(0, 80),
          serverUpdatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'posts');
  }
}

export async function deleteTagBatch(
  tag: string,
  allPosts: Post[],
  allCountdowns: EventCountdown[]
): Promise<void> {
  const clean = tag.replace(/^#+/, '').trim();
  if (!clean) return;
  const targetLower = clean.toLowerCase();
  const inlineRegex = new RegExp(
    `#${escapeRegExp(clean)}(?![\\p{L}\\p{N}_-])`,
    'giu'
  );

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const post of allPosts) {
      const hasInline =
        inlineRegex.test(post.title) || inlineRegex.test(post.bodyHtml);
      inlineRegex.lastIndex = 0;
      const hasManual = (post.manualTags || []).some(
        (t) => t.toLowerCase() === targetLower
      );
      const hasInlineArr = (post.inlineTags || []).some(
        (t) => t.toLowerCase() === targetLower
      );
      if (!hasInline && !hasManual && !hasInlineArr) continue;

      batch.update(doc(db, 'posts', post.id), {
        title: post.title.replace(inlineRegex, clean).slice(0, 300),
        bodyHtml: post.bodyHtml.replace(inlineRegex, clean).slice(0, 200000),
        manualTags: sanitizeTagList(
          (post.manualTags || []).filter((t) => t.toLowerCase() !== targetLower)
        ),
        inlineTags: sanitizeTagList(
          (post.inlineTags || []).filter((t) => t.toLowerCase() !== targetLower)
        ),
        serverUpdatedAt: serverTimestamp(),
      });
      count++;
      if (count >= 450) break;
    }

    for (const cd of allCountdowns) {
      if (cd.tag && cd.tag.toLowerCase() === targetLower) {
        batch.update(doc(db, 'countdowns', cd.id), {
          tag: null,
          serverUpdatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'posts');
  }
}

export async function createBannerDoc(
  authorId: string,
  payload: Omit<BannerSchedule, 'id'>
): Promise<void> {
  const id = `banner-${crypto.randomUUID()}`;
  const path = `banners/${id}`;
  try {
    await setDoc(
      doc(db, 'banners', id),
      stripUndefinedDeep({
        title: String(payload.title || '').slice(0, 200),
        subtitle: String(payload.subtitle || '').slice(0, 1000),
        subtitleHtml: payload.subtitleHtml
          ? String(payload.subtitleHtml).slice(0, 4000)
          : null,
        imageUrl: String(payload.imageUrl || '').slice(0, 2000),
        mode: payload.mode || 'slideshow',
        startAt: payload.startAt ? String(payload.startAt).slice(0, 64) : null,
        endAt: payload.endAt ? String(payload.endAt).slice(0, 64) : null,
        dailyStartHour:
          typeof payload.dailyStartHour === 'number'
            ? payload.dailyStartHour
            : null,
        dailyEndHour:
          typeof payload.dailyEndHour === 'number' ? payload.dailyEndHour : null,
        timeZone: payload.timeZone
          ? String(payload.timeZone).slice(0, 64)
          : null,
        priority: typeof payload.priority === 'number' ? payload.priority : 20,
        authorId,
        serverUpdatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateBannerDoc(
  bannerId: string,
  patch: Partial<BannerSchedule>
): Promise<void> {
  const path = `banners/${bannerId}`;
  const clean: Record<string, unknown> = {
    serverUpdatedAt: serverTimestamp(),
  };
  if (patch.title !== undefined)
    clean.title = String(patch.title).slice(0, 200);
  if (patch.subtitle !== undefined)
    clean.subtitle = String(patch.subtitle).slice(0, 1000);
  if (patch.subtitleHtml !== undefined)
    clean.subtitleHtml = patch.subtitleHtml ?? null;
  if (patch.imageUrl !== undefined)
    clean.imageUrl = String(patch.imageUrl).slice(0, 2000);
  if (patch.mode !== undefined) clean.mode = patch.mode;
  if (patch.startAt !== undefined) clean.startAt = patch.startAt ?? null;
  if (patch.endAt !== undefined) clean.endAt = patch.endAt ?? null;
  if (patch.dailyStartHour !== undefined)
    clean.dailyStartHour = patch.dailyStartHour ?? null;
  if (patch.dailyEndHour !== undefined)
    clean.dailyEndHour = patch.dailyEndHour ?? null;
  if (patch.timeZone !== undefined)
    clean.timeZone = patch.timeZone ? String(patch.timeZone).slice(0, 64) : null;
  if (patch.priority !== undefined) clean.priority = patch.priority;

  try {
    await updateDoc(doc(db, 'banners', bannerId), stripUndefinedDeep(clean));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteBannerDoc(bannerId: string): Promise<void> {
  const path = `banners/${bannerId}`;
  try {
    await deleteDoc(doc(db, 'banners', bannerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createCountdownDoc(
  authorId: string,
  payload: Omit<EventCountdown, 'id'>
): Promise<void> {
  const id = `cd-${crypto.randomUUID()}`;
  const path = `countdowns/${id}`;
  try {
    await setDoc(
      doc(db, 'countdowns', id),
      stripUndefinedDeep({
        title: String(payload.title || 'Upcoming Event').slice(0, 200),
        targetAt: String(
          payload.targetAt || new Date(Date.now() + 7 * 86400 * 1000).toISOString()
        ).slice(0, 64),
        timeZone: payload.timeZone
          ? String(payload.timeZone).slice(0, 64)
          : null,
        tag: payload.tag ? String(payload.tag).slice(0, 80) : null,
        location: payload.location
          ? String(payload.location).slice(0, 200)
          : null,
        bodyHtml: payload.bodyHtml
          ? String(payload.bodyHtml).slice(0, 100000)
          : '',
        font: payload.font || 'sans',
        displayFormat: payload.displayFormat || 'full',
        attachments: sanitizeAttachments(payload.attachments, 20),
        milestoneBodyHtml: payload.milestoneBodyHtml
          ? String(payload.milestoneBodyHtml).slice(0, 100000)
          : '',
        milestoneFont: payload.milestoneFont || 'sans',
        milestoneAttachments: sanitizeAttachments(
          payload.milestoneAttachments,
          20
        ),
        authorId,
        serverUpdatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateCountdownDoc(
  countdownId: string,
  payload: Omit<EventCountdown, 'id'>
): Promise<void> {
  const path = `countdowns/${countdownId}`;
  try {
    await updateDoc(
      doc(db, 'countdowns', countdownId),
      stripUndefinedDeep({
        title: String(payload.title || 'Upcoming Event').slice(0, 200),
        targetAt: String(
          payload.targetAt || new Date(Date.now() + 7 * 86400 * 1000).toISOString()
        ).slice(0, 64),
        timeZone: payload.timeZone
          ? String(payload.timeZone).slice(0, 64)
          : null,
        tag: payload.tag ? String(payload.tag).slice(0, 80) : null,
        location: payload.location
          ? String(payload.location).slice(0, 200)
          : null,
        bodyHtml: payload.bodyHtml
          ? String(payload.bodyHtml).slice(0, 100000)
          : '',
        font: payload.font || 'sans',
        displayFormat: payload.displayFormat || 'full',
        attachments: sanitizeAttachments(payload.attachments, 20),
        milestoneBodyHtml: payload.milestoneBodyHtml
          ? String(payload.milestoneBodyHtml).slice(0, 100000)
          : '',
        milestoneFont: payload.milestoneFont || 'sans',
        milestoneAttachments: sanitizeAttachments(
          payload.milestoneAttachments,
          20
        ),
        serverUpdatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCountdownDoc(countdownId: string): Promise<void> {
  const path = `countdowns/${countdownId}`;
  try {
    await deleteDoc(doc(db, 'countdowns', countdownId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createPlayEventDoc(
  authorId: string,
  payload: Omit<PlayEventRecord, 'id'>
): Promise<void> {
  const id = `ev-${crypto.randomUUID()}`;
  const path = `play_events/${id}`;
  try {
    await setDoc(
      doc(db, 'play_events', id),
      stripUndefinedDeep({
        title: String(payload.title || 'Play Event').slice(0, 200),
        url: normalizeShortsToWatchUrl(String(payload.url || '')).slice(0, 2000),
        kind:
          payload.kind === 'youtube-video' ? 'youtube-video' : 'youtube-playlist',
        mediaId: String(payload.mediaId || '').slice(0, 200),
        dateLabel: String(payload.dateLabel || '').slice(0, 64),
        year: String(payload.year || '').slice(0, 32),
        era: String(payload.era || '').slice(0, 80),
        scheduledFor: payload.scheduledFor
          ? String(payload.scheduledFor).slice(0, 64)
          : null,
        scheduledTimeZone: payload.scheduledTimeZone
          ? String(payload.scheduledTimeZone).slice(0, 64)
          : null,
        authorId,
        serverUpdatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updatePlayEventDoc(
  eventId: string,
  payload: Omit<PlayEventRecord, 'id'>
): Promise<void> {
  const path = `play_events/${eventId}`;
  try {
    await updateDoc(
      doc(db, 'play_events', eventId),
      stripUndefinedDeep({
        title: String(payload.title || 'Play Event').slice(0, 200),
        url: normalizeShortsToWatchUrl(String(payload.url || '')).slice(0, 2000),
        kind:
          payload.kind === 'youtube-video' ? 'youtube-video' : 'youtube-playlist',
        mediaId: String(payload.mediaId || '').slice(0, 200),
        dateLabel: String(payload.dateLabel || '').slice(0, 64),
        year: String(payload.year || '').slice(0, 32),
        era: String(payload.era || '').slice(0, 80),
        scheduledFor: payload.scheduledFor
          ? String(payload.scheduledFor).slice(0, 64)
          : null,
        scheduledTimeZone: payload.scheduledTimeZone
          ? String(payload.scheduledTimeZone).slice(0, 64)
          : null,
        serverUpdatedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePlayEventDoc(eventId: string): Promise<void> {
  const path = `play_events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'play_events', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function upsertPlayEventWithIdDoc(
  authorId: string,
  eventId: string,
  payload: Omit<PlayEventRecord, 'id'>
): Promise<void> {
  const path = `play_events/${eventId}`;
  const ref = doc(db, 'play_events', eventId);
  const fields = stripUndefinedDeep({
    title: String(payload.title || 'Play Event').slice(0, 200),
    url: normalizeShortsToWatchUrl(String(payload.url || '')).slice(0, 2000),
    kind:
      payload.kind === 'youtube-video' ? 'youtube-video' : 'youtube-playlist',
    mediaId: String(payload.mediaId || '').slice(0, 200),
    dateLabel: String(payload.dateLabel || '').slice(0, 64),
    year: String(payload.year || '').slice(0, 32),
    era: String(payload.era || '').slice(0, 80),
    scheduledFor: payload.scheduledFor
      ? String(payload.scheduledFor).slice(0, 64)
      : null,
    scheduledTimeZone: payload.scheduledTimeZone
      ? String(payload.scheduledTimeZone).slice(0, 64)
      : null,
    isDeleted: Boolean(payload.isDeleted),
    serverUpdatedAt: serverTimestamp(),
  });
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, fields);
    } else {
      await setDoc(ref, {
        ...fields,
        authorId,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveDesignConfigDoc(
  authorId: string,
  design: DesignSettings
): Promise<void> {
  const path = 'config/design';
  const ref = doc(db, 'config', 'design');
  const fields = stripUndefinedDeep({
    theme: String(design.theme || 'default').slice(0, 128),
    surfaceStyle:
      design.surfaceStyle === 'crisp-2026' ? 'crisp-2026' : 'aero-glass',
    customBackdropUrl: String(design.customBackdropUrl || '').slice(0, 2000),
    customThemes: sanitizeCustomThemes(design.customThemes),
    serverUpdatedAt: serverTimestamp(),
  });

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, fields);
    } else {
      await setDoc(ref, {
        ...fields,
        authorId,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

const EMAIL_ID_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;

export function normalizeEmailId(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 254);
}

export function isValidEmailAddress(raw: string): boolean {
  const email = normalizeEmailId(raw);
  return email.length >= 3 && email.length <= 254 && EMAIL_ID_REGEX.test(email);
}

function toIsoStringSafe(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function subscribeOwnCollaboratorStatus(
  email: string,
  onChange: (hasAccess: boolean) => void
): () => void {
  const clean = normalizeEmailId(email);
  if (!isValidEmailAddress(clean)) {
    onChange(false);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'collaborators', clean),
    (snap) => onChange(snap.exists()),
    () => onChange(false)
  );
}

export function subscribeOwnAccessRequest(
  uid: string,
  onChange: (req: AccessRequestRecord | null) => void
): () => void {
  if (!uid) {
    onChange(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'access_requests', uid),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const raw = snap.data();
      onChange({
        uid: snap.id,
        email: String(raw.email || ''),
        displayName: raw.displayName ? String(raw.displayName) : undefined,
        note: raw.note ? String(raw.note) : undefined,
        status: 'pending',
        requestedAt: toIsoStringSafe(raw.requestedAt),
      });
    },
    () => onChange(null)
  );
}

export function subscribeTeamManagement({
  onCollaborators,
  onRequests,
  onError,
}: {
  onCollaborators: (items: CollaboratorRecord[]) => void;
  onRequests: (items: AccessRequestRecord[]) => void;
  onError: (err: Error) => void;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'collaborators'),
      (snap) => {
        const rows: CollaboratorRecord[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            email: String(raw.email || d.id),
            displayName: raw.displayName ? String(raw.displayName) : undefined,
            note: raw.note ? String(raw.note) : undefined,
            addedByUid: String(raw.addedByUid || ''),
            addedByEmail: raw.addedByEmail ? String(raw.addedByEmail) : undefined,
            addedAt: toIsoStringSafe(raw.addedAt),
          };
        });
        rows.sort((a, b) => a.email.localeCompare(b.email));
        onCollaborators(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'collaborators');
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'access_requests'),
      (snap) => {
        const rows: AccessRequestRecord[] = snap.docs.map((d) => {
          const raw = d.data();
          return {
            uid: d.id,
            email: String(raw.email || ''),
            displayName: raw.displayName ? String(raw.displayName) : undefined,
            note: raw.note ? String(raw.note) : undefined,
            status: 'pending',
            requestedAt: toIsoStringSafe(raw.requestedAt),
          };
        });
        rows.sort(
          (a, b) =>
            new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
        );
        onRequests(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'access_requests');
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    )
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function addCollaboratorDoc(
  adminUid: string,
  adminEmail: string,
  targetEmail: string,
  options?: { displayName?: string; note?: string }
): Promise<void> {
  const cleanEmail = normalizeEmailId(targetEmail);
  if (!isValidEmailAddress(cleanEmail)) {
    throw new Error('Please enter a valid Google email address.');
  }
  const path = `collaborators/${cleanEmail}`;
  try {
    await setDoc(
      doc(db, 'collaborators', cleanEmail),
      stripUndefinedDeep({
        email: cleanEmail,
        displayName: options?.displayName?.trim().slice(0, 160) || undefined,
        note: options?.note?.trim().slice(0, 500) || undefined,
        addedByUid: adminUid,
        addedByEmail: normalizeEmailId(adminEmail) || undefined,
        addedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function ensureSelfCollaboratorDoc(
  uid: string,
  email: string,
  displayName?: string
): Promise<void> {
  const cleanEmail = normalizeEmailId(email);
  if (!uid || !isValidEmailAddress(cleanEmail)) return;
  const ref = doc(db, 'collaborators', cleanEmail);
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) return;
    await setDoc(
      ref,
      stripUndefinedDeep({
        email: cleanEmail,
        displayName: displayName?.trim().slice(0, 160) || undefined,
        note: 'Joined via Google Sign-In',
        addedByUid: uid,
        addedByEmail: cleanEmail,
        addedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    console.warn('Could not auto-register collaborator record:', err);
  }
}

export async function removeCollaboratorDoc(email: string): Promise<void> {
  const cleanEmail = normalizeEmailId(email);
  const path = `collaborators/${cleanEmail}`;
  try {
    await deleteDoc(doc(db, 'collaborators', cleanEmail));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function submitAccessRequestDoc(params: {
  uid: string;
  email: string;
  displayName?: string;
  note?: string;
}): Promise<void> {
  const cleanEmail = normalizeEmailId(params.email);
  if (!isValidEmailAddress(cleanEmail)) {
    throw new Error('Verified Google email address is required.');
  }
  const path = `access_requests/${params.uid}`;
  try {
    await setDoc(
      doc(db, 'access_requests', params.uid),
      stripUndefinedDeep({
        uid: params.uid,
        email: cleanEmail,
        displayName: params.displayName?.trim().slice(0, 160) || undefined,
        note: params.note?.trim().slice(0, 500) || undefined,
        status: 'pending',
        requestedAt: serverTimestamp(),
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function withdrawAccessRequestDoc(uid: string): Promise<void> {
  const path = `access_requests/${uid}`;
  try {
    await deleteDoc(doc(db, 'access_requests', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function approveAccessRequestDoc(
  adminUid: string,
  adminEmail: string,
  req: AccessRequestRecord
): Promise<void> {
  const cleanEmail = normalizeEmailId(req.email);
  if (!isValidEmailAddress(cleanEmail)) {
    throw new Error('Invalid email on access request.');
  }
  const path = `collaborators/${cleanEmail}`;
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'collaborators', cleanEmail),
      stripUndefinedDeep({
        email: cleanEmail,
        displayName: req.displayName?.trim().slice(0, 160) || undefined,
        note: req.note?.trim().slice(0, 500) || undefined,
        addedByUid: adminUid,
        addedByEmail: normalizeEmailId(adminEmail) || undefined,
        addedAt: serverTimestamp(),
      })
    );
    batch.delete(doc(db, 'access_requests', req.uid));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function declineAccessRequestDoc(uid: string): Promise<void> {
  const path = `access_requests/${uid}`;
  try {
    await deleteDoc(doc(db, 'access_requests', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
