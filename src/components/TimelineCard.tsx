import React, { useEffect, useRef, useState } from 'react';
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
  sanitizeRichHtml,
} from '../lib/mediaUtils';

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
  isDetailView?: boolean;
  canEdit?: boolean;
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

const CarouselSlide: React.FC<{
  attachment: MediaAttachment;
  isMulti: boolean;
  onOpenLightbox: (url: string, title?: string) => void;
}> = ({ attachment, isMulti, onOpenLightbox }) => {
  const frameHeightClass = isMulti ? 'h-[240px] sm:h-[310px]' : '';

  if (attachment.type === 'image' || attachment.type === 'gif') {
    return (
      <figure
        className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/80 dark:border-slate-700/60 dark:bg-slate-900/60 ${
          isMulti ? 'w-[86%] sm:w-[78%] shrink-0 snap-start' : 'w-full'
        }`}
      >
        <button
          type="button"
          onClick={() => onOpenLightbox(attachment.url, attachment.title)}
          className={`block w-full text-left cursor-zoom-in ${frameHeightClass}`}
        >
          <img
            src={attachment.url}
            alt={attachment.title || 'Post media'}
            referrerPolicy="no-referrer"
            className={`${
              isMulti ? 'h-full w-full' : 'max-h-[460px] w-full'
            } object-cover transition-transform duration-300 hover:scale-[1.01]`}
          />
        </button>
      </figure>
    );
  }

  if (attachment.type === 'video') {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 dark:border-slate-700/60 ${
          isMulti ? 'w-[86%] sm:w-[78%] shrink-0 snap-start flex flex-col' : 'w-full'
        }`}
      >
        <div className={isMulti ? 'h-[240px] sm:h-[310px] w-full bg-black' : 'w-full bg-black'}>
          <video
            controls
            preload="metadata"
            className={isMulti ? 'h-full w-full object-contain' : 'max-h-[440px] w-full'}
            src={attachment.url}
          />
        </div>
      </div>
    );
  }

  // Video / YouTube embed inside carousel
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950/5 dark:border-slate-700/60 dark:bg-slate-900/70 ${
        isMulti ? 'w-[86%] sm:w-[78%] shrink-0 snap-start flex flex-col' : 'w-full'
      }`}
    >
      <div className={isMulti ? 'h-[240px] sm:h-[310px] w-full' : 'aspect-video w-full'}>
        <iframe
          src={attachment.embedUrl}
          title={attachment.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
};

const StackedCardRenderer: React.FC<{ attachment: MediaAttachment }> = ({
  attachment,
}) => {
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
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm transition-colors hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:bg-slate-800/80"
    >
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-900 dark:text-white">
          {attachment.title || attachment.url}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {attachment.subtitle || attachment.url}
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
  isDetailView = false,
  canEdit = false,
}) => {
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isBodyTruncated, setIsBodyTruncated] = useState(false);

  const isPinned =
    !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > nowMs;
  const isScheduledFuture =
    !!post.scheduledFor && new Date(post.scheduledFor).getTime() > nowMs;

  const mergedTags = getMergedPostTags(post);
  const processedHtml = React.useMemo(
    () => enhanceBodyHtmlWithTagLinks(post.bodyHtml),
    [post.bodyHtml]
  );

  const carouselItems = React.useMemo(
    () => (post.attachments || []).filter(isCarouselAttachment),
    [post.attachments]
  );
  const stackedCardItems = React.useMemo(
    () => (post.attachments || []).filter((att) => !isCarouselAttachment(att)),
    [post.attachments]
  );

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
  }, [processedHtml, isDetailView, post.font]);

  const handleProseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const tagAttr = target.getAttribute('data-inline-tag');
    if (tagAttr) {
      e.preventDefault();
      e.stopPropagation();
      onSelectTag(tagAttr);
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
    const stepWidth = Math.max(260, track.clientWidth * 0.78);
    track.scrollBy({ left: direction * stepWidth, behavior: 'smooth' });
  };

  const handleCarouselScroll = () => {
    const track = carouselTrackRef.current;
    if (!track || carouselItems.length <= 1) return;
    const stepWidth = Math.max(200, track.clientWidth * 0.78);
    const idx = Math.min(
      carouselItems.length - 1,
      Math.max(0, Math.round(track.scrollLeft / stepWidth))
    );
    setActiveSlideIndex(idx);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`aero-glass rounded-3xl p-5 sm:p-7 transition-shadow ${
        !isDetailView && onOpenPost
          ? 'cursor-pointer hover:shadow-lg'
          : ''
      }`}
    >
      {/* Metadata & Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <time dateTime={post.publishedAt}>
            {formatPostTimestamp(post.publishedAt)}
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
          </div>
        )}
      </div>

      {/* Title */}
      {post.title.trim() && (
        <h2 className="mt-2.5 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white [text-wrap:balance]">
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
            )} ${!isDetailView ? 'max-h-[156px] overflow-hidden' : ''}`}
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

      {/* First Below Text/Tags: Visual Media & Video/YouTube Carousel (Timeline) or Vertical Stack (Expanded) */}
      {carouselItems.length > 0 && (
        <div className="relative mt-4">
          {isDetailView ? (
            <div className="space-y-3">
              {carouselItems.map((att) => (
                <CarouselSlide
                  key={att.id}
                  attachment={att}
                  isMulti={false}
                  onOpenLightbox={onOpenLightbox}
                />
              ))}
            </div>
          ) : carouselItems.length === 1 ? (
            <CarouselSlide
              attachment={carouselItems[0]}
              isMulti={false}
              onOpenLightbox={onOpenLightbox}
            />
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums dark:text-slate-400">
                <span>
                  {activeSlideIndex + 1} / {carouselItems.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollCarouselBy(-1)}
                    aria-label="Scroll media left"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/85 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCarouselBy(1)}
                    aria-label="Scroll media right"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/85 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                ref={carouselTrackRef}
                onScroll={handleCarouselScroll}
                className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth"
              >
                {carouselItems.map((att) => (
                  <CarouselSlide
                    key={att.id}
                    attachment={att}
                    isMulti={true}
                    onOpenLightbox={onOpenLightbox}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Below Carousel: Stacked Web Link / Document / Audio Cards */}
      {stackedCardItems.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {stackedCardItems.map((att) => (
            <StackedCardRenderer key={att.id} attachment={att} />
          ))}
        </div>
      )}
    </article>
  );
};
