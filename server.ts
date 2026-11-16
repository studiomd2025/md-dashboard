import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  BannerSchedule,
  DesignSettings,
  EventCountdown,
  Post,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const FIREBASE_CONFIG_PATH = path.resolve(process.cwd(), 'firebase-applet-config.json');

interface FirebaseAppletConfig {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
}

function readFirebaseConfig(): FirebaseAppletConfig | null {
  try {
    if (!fs.existsSync(FIREBASE_CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf-8')) as FirebaseAppletConfig;
  } catch {
    return null;
  }
}

type FsValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FsValue[] };
  mapValue?: { fields?: Record<string, FsValue> };
};

function decodeFirestoreValue(val: FsValue | undefined): unknown {
  if (!val) return undefined;
  if ('nullValue' in val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((v) => decodeFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function decodeFirestoreDoc(docName: string, fields: Record<string, FsValue> = {}): Record<string, unknown> {
  const id = docName.split('/').pop() || '';
  const out: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(fields)) {
    out[k] = decodeFirestoreValue(v);
  }
  return out;
}

async function fetchPublicFirestoreState(): Promise<{
  posts: Post[];
  countdowns: EventCountdown[];
} | null> {
  const cfg = readFirebaseConfig();
  if (!cfg?.projectId || !cfg?.firestoreDatabaseId) return null;

  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.projectId
  )}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents`;
  const keyParam = cfg.apiKey ? `?key=${encodeURIComponent(cfg.apiKey)}` : '';

  try {
    const [postsRes, cdRes] = await Promise.all([
      fetch(`${base}:runQuery${keyParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'posts' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'isDraft' },
                op: 'EQUAL',
                value: { booleanValue: false },
              },
            },
          },
        }),
      }),
      fetch(`${base}/countdowns${keyParam}&pageSize=50`.replace('/countdowns&', '/countdowns?')),
    ]);

    if (!postsRes.ok) return null;
    const rows = (await postsRes.json()) as {
      document?: { name: string; fields?: Record<string, FsValue> };
    }[];

    const posts: Post[] = rows
      .filter((r) => Boolean(r.document?.name))
      .map((r) => {
        const d = decodeFirestoreDoc(r.document!.name, r.document!.fields);
        return {
          id: String(d.id || ''),
          title: String(d.title || ''),
          bodyHtml: String(d.bodyHtml || ''),
          font: (d.font as Post['font']) || 'sans',
          manualTags: Array.isArray(d.manualTags) ? (d.manualTags as string[]) : [],
          inlineTags: Array.isArray(d.inlineTags) ? (d.inlineTags as string[]) : [],
          attachments: Array.isArray(d.attachments) ? (d.attachments as Post['attachments']) : [],
          createdAt: String(d.createdAt || new Date().toISOString()),
          publishedAt: String(d.publishedAt || new Date().toISOString()),
          scheduledFor: (d.scheduledFor as string | null) ?? null,
          pinnedUntil: (d.pinnedUntil as string | null) ?? null,
          isDraft: Boolean(d.isDraft),
        };
      });

    let countdowns: EventCountdown[] = [];
    if (cdRes.ok) {
      const cdJson = (await cdRes.json()) as {
        documents?: { name: string; fields?: Record<string, FsValue> }[];
      };
      countdowns = (cdJson.documents || []).map((docItem) => {
        const d = decodeFirestoreDoc(docItem.name, docItem.fields);
        return {
          id: String(d.id || ''),
          title: String(d.title || ''),
          targetAt: String(d.targetAt || ''),
          tag: (d.tag as string | undefined) ?? undefined,
          location: (d.location as string | undefined) ?? undefined,
          bodyHtml: (d.bodyHtml as string | undefined) ?? undefined,
          font: (d.font as EventCountdown['font']) ?? undefined,
          displayFormat: (d.displayFormat as EventCountdown['displayFormat']) ?? undefined,
          attachments: Array.isArray(d.attachments)
            ? (d.attachments as EventCountdown['attachments'])
            : [],
          milestoneBodyHtml: (d.milestoneBodyHtml as string | undefined) ?? undefined,
          milestoneFont: (d.milestoneFont as EventCountdown['milestoneFont']) ?? undefined,
          milestoneAttachments: Array.isArray(d.milestoneAttachments)
            ? (d.milestoneAttachments as EventCountdown['milestoneAttachments'])
            : [],
        };
      });
    }

    if (posts.length === 0 && countdowns.length === 0) {
      return null;
    }
    return { posts, countdowns };
  } catch {
    return null;
  }
}

interface StoreData {
  posts: Post[];
  banners: BannerSchedule[];
  countdowns: EventCountdown[];
  design: DesignSettings;
}

const DEFAULT_DESIGN: DesignSettings = {
  theme: 'aero-daylight',
  surfaceStyle: 'aero-glass',
  customBackdropUrl: '',
  customThemes: [],
};

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function buildSeedData(): StoreData {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
  const daysAgo = (d: number) => new Date(now - d * 86400 * 1000).toISOString();
  const daysAhead = (d: number) => new Date(now + d * 86400 * 1000).toISOString();

  const posts: Post[] = [
    {
      id: 'post-seed-1',
      title: 'Welcome to MY DIARIES DASHBOARD #StudioLaunch2026',
      bodyHtml:
        '<p>Migrated away from the restrictive free blog template into our own <strong>Frutiger Aero + 2026 glass dashboard</strong>. This pinned announcement stays at the top until next week.</p><p>You can format text with <span style="color: #0284c7"><u>custom accent colors</u></span>, switch typefaces per post, attach wide-screen photos or cute animated GIFs, embed playable YouTube playlists, and tag everything by event like #AeroRefresh.</p>',
      font: 'sans',
      manualTags: ['StudioLaunch2026', 'AeroRefresh', 'DashboardNotes'],
      inlineTags: ['StudioLaunch2026', 'AeroRefresh'],
      attachments: [
        {
          id: 'att-seed-1',
          type: 'image',
          url: '/samples/post-widescreen.jpg',
          title: 'Morning Coastal Desk Setup',
          subtitle: 'Wide-screen diary capture',
        },
        {
          id: 'att-seed-2',
          type: 'link',
          url: 'https://f-droid.org/en/packages/com.nononsenseapps.feeder/',
          title: 'Feeder (Free & Open-Source Android RSS Widget)',
          subtitle: 'f-droid.org',
        },
      ],
      createdAt: hoursAgo(5),
      publishedAt: hoursAgo(5),
      scheduledFor: null,
      pinnedUntil: daysAhead(7),
    },
    {
      id: 'post-seed-2',
      title: 'Botanical Glasshouse Walk & Ambient Playlist #GlasshouseDay',
      bodyHtml:
        '<p>Spent the afternoon inside the conservatory dome taking notes for our #KyotoAutumn2026 trip. Sunlight through curved glass feels straight out of 2008 optimism.</p><blockquote>"Keep the archive calm, personal, and free of comment noise."</blockquote>',
      font: 'serif',
      manualTags: ['GlasshouseDay', 'KyotoAutumn2026', 'FieldLog'],
      inlineTags: ['GlasshouseDay', 'KyotoAutumn2026'],
      attachments: [
        {
          id: 'att-seed-3',
          type: 'image',
          url: '/samples/post-event.jpg',
          title: 'Conservatory Reflection Pool',
          subtitle: '4:3 field photograph',
        },
        {
          id: 'att-seed-4',
          type: 'embed',
          url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
          title: 'Ambient Study Stream (Playable Inline)',
          subtitle: 'YouTube Embed',
          embedKind: 'youtube-video',
          embedUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk',
        },
      ],
      createdAt: daysAgo(2),
      publishedAt: daysAgo(2),
      scheduledFor: null,
      pinnedUntil: null,
    },
    {
      id: 'post-seed-3',
      title: 'October Archive Check-In #AutumnPrep2026',
      bodyHtml:
        '<p>Packing checklist and rough itinerary saved before November. Testing multi-month archive grouping and scheduled banner transitions.</p>',
      font: 'mono',
      manualTags: ['AutumnPrep2026', 'KyotoAutumn2026'],
      inlineTags: ['AutumnPrep2026'],
      attachments: [],
      createdAt: daysAgo(22),
      publishedAt: daysAgo(22),
      scheduledFor: null,
      pinnedUntil: null,
    },
    {
      id: 'post-seed-4',
      title: 'Scheduled Reflection: Evening Arrival #KyotoAutumn2026',
      bodyHtml:
        '<p>This entry is queued for future release! Once the clock reaches the scheduled timestamp, it automatically moves into the live timeline and Android widget feed.</p>',
      font: 'hand',
      manualTags: ['KyotoAutumn2026', 'ScheduledEntry'],
      inlineTags: ['KyotoAutumn2026'],
      attachments: [],
      createdAt: hoursAgo(2),
      publishedAt: daysAhead(2),
      scheduledFor: daysAhead(2),
      pinnedUntil: null,
    },
  ];

  const banners: BannerSchedule[] = [];

  const countdowns: EventCountdown[] = [
    {
      id: 'cd-1',
      title: 'Kyoto Autumn Trip',
      targetAt: daysAhead(14),
      tag: 'KyotoAutumn2026',
      location: 'Kyoto, Japan',
    },
    {
      id: 'cd-2',
      title: 'Winter Studio Showcase',
      targetAt: daysAhead(38),
      tag: 'StudioLaunch2026',
      location: 'Personal Archive',
    },
  ];

  return {
    posts,
    banners,
    countdowns,
    design: { ...DEFAULT_DESIGN },
  };
}

function readStore(): StoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      return {
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        banners: Array.isArray(parsed.banners) ? parsed.banners : [],
        countdowns: Array.isArray(parsed.countdowns) ? parsed.countdowns : [],
        design: parsed.design
          ? {
              theme: parsed.design.theme || 'aero-daylight',
              surfaceStyle: parsed.design.surfaceStyle || 'aero-glass',
              customBackdropUrl: parsed.design.customBackdropUrl || '',
              customThemes: Array.isArray(parsed.design.customThemes)
                ? parsed.design.customThemes
                : [],
            }
          : { ...DEFAULT_DESIGN },
      };
    }
  } catch (err) {
    console.error('Failed to read store.json, recreating seed:', err);
  }
  const seed = buildSeedData();
  writeStore(seed);
  return seed;
}

function writeStore(data: StoreData): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPostLive(post: Post, nowMs: number): boolean {
  if (post.isDraft) return false;
  const target = post.scheduledFor || post.publishedAt;
  const ts = new Date(target).getTime();
  return Number.isNaN(ts) || ts <= nowMs;
}

function isPostPinned(post: Post, nowMs: number): boolean {
  if (post.isDraft) return false;
  if (!post.pinnedUntil) return false;
  const ts = new Date(post.pinnedUntil).getTime();
  return !Number.isNaN(ts) && ts > nowMs;
}

async function startServer() {
  const app = express();

  app.post(
    '/api/upload-raw',
    express.raw({ type: '*/*', limit: '250mb' }),
    (req, res) => {
      try {
        const rawBuf = req.body as Buffer;
        if (!Buffer.isBuffer(rawBuf) || rawBuf.length === 0) {
          res.status(400).json({ error: 'Missing file payload.' });
          return;
        }
        const fileNameParam =
          typeof req.query.fileName === 'string' ? req.query.fileName : 'upload.bin';
        const mimeParam =
          typeof req.query.mimeType === 'string'
            ? req.query.mimeType
            : 'application/octet-stream';
        const ext =
          path.extname(fileNameParam).replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
        const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
        const targetPath = path.join(UPLOADS_DIR, safeName);
        fs.writeFileSync(targetPath, rawBuf);

        res.json({
          url: `/uploads/${safeName}`,
          fileName: fileNameParam || safeName,
          mimeType: mimeParam,
          fileSize: rawBuf.length,
        });
      } catch (err) {
        console.error('Raw upload error:', err);
        res.status(500).json({ error: 'Failed to store uploaded file.' });
      }
    }
  );

  app.use(express.json({ limit: '150mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/samples', express.static(path.resolve(process.cwd(), 'public', 'samples')));

  app.get('/api/state', (_req, res) => {
    const store = readStore();
    res.json({
      ...store,
      serverTime: new Date().toISOString(),
    });
  });

  app.post('/api/upload', (req, res) => {
    try {
      const { fileName, mimeType, dataBase64 } = req.body as {
        fileName?: string;
        mimeType?: string;
        dataBase64?: string;
      };
      if (!dataBase64 || typeof dataBase64 !== 'string') {
        res.status(400).json({ error: 'Missing file payload.' });
        return;
      }

      const rawBase64 = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
      const buffer = Buffer.from(rawBase64, 'base64');
      const ext = path.extname(fileName || '').replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
      const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      const targetPath = path.join(UPLOADS_DIR, safeName);
      fs.writeFileSync(targetPath, buffer);

      res.json({
        url: `/uploads/${safeName}`,
        fileName: fileName || safeName,
        mimeType: mimeType || 'application/octet-stream',
        fileSize: buffer.length,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to store uploaded file.' });
    }
  });

  app.post('/api/posts', (req, res) => {
    const store = readStore();
    const body = req.body as Partial<Post>;
    const nowIso = new Date().toISOString();
    const isDraft = Boolean(body.isDraft);
    const newPost: Post = {
      id: `post-${crypto.randomUUID()}`,
      title: typeof body.title === 'string' ? body.title : '',
      bodyHtml: typeof body.bodyHtml === 'string' ? body.bodyHtml : '',
      font: body.font || 'sans',
      manualTags: Array.isArray(body.manualTags) ? body.manualTags : [],
      inlineTags: Array.isArray(body.inlineTags) ? body.inlineTags : [],
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      createdAt: nowIso,
      publishedAt: body.scheduledFor || nowIso,
      scheduledFor: body.scheduledFor || null,
      pinnedUntil: body.pinnedUntil || null,
      isDraft,
    };
    store.posts.unshift(newPost);
    writeStore(store);
    res.status(201).json(newPost);
  });

  app.patch('/api/posts/:id', (req, res) => {
    const store = readStore();
    const idx = store.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const patch = req.body as Partial<Post>;
    const existing = store.posts[idx];
    const updated: Post = {
      ...existing,
      title: patch.title !== undefined ? patch.title : existing.title,
      bodyHtml: patch.bodyHtml !== undefined ? patch.bodyHtml : existing.bodyHtml,
      font: patch.font !== undefined ? patch.font : existing.font,
      manualTags: patch.manualTags !== undefined ? patch.manualTags : existing.manualTags,
      inlineTags: patch.inlineTags !== undefined ? patch.inlineTags : existing.inlineTags,
      attachments: patch.attachments !== undefined ? patch.attachments : existing.attachments,
      scheduledFor: patch.scheduledFor !== undefined ? patch.scheduledFor : existing.scheduledFor,
      publishedAt:
        patch.publishedAt !== undefined
          ? patch.publishedAt
          : patch.scheduledFor
          ? patch.scheduledFor
          : existing.publishedAt,
      pinnedUntil: patch.pinnedUntil !== undefined ? patch.pinnedUntil : existing.pinnedUntil,
      isDraft: patch.isDraft !== undefined ? Boolean(patch.isDraft) : existing.isDraft,
    };
    store.posts[idx] = updated;
    writeStore(store);
    res.json(updated);
  });

  app.delete('/api/posts/:id', (req, res) => {
    const store = readStore();
    store.posts = store.posts.filter((p) => p.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Event Tag Cloud bulk rename / merge / delete across all posts
  app.post('/api/tags/rename', (req, res) => {
    const store = readStore();
    const { oldTag, newTag } = req.body as { oldTag?: string; newTag?: string };
    const cleanOld = (oldTag || '').replace(/^#+/, '').trim();
    const cleanNew = (newTag || '').replace(/^#+/, '').replace(/[^\p{L}\p{N}_-]/gu, '').trim();
    if (!cleanOld || !cleanNew) {
      res.status(400).json({ error: 'Both oldTag and newTag are required.' });
      return;
    }

    const oldLower = cleanOld.toLowerCase();
    const inlineRegex = new RegExp(`#${escapeRegExp(cleanOld)}(?![\\p{L}\\p{N}_-])`, 'giu');

    store.posts = store.posts.map((post) => {
      const replaceList = (list: string[]) => {
        const mapped = list.map((t) => (t.toLowerCase() === oldLower ? cleanNew : t));
        const seen = new Map<string, string>();
        for (const t of mapped) {
          const k = t.toLowerCase();
          if (!seen.has(k)) seen.set(k, t);
        }
        return Array.from(seen.values());
      };

      return {
        ...post,
        title: post.title.replace(inlineRegex, `#${cleanNew}`),
        bodyHtml: post.bodyHtml.replace(inlineRegex, `#${cleanNew}`),
        manualTags: replaceList(post.manualTags || []),
        inlineTags: replaceList(post.inlineTags || []),
      };
    });

    // Also update any linked countdown tag
    store.countdowns = store.countdowns.map((cd) =>
      cd.tag && cd.tag.toLowerCase() === oldLower ? { ...cd, tag: cleanNew } : cd
    );

    writeStore(store);
    res.json({ posts: store.posts, countdowns: store.countdowns });
  });

  app.post('/api/tags/delete', (req, res) => {
    const store = readStore();
    const { tag } = req.body as { tag?: string };
    const clean = (tag || '').replace(/^#+/, '').trim();
    if (!clean) {
      res.status(400).json({ error: 'Tag is required.' });
      return;
    }

    const targetLower = clean.toLowerCase();
    const inlineRegex = new RegExp(`#${escapeRegExp(clean)}(?![\\p{L}\\p{N}_-])`, 'giu');

    store.posts = store.posts.map((post) => ({
      ...post,
      title: post.title.replace(inlineRegex, clean),
      bodyHtml: post.bodyHtml.replace(inlineRegex, clean),
      manualTags: (post.manualTags || []).filter((t) => t.toLowerCase() !== targetLower),
      inlineTags: (post.inlineTags || []).filter((t) => t.toLowerCase() !== targetLower),
    }));

    store.countdowns = store.countdowns.map((cd) =>
      cd.tag && cd.tag.toLowerCase() === targetLower ? { ...cd, tag: undefined } : cd
    );

    writeStore(store);
    res.json({ posts: store.posts, countdowns: store.countdowns });
  });

  // Banners CRUD
  app.post('/api/banners', (req, res) => {
    const store = readStore();
    const b = req.body as Partial<BannerSchedule>;
    const created: BannerSchedule = {
      id: `banner-${crypto.randomUUID()}`,
      title: typeof b.title === 'string' ? b.title : '',
      subtitle: b.subtitle || '',
      subtitleHtml: typeof b.subtitleHtml === 'string' ? b.subtitleHtml : undefined,
      imageUrl: b.imageUrl || '/samples/banner-aero-horizon.jpg',
      mode: b.mode || 'slideshow',
      startAt: b.startAt,
      endAt: b.endAt,
      dailyStartHour: b.dailyStartHour,
      dailyEndHour: b.dailyEndHour,
      priority: typeof b.priority === 'number' ? b.priority : 20,
    };
    store.banners.unshift(created);
    writeStore(store);
    res.status(201).json(created);
  });

  app.patch('/api/banners/:id', (req, res) => {
    const store = readStore();
    const idx = store.banners.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Banner not found.' });
      return;
    }
    const patch = req.body as Partial<BannerSchedule>;
    store.banners[idx] = { ...store.banners[idx], ...patch };
    writeStore(store);
    res.json(store.banners[idx]);
  });

  app.delete('/api/banners/:id', (req, res) => {
    const store = readStore();
    store.banners = store.banners.filter((b) => b.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Countdowns CRUD (Next on MD)
  app.post('/api/countdowns', (req, res) => {
    const store = readStore();
    const c = req.body as Partial<EventCountdown>;
    const created: EventCountdown = {
      id: `cd-${crypto.randomUUID()}`,
      title: c.title || 'Upcoming Event',
      targetAt: c.targetAt || new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
      tag: c.tag || undefined,
      location: c.location || undefined,
      bodyHtml: typeof c.bodyHtml === 'string' ? c.bodyHtml : '',
      font: c.font || 'sans',
      displayFormat: c.displayFormat || 'full',
      attachments: Array.isArray(c.attachments) ? c.attachments : [],
      milestoneBodyHtml:
        typeof c.milestoneBodyHtml === 'string' ? c.milestoneBodyHtml : '',
      milestoneFont: c.milestoneFont || 'sans',
      milestoneAttachments: Array.isArray(c.milestoneAttachments)
        ? c.milestoneAttachments
        : [],
    };
    store.countdowns.push(created);
    writeStore(store);
    res.status(201).json(created);
  });

  app.patch('/api/countdowns/:id', (req, res) => {
    const store = readStore();
    const idx = store.countdowns.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Countdown not found.' });
      return;
    }
    const patch = req.body as Partial<EventCountdown>;
    store.countdowns[idx] = { ...store.countdowns[idx], ...patch };
    writeStore(store);
    res.json(store.countdowns[idx]);
  });

  app.delete('/api/countdowns/:id', (req, res) => {
    const store = readStore();
    store.countdowns = store.countdowns.filter((c) => c.id !== req.params.id);
    writeStore(store);
    res.json({ ok: true });
  });

  // Theme / Visual Design persistence
  app.put('/api/design', (req, res) => {
    const store = readStore();
    const body = req.body as Partial<DesignSettings>;
    store.design = {
      theme: body.theme || store.design.theme || 'aero-daylight',
      surfaceStyle: body.surfaceStyle || store.design.surfaceStyle || 'aero-glass',
      customBackdropUrl:
        body.customBackdropUrl !== undefined
          ? body.customBackdropUrl
          : store.design.customBackdropUrl || '',
      customThemes: Array.isArray(body.customThemes)
        ? body.customThemes
        : store.design.customThemes || [],
    };
    writeStore(store);
    res.json(store.design);
  });

  app.get('/api/widget-feed.json', async (req, res) => {
    const remote = await fetchPublicFirestoreState();
    const store = readStore();
    const sourcePosts = remote ? remote.posts : store.posts;
    const sourceCountdowns = remote ? remote.countdowns : store.countdowns;
    const nowMs = Date.now();
    const origin = `${req.protocol}://${req.get('host')}`;
    const livePosts = sourcePosts
      .filter((p) => isPostLive(p, nowMs))
      .sort((a, b) => {
        const aPin = isPostPinned(a, nowMs) ? 1 : 0;
        const bPin = isPostPinned(b, nowMs) ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, 12);

    res.json({
      title: 'MY DIARIES DASHBOARD',
      updatedAt: new Date().toISOString(),
      countdowns: sourceCountdowns,
      items: livePosts.map((p) => {
        const visual = p.attachments.find((a) => a.type === 'image' || a.type === 'gif');
        const mediaUrl = visual
          ? visual.url.startsWith('http')
            ? visual.url
            : `${origin}${visual.url}`
          : null;
        return {
          id: p.id,
          title: p.title || 'Diary Entry',
          excerpt: stripTags(p.bodyHtml).slice(0, 220),
          publishedAt: p.publishedAt,
          pinned: isPostPinned(p, nowMs),
          pinnedUntil: p.pinnedUntil,
          tags: Array.from(new Set([...p.inlineTags, ...p.manualTags])),
          wideImageUrl: mediaUrl,
          isAnimatedGif: visual?.type === 'gif',
        };
      }),
    });
  });

  app.get('/api/rss.xml', async (req, res) => {
    const remote = await fetchPublicFirestoreState();
    const store = readStore();
    const sourcePosts = remote ? remote.posts : store.posts;
    const nowMs = Date.now();
    const origin = `${req.protocol}://${req.get('host')}`;
    const livePosts = sourcePosts
      .filter((p) => isPostLive(p, nowMs))
      .sort((a, b) => {
        const aPin = isPostPinned(a, nowMs) ? 1 : 0;
        const bPin = isPostPinned(b, nowMs) ? 1 : 0;
        if (aPin !== bPin) return bPin - aPin;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, 20);

    const itemsXml = livePosts
      .map((p) => {
        const visual = p.attachments.find((a) => a.type === 'image' || a.type === 'gif');
        const mediaUrl = visual
          ? visual.url.startsWith('http')
            ? visual.url
            : `${origin}${visual.url}`
          : '';
        const tags = Array.from(new Set([...p.inlineTags, ...p.manualTags]));
        const titlePrefix = isPostPinned(p, nowMs) ? '[Pinned] ' : '';
        const categories = tags.map((t) => `<category>${xmlEscape(t)}</category>`).join('');
        const enclosure = mediaUrl
          ? `<enclosure url="${xmlEscape(mediaUrl)}" type="${visual?.type === 'gif' ? 'image/gif' : 'image/jpeg'}" length="0" />`
          : '';
        const mediaContent = mediaUrl
          ? `<media:content url="${xmlEscape(mediaUrl)}" medium="image" />`
          : '';
        return `<item>
      <guid isPermaLink="false">${xmlEscape(p.id)}</guid>
      <title>${xmlEscape(titlePrefix + (p.title || 'Diary Entry'))}</title>
      <link>${xmlEscape(origin)}/?post=${xmlEscape(p.id)}</link>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <description>${xmlEscape(stripTags(p.bodyHtml))}</description>
      ${categories}
      ${enclosure}
      ${mediaContent}
    </item>`;
      })
      .join('\n    ');

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>MY DIARIES DASHBOARD</title>
    <link>${xmlEscape(origin)}</link>
    <description>Personal multimedia diary and event timeline</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(rss);
  });

  const playlistFallbackCache = new Map<string, { data: unknown }>();

  app.get('/api/youtube-playlist', async (req, res) => {
    const listId = typeof req.query.list === 'string' ? req.query.list.trim() : '';
    if (!listId) {
      res.status(400).json({ error: 'Missing list parameter.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const items: Array<{
      videoId: string;
      title: string;
      thumbnail: string;
      published?: string;
    }> = [];
    const seen = new Set<string>();
    let playlistTitle = 'YouTube Playlist';

    try {
      const pageRes = await fetch(
        `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );

      if (pageRes.ok) {
        const html = await pageRes.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          playlistTitle = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim();
        }

        const match = html.match(/var ytInitialData\s*=\s*({[\s\S]*?});<\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          let continuationToken: string | null = null;

          const extractFromObject = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            if (obj.playlistVideoRenderer) {
              const r = obj.playlistVideoRenderer;
              const title =
                r.title?.runs?.map((x: any) => x.text).join('') ||
                r.title?.simpleText ||
                '';
              const videoId = r.videoId;
              if (videoId && title && !seen.has(videoId)) {
                seen.add(videoId);
                items.push({
                  videoId,
                  title: title.trim(),
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                });
              }
            }

            if (obj.lockupViewModel) {
              const l = obj.lockupViewModel;
              const title = l.metadata?.lockupMetadataViewModel?.title?.content;
              const videoId = l.contentId;
              if (videoId && title && !seen.has(videoId)) {
                seen.add(videoId);
                items.push({
                  videoId,
                  title: title.trim(),
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                });
              }
            }

            if (obj.compactVideoRenderer || obj.gridVideoRenderer) {
              const r = obj.compactVideoRenderer || obj.gridVideoRenderer;
              const title =
                r.title?.runs?.map((x: any) => x.text).join('') ||
                r.title?.simpleText ||
                '';
              const videoId = r.videoId;
              if (videoId && title && !seen.has(videoId)) {
                seen.add(videoId);
                items.push({
                  videoId,
                  title: title.trim(),
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                });
              }
            }

            if (!continuationToken) {
              if (obj.continuationCommand?.token) {
                continuationToken = obj.continuationCommand.token;
              } else if (
                obj.continuationItemRenderer?.continuationEndpoint
                  ?.continuationCommand?.token
              ) {
                continuationToken =
                  obj.continuationItemRenderer.continuationEndpoint
                    .continuationCommand.token;
              }
            }

            for (const k of Object.keys(obj)) {
              extractFromObject(obj[k]);
            }
          };

          extractFromObject(data);

          // Fetch continuation pages so we get all videos without 15-item limits
          let pageCount = 0;
          while (continuationToken && pageCount < 30) {
            pageCount++;
            const currentToken: string = continuationToken;
            continuationToken = null;
            try {
              const postRes = await fetch(
                'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent':
                      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  },
                  body: JSON.stringify({
                    context: {
                      client: {
                        clientName: 'WEB',
                        clientVersion: '2.20240101.00.00',
                        hl: 'en',
                        gl: 'US',
                      },
                    },
                    continuation: currentToken,
                  }),
                }
              );
              if (!postRes.ok) break;
              const postData = await postRes.json();
              extractFromObject(postData);
            } catch {
              break;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in initialData playlist scraper:', err);
    }

    // Fallback to RSS feed if scrapers found 0 items
    if (items.length === 0) {
      try {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(listId)}`;
        const feedRes = await fetch(feedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyDiariesBot/1.0)' },
        });
        if (feedRes.ok) {
          const xml = await feedRes.text();
          const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
          if (titleMatch && playlistTitle === 'YouTube Playlist') {
            playlistTitle = titleMatch[1].trim();
          }

          const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
          let match: RegExpExecArray | null;
          while ((match = entryRegex.exec(xml)) !== null) {
            const block = match[1];
            const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const videoTitleMatch = block.match(/<title>([^<]+)<\/title>/);
            const pubMatch = block.match(/<published>([^<]+)<\/published>/);
            if (idMatch && videoTitleMatch) {
              const videoId = idMatch[1].trim();
              if (!seen.has(videoId)) {
                seen.add(videoId);
                const cleanTitle = videoTitleMatch[1]
                  .replace(/&quot;/g, '"')
                  .replace(/&apos;/g, "'")
                  .replace(/&#39;/g, "'")
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .trim();
                items.push({
                  videoId,
                  title: cleanTitle,
                  thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                  published: pubMatch ? pubMatch[1].trim() : '',
                });
              }
            }
          }
        }
      } catch (feedErr) {
        console.error('Error fetching playlist XML fallback:', feedErr);
      }
    }

    if (items.length > 0) {
      const payload = {
        playlistId: listId,
        title: playlistTitle,
        items,
      };
      playlistFallbackCache.set(listId, { data: payload });
      res.json(payload);
      return;
    }

    const fallback = playlistFallbackCache.get(listId);
    if (fallback) {
      res.json(fallback.data);
      return;
    }

    res.json({
      playlistId: listId,
      title: playlistTitle,
      items: [],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MY DIARIES DASHBOARD running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
