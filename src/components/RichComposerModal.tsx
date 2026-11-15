import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  CalendarClock,
  FileText,
  Film,
  Hash,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Music,
  Pin,
  Plus,
  Quote,
  Strikethrough,
  Trash2,
  Underline,
  Upload,
  X,
} from 'lucide-react';
import type { DiaryFont, MediaAttachment, Post } from '../types';
import {
  extractInlineHashtags,
  formatFileSize,
  getFontClass,
  normalizeTag,
  parsePlayableMediaUrl,
  sanitizeRichHtml,
} from '../lib/mediaUtils';
import { uploadMediaFile } from '../lib/cloudinaryUpload';

interface RichComposerModalProps {
  isOpen: boolean;
  editingPost: Post | null;
  existingTags: string[];
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    bodyHtml: string;
    font: DiaryFont;
    manualTags: string[];
    inlineTags: string[];
    attachments: MediaAttachment[];
    scheduledFor: string | null;
    pinnedUntil: string | null;
    isDraft?: boolean;
  }) => Promise<void>;
}

const TEXT_COLORS = [
  { label: 'Default', value: '#0f172a' },
  { label: 'Aero Cyan', value: '#0284c7' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Coral', value: '#e11d48' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Indigo', value: '#4f46e5' },
];

const FONT_OPTIONS: { id: DiaryFont; label: string }[] = [
  { id: 'sans', label: 'DM Sans (Clean)' },
  { id: 'serif', label: 'Fraunces (Editorial)' },
  { id: 'mono', label: 'JetBrains (Mono)' },
  { id: 'hand', label: 'Caveat (Journal)' },
];

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const RichComposerModal: React.FC<RichComposerModalProps> = ({
  isOpen,
  editingPost,
  existingTags,
  onClose,
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [font, setFont] = useState<DiaryFont>('sans');
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaTitleInput, setMediaTitleInput] = useState('');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [pinnedUntilLocal, setPinnedUntilLocal] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [inlineLinkUrl, setInlineLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingPost) {
      setTitle(editingPost.title || '');
      setBodyHtml(editingPost.bodyHtml || '');
      setFont(editingPost.font || 'sans');
      setManualTags(editingPost.manualTags || []);
      setAttachments(editingPost.attachments || []);
      setScheduledLocal(toLocalInputValue(editingPost.scheduledFor));
      setPinnedUntilLocal(toLocalInputValue(editingPost.pinnedUntil));
      if (editorRef.current) {
        editorRef.current.innerHTML = editingPost.bodyHtml || '';
      }
    } else {
      setTitle('');
      setBodyHtml('');
      setFont('sans');
      setManualTags([]);
      setAttachments([]);
      setScheduledLocal('');
      setPinnedUntilLocal('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
    setTagInput('');
    setMediaUrlInput('');
    setMediaTitleInput('');
    setErrorMsg('');
  }, [isOpen, editingPost]);

  const inlineTags = useMemo(
    () => extractInlineHashtags(title, bodyHtml),
    [title, bodyHtml]
  );

  if (!isOpen) return null;

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleApplyInlineLink = () => {
    const trimmed = inlineLinkUrl.trim();
    if (!trimmed) return;
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    execFormat('createLink', normalized);
    setInlineLinkUrl('');
    setShowLinkInput(false);
  };

  const addManualTag = (raw: string) => {
    const clean = normalizeTag(raw);
    if (!clean) return;
    if (!manualTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setManualTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (tagInput.trim()) addManualTag(tagInput);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadMediaFile(file);

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

        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type,
            url: uploaded.url,
            title: uploaded.fileName,
            mimeType: uploaded.mimeType,
            fileSize: uploaded.fileSize,
          },
        ]);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Could not upload one or more files. Please check file size and try again.';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAttachUrl = () => {
    const trimmed = mediaUrlInput.trim();
    if (!trimmed) return;
    const normalized = /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')
      ? trimmed
      : `https://${trimmed}`;

    const parsed = parsePlayableMediaUrl(normalized);
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: parsed.suggestedType,
        url: normalized,
        title: mediaTitleInput.trim() || parsed.defaultTitle,
        subtitle: parsed.kind ? 'Playable Inline Embed' : normalized,
        embedKind: parsed.kind || undefined,
        embedUrl: parsed.embedUrl || undefined,
      },
    ]);
    setMediaUrlInput('');
    setMediaTitleInput('');
  };

  const applyPinPresetDays = (days: number) => {
    const target = new Date(Date.now() + days * 86400 * 1000);
    setPinnedUntilLocal(toLocalInputValue(target.toISOString()));
  };

  const submitPost = async (saveAsDraft: boolean) => {
    const cleanedHtml = sanitizeRichHtml(editorRef.current?.innerHTML || bodyHtml);
    const hasText = cleanedHtml.replace(/<[^>]+>/g, '').trim().length > 0;
    if (!title.trim() && !hasText && attachments.length === 0) {
      setErrorMsg('Add a title, some rich text, or at least one attachment.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onSave({
        id: editingPost?.id,
        title: title.trim(),
        bodyHtml: cleanedHtml,
        font,
        manualTags,
        inlineTags,
        attachments,
        scheduledFor: scheduledLocal ? new Date(scheduledLocal).toISOString() : null,
        pinnedUntil: pinnedUntilLocal ? new Date(pinnedUntilLocal).toISOString() : null,
        isDraft: saveAsDraft,
      });
      onClose();
    } catch {
      setErrorMsg('Failed to save post.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPost(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="aero-glass flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/60">
          <h2
            id="composer-title"
            className="font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            {editingPost
              ? editingPost.isDraft
                ? 'Edit Draft'
                : 'Edit Post'
              : "What's on your mind? ✨"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Optional Post Title */}
          <div>
            <label
              htmlFor="post-title-input"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Title (optional)
            </label>
            <input
              id="post-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-base font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/80 dark:text-white"
            />
          </div>

          {/* Rich Text Formatting Toolbar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white/85 overflow-hidden dark:border-slate-700/70 dark:bg-slate-900/75">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => execFormat('bold')}
                title="Bold"
                aria-label="Bold"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('italic')}
                title="Italic"
                aria-label="Italic"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('underline')}
                title="Underline"
                aria-label="Underline"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Underline className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('strikeThrough')}
                title="Strikethrough"
                aria-label="Strikethrough"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Strikethrough className="h-4 w-4" />
              </button>

              <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

              <button
                type="button"
                onClick={() => execFormat('formatBlock', 'H2')}
                title="Section Heading"
                aria-label="Heading"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Heading2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('formatBlock', 'BLOCKQUOTE')}
                title="Blockquote"
                aria-label="Quote"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Quote className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('insertUnorderedList')}
                title="Bullet List"
                aria-label="Bullet List"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => execFormat('insertOrderedList')}
                title="Numbered List"
                aria-label="Numbered List"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowLinkInput((v) => !v)}
                title="Insert Hyperlink"
                aria-label="Insert Link"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Link2 className="h-4 w-4" />
              </button>

              <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-600" />

              {/* Text Color Picker */}
              <div className="flex items-center gap-1.5 px-1" aria-label="Text Color">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={`Text color: ${c.label}`}
                    onClick={() => execFormat('foreColor', c.value)}
                    style={{ backgroundColor: c.value }}
                    className="h-5 w-5 rounded-full border border-white shadow-sm transition-transform hover:scale-110 cursor-pointer"
                  />
                ))}
                <input
                  type="color"
                  title="Custom text color"
                  onChange={(e) => execFormat('foreColor', e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <label htmlFor="post-font-select" className="sr-only">
                  Entry Typeface
                </label>
                <select
                  id="post-font-select"
                  value={font}
                  onChange={(e) => setFont(e.target.value as DiaryFont)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showLinkInput && (
              <div className="flex items-center gap-2 border-b border-slate-200/80 bg-sky-50/70 px-3 py-2 dark:border-slate-700 dark:bg-sky-950/30">
                <input
                  type="url"
                  value={inlineLinkUrl}
                  onChange={(e) => setInlineLinkUrl(e.target.value)}
                  placeholder="https://example.com (select text first)"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleApplyInlineLink}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  Apply Link
                </button>
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setBodyHtml((e.target as HTMLDivElement).innerHTML)}
              data-placeholder="Write your diary entry, notes, quotes, or type #EventHashtag inline..."
              className={`diary-prose min-h-[160px] px-4 py-3.5 text-[15px] text-slate-800 focus:outline-none dark:text-slate-100 ${getFontClass(
                font
              )}`}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Hash className="h-3.5 w-3.5 text-sky-600" />
                Tags
              </span>
            </div>

            {inlineTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-slate-500">Detected inline:</span>
                {inlineTags.map((t) => (
                  <span key={t} className="font-semibold text-sky-700 dark:text-sky-300">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => addManualTag(tagInput)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Tag
              </button>
            </div>

            {manualTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {manualTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setManualTags((prev) => prev.filter((t) => t !== tag))
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-100/80 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-rose-100 hover:text-rose-800 dark:bg-sky-900/50 dark:text-sky-200 cursor-pointer"
                  >
                    #{tag}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {existingTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Your events:</span>
                {existingTags.slice(0, 10).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addManualTag(t)}
                    className="font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                  >
                    +#{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multimedia & Playable Embeds */}
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Multimedia & Playable Links (Images, GIFs, Video, Audio, Docs, YouTube)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md,.zip"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="Paste YouTube video/playlist, GIF, audio, or web link..."
                className="sm:col-span-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={mediaTitleInput}
                onChange={(e) => setMediaTitleInput(e.target.value)}
                placeholder="Link / file title (optional)"
                className="sm:col-span-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAttachUrl}
                className="sm:col-span-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Attach URL
              </button>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {att.type === 'image' || att.type === 'gif' ? (
                        <ImageIcon className="h-4 w-4 text-sky-600 shrink-0" />
                      ) : att.type === 'video' || att.type === 'embed' ? (
                        <Film className="h-4 w-4 text-sky-600 shrink-0" />
                      ) : att.type === 'audio' ? (
                        <Music className="h-4 w-4 text-sky-600 shrink-0" />
                      ) : att.type === 'document' ? (
                        <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                      ) : (
                        <Link2 className="h-4 w-4 text-sky-600 shrink-0" />
                      )}
                      <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {att.title || att.url}
                      </span>
                      <span className="uppercase text-[10px] font-mono text-slate-500 shrink-0">
                        {att.type}
                        {att.fileSize ? ` · ${formatFileSize(att.fileSize)}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                      }
                      aria-label="Remove attachment"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Native Scheduling & Limited-Time Pinning */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
              <label
                htmlFor="schedule-datetime"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
                Schedule Post
              </label>
              <input
                id="schedule-datetime"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {scheduledLocal && (
                <button
                  type="button"
                  onClick={() => setScheduledLocal('')}
                  className="mt-1.5 text-[11px] font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                >
                  Clear schedule (post immediately)
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
              <label
                htmlFor="pin-until-datetime"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <Pin className="h-3.5 w-3.5 text-sky-600" />
                Pin to Top Until (optional)
              </label>
              <input
                id="pin-until-datetime"
                type="datetime-local"
                value={pinnedUntilLocal}
                onChange={(e) => setPinnedUntilLocal(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => applyPinPresetDays(1)}
                  className="font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                >
                  +24h
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => applyPinPresetDays(7)}
                  className="font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                >
                  +7 days
                </button>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => applyPinPresetDays(30)}
                  className="font-medium text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                >
                  +30 days
                </button>
                {pinnedUntilLocal && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setPinnedUntilLocal('')}
                      className="font-medium text-rose-600 hover:underline cursor-pointer"
                    >
                      Unpin
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200/70 pt-4 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || isUploading}
              onClick={() => submitPost(true)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="aero-button-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSaving
                ? 'Saving...'
                : scheduledLocal
                ? 'Schedule'
                : editingPost && !editingPost.isDraft
                ? 'Save Changes'
                : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
