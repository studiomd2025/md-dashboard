import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Music,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import type { MediaAttachment, Post } from '../types';
import {
  formatFileSize,
  formatPostTimestamp,
  getFontClass,
  getMergedPostTags,
  normalizeShortsToWatchUrl,
  sanitizeRichHtml,
} from '../lib/mediaUtils';

export function isTargetedInAppDomain(urlStr: string): boolean {
  try {
    const parsed = new URL(
      urlStr,
      typeof window !== 'undefined' ? window.location.href : undefined
    );
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'officialmdmemo.blogspot.com' ||
      host === 'mydiariesmagazine.wordpress.com'
    );
  } catch {
    return false;
  }
}

interface TimelineCardProps {
  post: Post;
  nowMs: number;
  activeTag: string | null;
  onSelectTag: (tag: string) => void;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
  onTogglePin: (post: Post) => void;
  onOpenLightbox: (url: string, title?: string) => void;
  onOpenPost?: (post: Post) => void;
  onOpenInAppWeb?: (url: string, title: string) => void;
  isDetailView?: boolean;
  canEdit?: boolean;
  layoutMode?: 'stack' | 'grid';
}

interface MediaDimension {
  w: number;
  h: number;
}

function getDefaultMediaDim(att: MediaAttachment): MediaDimension {
  if (att.type === 'embed') {
    const isShorts = (att.url || '').includes('/shorts/');
    return isShorts ? { w: 9, h: 16 } : { w: 16, h: 9 };
  }
  if (att.type === 'video') {
    return { w: 16, h: 9 };
  }
  return { w: 4, h: 3 };
}

function renderTextWithClickableHashtags(
  text: string,
  onSelectTag: (tag: string) => void
): React.ReactNode {
  const parts = text.split(/(#[\p{L}\p{N}_-]{2,40})/gu);
  return parts.map((part, idx) => {
    if (part.startsWith('#') && part.length > 2) {
      const clean = part.slice(1);
      return (
        <button
          key={idx}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTag(clean);
          }}
          className="diary-hashtag-inline"
        >
          {part}
        </button>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function enhanceBodyHtmlWithTagLinks(html: string): string {
  const safe = sanitizeRichHtml(html);
  if (typeof DOMParser === 'undefined') return safe;
  const parser = new DOMParser();
  const doc = parser.parseFromString(safe, 'text/html');

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const parentTag = current.parentElement?.tagName.toUpperCase();
    if (parentTag !== 'A' && parentTag !== 'BUTTON') {
      textNodes.push(current as Text);
    }
  }

  for (const node of textNodes) {
    const val = node.nodeValue || '';
    const regex = /#([\p{L}\p{N}_-]{2,40})/gu;
    if (!regex.test(val)) continue;
    regex.lastIndex = 0;

    const frag = doc.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(val)) !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(doc.createTextNode(val.slice(lastIndex, match.index)));
      }
      const btn = doc.createElement('button');
      btn.setAttribute('type', 'button');
      btn.setAttribute('data-inline-tag', match[1]);
      btn.className = 'diary-hashtag-inline';
      btn.textContent = `#${match[1]}`;
      frag.appendChild(btn);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < val.length) {
      frag.appendChild(doc.createTextNode(val.slice(lastIndex)));
    }
    node.parentNode?.replaceChild(frag, node);
  }

  return doc.body.innerHTML;
}

function isCarouselAttachment(att: MediaAttachment): boolean {
  if (att.type === 'image' || att.type === 'gif' || att.type === 'video') {
    return true;
  }
  if (att.type === 'embed' && att.embedUrl) {
    return att.embedKind !== 'spotify' && att.embedKind !== 'soundcloud';
  }
  return false;
}

const MediaSlide: React.FC<{
  attachment: MediaAttachment;
  mode: 'single' | 'carousel';
  sharedHeight?: number;
  maxWidth?: number;
  measuredDim?: MediaDimension;
  onMeasure?: (id: string, w: number, h: number) => void;
  onOpenLightbox: (url: string, title?: string) => void;
}> = ({
  attachment,
  mode,
  sharedHeight,
  maxWidth,
  measuredDim,
  onMeasure,
  onOpenLightbox,
}) => {
  const dim = measuredDim || getDefaultMediaDim(attachment);
  const ratio = dim.w > 0 && dim.h > 0 ? dim.w / dim.h : 4 / 3;
  const isShorts = attachment.type === 'embed' && (attachment.url || '').includes('/shorts/');

  // For equal-height carousel slides: height matches the tallest media item in the post,
  // while width adjusts proportionally to preserve exact aspect ratio without cropping.
  const slideStyle: React.CSSProperties | undefined =
    mode === 'carousel' && sharedHeight
      ? {
          height: `${sharedHeight}px`,
          width: `${Math.min(
            maxWidth || 640,
            Math.max(140, Math.round(sharedHeight * ratio))
          )}px`,
          maxWidth: '100%',
        }
      : undefined;

  if (attachment.type === 'image' || attachment.type === 'gif') {
    if (mode === 'carousel') {
      return (
        <figure
          style={slideStyle}
          className="relative shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950/[0.04] dark:border-slate-700/70 dark:bg-slate-950/70"
        >
          <button
            type="button"
            onClick={() => onOpenLightbox(attachment.url, attachment.title)}
            className="block h-full w-full cursor-pointer"
          >
            <img
              src={attachment.url}
              alt={attachment.title || 'Post media'}
              referrerPolicy="no-referrer"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  onMeasure?.(attachment.id, img.naturalWidth, img.naturalHeight);
                }
              }}
              className="block h-full w-full object-contain"
            />
          </button>
          {attachment.type === 'gif' && (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-950/75 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
              GIF
            </span>
          )}
        </figure>
      );
    }

    // Single image or detail view: uncropped natural aspect ratio inside X-style rounded border
    return (
      <figure className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950/[0.03] dark:border-slate-700/70 dark:bg-slate-950/70">
        <button
          type="button"
          onClick={() => onOpenLightbox(attachment.url, attachment.title)}
          className="block w-full cursor-pointer"
        >
          <img
            src={attachment.url}
            alt={attachment.title || 'Post media'}
            referrerPolicy="no-referrer"
            className="mx-auto block w-full max-h-[520px] h-auto object-contain"
          />
        </button>
        {attachment.type === 'gif' && (
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-md bg-slate-950/75 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
            GIF
          </span>
        )}
      </figure>
    );
  }

  if (attachment.type === 'video') {
    if (mode === 'carousel') {
      return (
        <div
          style={slideStyle}
          className="shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/80 bg-black dark:border-slate-700/70"
        >
          <video
            controls
            preload="metadata"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) {
                onMeasure?.(attachment.id, v.videoWidth, v.videoHeight);
              }
            }}
            className="block h-full w-full object-contain bg-black"
            src={attachment.url}
          />
        </div>
      );
    }

    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200/80 bg-black dark:border-slate-700/70">
        <video
          controls
          preload="metadata"
          className="block w-full bg-black object-contain max-h-[520px]"
          src={attachment.url}
        />
      </div>
    );
  }

  // Video / YouTube embed
  if (mode === 'carousel') {
    return (
      <div
        style={{ ...slideStyle, containerType: 'size' }}
        className="shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/80 bg-black flex items-center justify-center dark:border-slate-700/70"
      >
        <iframe
          src={attachment.embedUrl}
          title={attachment.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          style={
            isShorts
              ? {
                  width: 'min(100cqw, calc(100cqh * 9 / 16))',
                  height: 'min(100cqh, calc(100cqw * 16 / 9))',
                }
              : {
                  width: 'min(100cqw, calc(100cqh * 16 / 9))',
                  height: 'min(100cqh, calc(100cqw * 9 / 16))',
                }
          }
          className="block border-0"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 bg-black dark:border-slate-700/70">
      <div
        className={
          isShorts
            ? 'mx-auto aspect-[9/16] max-h-[520px] w-full max-w-[310px]'
            : 'aspect-video w-full'
        }
      >
        <iframe
          src={attachment.embedUrl}
          title={attachment.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="block h-full w-full border-0"
        />
      </div>
    </div>
  );
};

const StackedCardRenderer: React.FC<{
  attachment: MediaAttachment;
  onOpenInAppWeb?: (url: string, title: string) => void;
}> = ({ attachment, onOpenInAppWeb }) => {
  if (attachment.type === 'audio') {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-sky-200/70 bg-sky-50/70 p-4 dark:border-sky-800/50 dark:bg-sky-950/30">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-100">
          <Music className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="truncate">{attachment.title || 'Audio File'}</span>
          {attachment.fileSize ? (
            <span className="ml-auto font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
              {formatFileSize(attachment.fileSize)}
            </span>
          ) : null}
        </div>
        <audio controls preload="metadata" className="w-full" src={attachment.url} />
      </div>
    );
  }

  if (attachment.type === 'embed' && attachment.embedUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950/5 dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="h-[152px] w-full">
          <iframe
            src={attachment.embedUrl}
            title={attachment.title || 'Audio embed player'}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    );
  }

  if (attachment.type === 'document') {
    return (
      <a
        href={attachment.url}
        download={attachment.title || true}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm transition-colors hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:bg-slate-800/80"
      >
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900 dark:text-white">
              {attachment.title || 'Attached Document'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Document
              {attachment.fileSize ? ` · ${formatFileSize(attachment.fileSize)}` : ''}
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 whitespace-nowrap shrink-0">
          Download
        </span>
      </a>
    );
  }

  // Web link preview card
  const safeHref = normalizeShortsToWatchUrl(attachment.url);
  const safeSubtitle = attachment.subtitle
    ? normalizeShortsToWatchUrl(attachment.subtitle)
    : safeHref;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (
          Capacitor.isNativePlatform() &&
          isTargetedInAppDomain(safeHref) &&
          onOpenInAppWeb
        ) {
          e.preventDefault();
          e.stopPropagation();
          onOpenInAppWeb(safeHref, attachment.title || safeHref);
        }
      }}
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm transition-colors hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:bg-slate-800/80"
    >
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-900 dark:text-white">
          {attachment.title || safeHref}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {safeSubtitle}
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
    </a>
  );
};

export const TimelineCard: React.FC<TimelineCardProps> = ({
  post,
  nowMs,
  activeTag,
  onSelectTag,
  onEdit,
  onDelete,
  onTogglePin,
  onOpenLightbox,
  onOpenPost,
  onOpenInAppWeb,
  isDetailView = false,
  canEdit = false,
  layoutMode = 'stack',
}) => {
  const isGridMode = !isDetailView && layoutMode === 'grid';
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isBodyTruncated, setIsBodyTruncated] = useState(false);
  const [mediaDims, setMediaDims] = useState<Record<string, MediaDimension>>({});
  const [trackWidth, setTrackWidth] = useState<number>(isGridMode ? 320 : 560);

  const isPinned =
    !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
  const isScheduledFuture =
    !!post.scheduledFor && new Date(post.scheduledFor).getTime() > nowMs;

  const mergedTags = getMergedPostTags(post);
  const processedHtml = useMemo(
    () => enhanceBodyHtmlWithTagLinks(post.bodyHtml),
    [post.bodyHtml]
  );

  const carouselItems = useMemo(
    () => (post.attachments || []).filter(isCarouselAttachment),
    [post.attachments]
  );
  const stackedCardItems = useMemo(
    () => (post.attachments || []).filter((att) => !isCarouselAttachment(att)),
    [post.attachments]
  );

  useEffect(() => {
    const el = carouselTrackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setTrackWidth(el.clientWidth);
    };
    updateWidth();
    const obs = new ResizeObserver(updateWidth);
    obs.observe(el);
    return () => obs.disconnect();
  }, [carouselItems.length, layoutMode]);

  const handleMeasure = (id: string, w: number, h: number) => {
    if (!w || !h) return;
    setMediaDims((prev) => {
      const cur = prev[id];
      if (cur && cur.w === w && cur.h === h) return prev;
      return { ...prev, [id]: { w, h } };
    });
  };

  // Equal height across all slides in this post's carousel, matched to the tallest item
  const sharedCarouselHeight = useMemo(() => {
    if (carouselItems.length <= 1) return undefined;
    const refW = Math.min(
      Math.round(trackWidth * 0.86),
      isGridMode ? 310 : 500
    );
    const minCap = isGridMode ? 190 : 230;
    const maxCap = isGridMode ? 360 : 480;
    let tallest = isGridMode ? 220 : 280;
    for (const item of carouselItems) {
      const dim = mediaDims[item.id] || getDefaultMediaDim(item);
      if (dim.w > 0 && dim.h > 0) {
        const naturalH = Math.round((refW * dim.h) / dim.w);
        const clamped = Math.max(minCap, Math.min(maxCap, naturalH));
        if (clamped > tallest) tallest = clamped;
      }
    }
    return tallest;
  }, [carouselItems, mediaDims, trackWidth, isGridMode]);

  useEffect(() => {
    if (isDetailView) {
      setIsBodyTruncated(false);
      return;
    }
    const el = bodyRef.current;
    if (!el) {
      setIsBodyTruncated(false);
      return;
    }
    const checkOverflow = () => {
      setIsBodyTruncated(el.scrollHeight > el.clientHeight + 2);
    };
    checkOverflow();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(checkOverflow);
    obs.observe(el);
    return () => obs.disconnect();
  }, [processedHtml, isDetailView, post.font, layoutMode]);

  const handleProseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tagAttr = target.getAttribute('data-inline-tag');
    if (tagAttr) {
      e.preventDefault();
      e.stopPropagation();
      onSelectTag(tagAttr);
      return;
    }

    if (Capacitor.isNativePlatform() && onOpenInAppWeb) {
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href') || anchor.href;
        if (href && isTargetedInAppDomain(href)) {
          e.preventDefault();
          e.stopPropagation();
          const title =
            anchor.innerText?.trim() ||
            anchor.getAttribute('title') ||
            'Web View';
          onOpenInAppWeb(href, title);
        }
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isDetailView || !onOpenPost) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button, video, audio, iframe, input, select, textarea')) {
      return;
    }
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 0) return;
    onOpenPost(post);
  };

  const scrollCarouselBy = (direction: -1 | 1) => {
    const track = carouselTrackRef.current;
    if (!track) return;
    const stepWidth = Math.max(220, Math.round(track.clientWidth * 0.78));
    track.scrollBy({ left: direction * stepWidth, behavior: 'smooth' });
  };

  const handleCarouselScroll = () => {
    const track = carouselTrackRef.current;
    if (!track || carouselItems.length <= 1) return;
    const maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
    const progress = track.scrollLeft / maxScroll;
    const idx = Math.min(
      carouselItems.length - 1,
      Math.max(0, Math.round(progress * (carouselItems.length - 1)))
    );
    setActiveSlideIndex(idx);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`aero-glass rounded-3xl transition-shadow ${
        isGridMode ? 'p-4 sm:p-5' : 'p-5 sm:p-7'
      } ${
        !isDetailView && onOpenPost
          ? 'cursor-pointer hover:shadow-lg'
          : ''
      }`}
    >
      {/* Metadata & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <time dateTime={post.publishedAt}>
            {formatPostTimestamp(post.publishedAt, true, post.scheduledTimeZone)}
          </time>
          {isPinned && (
            <>
              <span aria-hidden="true">·</span>
              <span
                title="Pinned"
                aria-label="Pinned"
                className="inline-flex items-center text-sky-700 dark:text-sky-300"
              >
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </>
          )}
          {isScheduledFuture && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-sans font-semibold text-amber-700 dark:text-amber-300">
                Scheduled
              </span>
            </>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTogglePin(post)}
              title={isPinned ? 'Unpin post' : 'Pin post to top for 7 days'}
              aria-label={isPinned ? 'Unpin post' : 'Pin post to top'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-sky-100/80 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-sky-900/40 dark:hover:text-sky-300 cursor-pointer"
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
            {isDetailView && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(post)}
                  title="Edit post"
                  aria-label="Edit post"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-sky-100/80 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-sky-900/40 dark:hover:text-sky-300 cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(post.id)}
                  title="Delete post"
                  aria-label="Delete post"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-100/80 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {post.title.trim() && (
        <h2
          className={`mt-2.5 font-display font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance] ${
            isGridMode ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {renderTextWithClickableHashtags(post.title, onSelectTag)}
        </h2>
      )}

      {/* Rich Text Body */}
      {post.bodyHtml.trim() && (
        <div className="mt-3">
          <div
            ref={bodyRef}
            onClick={handleProseClick}
            className={`diary-prose text-[15px] text-slate-700 dark:text-slate-200 ${getFontClass(
              post.font
            )} ${
              !isDetailView
                ? isGridMode
                  ? 'max-h-[116px] overflow-hidden'
                  : 'max-h-[156px] overflow-hidden'
                : ''
            }`}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
          {!isDetailView && isBodyTruncated && onOpenPost && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPost(post);
              }}
              className="mt-1.5 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400 cursor-pointer"
            >
              Show more
            </button>
          )}
        </div>
      )}

      {/* Tags (kept directly with text above media, matching X layout) */}
      {mergedTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {mergedTags.map((tag) => {
            const isSelected = activeTag?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag(tag)}
                className={`font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'font-semibold text-sky-700 underline underline-offset-4 dark:text-sky-300'
                    : 'text-sky-600 hover:text-sky-800 hover:underline hover:underline-offset-4 dark:text-sky-400 dark:hover:text-sky-200'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Below Text/Tags: Uncropped X/Twitter-Styled Media Carousel (Tallest-Height Matched) or Pinterest Masonry Grid */}
      {carouselItems.length > 0 && (
        <div className="relative mt-3.5">
          {isDetailView ? (
            <div className="space-y-3">
              {carouselItems.map((att) => (
                <MediaSlide
                  key={att.id}
                  attachment={att}
                  mode="single"
                  onOpenLightbox={onOpenLightbox}
                />
              ))}
            </div>
          ) : carouselItems.length === 1 ? (
            <MediaSlide
              attachment={carouselItems[0]}
              mode="single"
              onOpenLightbox={onOpenLightbox}
            />
          ) : (
            <div className="group/carousel relative">
              <div
                ref={carouselTrackRef}
                onScroll={handleCarouselScroll}
                className="flex items-stretch gap-1.5 sm:gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
              >
                {carouselItems.map((att) => (
                  <MediaSlide
                    key={att.id}
                    attachment={att}
                    mode="carousel"
                    sharedHeight={sharedCarouselHeight}
                    maxWidth={trackWidth}
                    measuredDim={mediaDims[att.id]}
                    onMeasure={handleMeasure}
                    onOpenLightbox={onOpenLightbox}
                  />
                ))}
              </div>

              {/* X/Twitter-style Floating Carousel Navigation Arrows */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollCarouselBy(-1);
                }}
                aria-label="Previous media"
                title="Previous media"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/65 text-white shadow-md backdrop-blur-md opacity-85 sm:opacity-0 sm:group-hover/carousel:opacity-100 hover:bg-slate-950/90 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollCarouselBy(1);
                }}
                aria-label="Next media"
                title="Next media"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/65 text-white shadow-md backdrop-blur-md opacity-85 sm:opacity-0 sm:group-hover/carousel:opacity-100 hover:bg-slate-950/90 transition-opacity cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Subtle X-style Slide Counter Badge */}
              <span className="pointer-events-none absolute bottom-3 right-2.5 z-10 rounded-full bg-slate-950/75 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums backdrop-blur-md">
                {activeSlideIndex + 1} / {carouselItems.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Below Carousel/Grid: Stacked Web Link / Document / Audio Cards */}
      {stackedCardItems.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {stackedCardItems.map((att) => (
            <StackedCardRenderer
              key={att.id}
              attachment={att}
              onOpenInAppWeb={onOpenInAppWeb}
            />
          ))}
        </div>
      )}
    </article>
  );
};

