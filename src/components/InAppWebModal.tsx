import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Loader2, X } from 'lucide-react';

export interface InAppWebModalProps {
  isOpen: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export const InAppWebModal: React.FC<InAppWebModalProps> = ({
  isOpen,
  url,
  title,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, url]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col h-dvh w-screen rounded-none bg-white dark:bg-slate-900 overflow-hidden pt-[env(safe-area-inset-top,0px)] animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <h3 className="font-display text-sm font-bold truncate text-slate-900 dark:text-white">
            {title || 'Web View'}
          </h3>
          <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400 truncate max-w-xs">
            {url}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in external browser"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-300 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            title="Close reader"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Body Container */}
      <div className="relative flex-1 w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-sky-600 dark:text-sky-400" />
            <span className="font-display text-xs font-semibold text-slate-600 dark:text-slate-300">
              Loading {title}…
            </span>
          </div>
        )}

        <iframe
          src={url}
          title={title}
          onLoad={() => setIsLoading(false)}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; clipboard-write; encrypted-media"
        />
      </div>
    </div>,
    document.body
  );
};
