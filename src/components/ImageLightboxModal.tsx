import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Copy,
  Download,
  ExternalLink,
  Link2,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageTitle?: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_DELAY_MS = 300;

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  imageTitle,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const [showPressMenu, setShowPressMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Gesture & pointer tracking refs
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const initialTouchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialTranslateRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);
  const isPinchingRef = useRef(false);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsGesturing(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetZoom();
      setShowPressMenu(false);
      setMenuPos(null);
      setToastMsg('');
    }
  }, [isOpen, imageUrl, resetZoom]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPressMenu) {
          setShowPressMenu(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showPressMenu]);

  // Calculate pan limits across full viewport so no part of image gets trapped off-screen
  const clampTranslate = useCallback(
    (x: number, y: number, currentScale: number) => {
      if (currentScale <= 1 || !containerRef.current) {
        return { x: 0, y: 0 };
      }
      const rect = containerRef.current.getBoundingClientRect();
      const viewportW = rect.width || window.innerWidth;
      const viewportH = rect.height || window.innerHeight;

      const maxPanX = Math.max(0, (viewportW * (currentScale - 1)) / 2);
      const maxPanY = Math.max(0, (viewportH * (currentScale - 1)) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, y)),
      };
    },
    []
  );

  // Desktop Right-Click Context Menu
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowPressMenu(true);
  };

  // Unified Pointer Event Handlers for Desktop Web & Mobile/Tablet Touch
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore secondary mouse clicks (right click handled by onContextMenu)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    if (e.pointerType === 'touch') {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pointerList = Array.from(activePointersRef.current.values());

    // Press-and-hold timer for touch pointer (~450ms)
    if (e.pointerType === 'touch' && pointerList.length === 1) {
      touchStartPosRef.current = { x: e.clientX, y: e.clientY };
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      pressTimerRef.current = setTimeout(() => {
        setMenuPos({ x: e.clientX, y: e.clientY });
        setShowPressMenu(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {
            // ignore
          }
        }
      }, 450);
    } else {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }

    // Double-tap zoom toggle
    const now = Date.now();
    if (
      pointerList.length === 1 &&
      now - lastTapTimeRef.current < DOUBLE_TAP_DELAY_MS
    ) {
      lastTapTimeRef.current = 0;
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      if (scale > 1.05) {
        resetZoom();
      } else {
        const newScale = 2.5;
        setScale(newScale);
        setTranslate({ x: 0, y: 0 });
      }
      return;
    }
    if (pointerList.length === 1) {
      lastTapTimeRef.current = now;
    }

    // Pinch zoom setup (2 pointers)
    if (pointerList.length === 2) {
      isPinchingRef.current = true;
      setIsGesturing(true);
      const dist = Math.hypot(
        pointerList[0].x - pointerList[1].x,
        pointerList[0].y - pointerList[1].y
      );
      initialTouchDistRef.current = dist;
      initialScaleRef.current = scale;
      return;
    }

    // Single pointer drag setup
    if (pointerList.length === 1) {
      setIsGesturing(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      initialTranslateRef.current = { ...translate };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pointerList = Array.from(activePointersRef.current.values());

    // Cancel press-and-hold if dragged more than 8px
    if (pressTimerRef.current && touchStartPosRef.current) {
      const dist = Math.hypot(
        e.clientX - touchStartPosRef.current.x,
        e.clientY - touchStartPosRef.current.y
      );
      if (dist > 8) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }

    // 2-pointer pinch zoom
    if (pointerList.length === 2 && initialTouchDistRef.current !== null) {
      const dist = Math.hypot(
        pointerList[0].x - pointerList[1].x,
        pointerList[0].y - pointerList[1].y
      );
      const ratio = dist / initialTouchDistRef.current;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, initialScaleRef.current * ratio)
      );
      setScale(nextScale);
      setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
      return;
    }

    // 1-pointer drag-to-pan
    if (
      pointerList.length === 1 &&
      dragStartRef.current &&
      !isPinchingRef.current
    ) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const nextX = initialTranslateRef.current.x + deltaX;
      const nextY = initialTranslateRef.current.y + deltaY;
      setTranslate(clampTranslate(nextX, nextY, scale));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    activePointersRef.current.delete(e.pointerId);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    const pointerList = Array.from(activePointersRef.current.values());
    if (pointerList.length < 2) {
      initialTouchDistRef.current = null;
    }
    if (pointerList.length === 0) {
      dragStartRef.current = null;
      isPinchingRef.current = false;
      setIsGesturing(false);

      if (scale <= 1.05) {
        resetZoom();
      } else {
        setTranslate((prev) => clampTranslate(prev.x, prev.y, scale));
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerUp(e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, scale * zoomFactor)
    );
    setScale(nextScale);
    if (nextScale <= 1.05) {
      resetZoom();
    } else {
      setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
    }
  };

  const zoomIn = () => {
    const nextScale = Math.min(MAX_SCALE, scale + 0.5);
    setScale(nextScale);
    setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
  };

  const zoomOut = () => {
    const nextScale = Math.max(MIN_SCALE, scale - 0.5);
    setScale(nextScale);
    if (nextScale <= 1.05) {
      resetZoom();
    } else {
      setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Action Menu Handlers
  const handleSaveImage = async () => {
    setShowPressMenu(false);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (imageTitle || 'photo').replace(/[^a-z0-9_-]/gi, '_') + '.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  const handleShareImage = async () => {
    setShowPressMenu(false);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: imageTitle || 'Shared Photo',
          url: imageUrl,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(imageUrl);
        showToast('Image URL copied to clipboard');
      } catch {
        // fallback
      }
    }
  };

  const handleCopyImage = async () => {
    setShowPressMenu(false);
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof window.ClipboardItem !== 'undefined'
      ) {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const type = blob.type.startsWith('image/') ? blob.type : 'image/png';
        await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
        showToast('Image copied to clipboard');
      } else {
        await navigator.clipboard.writeText(imageUrl);
        showToast('Image URL copied to clipboard');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(imageUrl);
        showToast('Image URL copied to clipboard');
      } catch {
        showToast('Could not copy image');
      }
    }
  };

  const handleCopyLink = async () => {
    setShowPressMenu(false);
    try {
      await navigator.clipboard.writeText(imageUrl);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Could not copy link');
    }
  };

  const handleOpenOriginal = () => {
    setShowPressMenu(false);
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
  };

  const handleResetFromMenu = () => {
    setShowPressMenu(false);
    resetZoom();
  };

  if (!isOpen || !imageUrl) return null;

  const isDataUrl = imageUrl.startsWith('data:');
  const isMobileViewport =
    typeof window !== 'undefined' && window.innerWidth < 640;

  // Positioning logic:
  // Mobile (<640px): Centered on screen
  // Tablet (>=640px touch) & Desktop (Right-click): Anchored at touch/click position
  let anchoredStyle: React.CSSProperties | undefined = undefined;
  if (!isMobileViewport && menuPos) {
    const menuW = 270;
    const menuH = 270;
    const posX = Math.min(
      Math.max(16, menuPos.x - menuW / 2),
      window.innerWidth - menuW - 16
    );
    const posY = Math.min(
      Math.max(16, menuPos.y - 12),
      window.innerHeight - menuH - 16
    );
    anchoredStyle = {
      position: 'absolute',
      left: `${posX}px`,
      top: `${posY}px`,
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (scale > 1.05) {
          resetZoom();
        } else {
          onClose();
        }
      }}
      className="md-animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-0 backdrop-blur-md select-none overflow-hidden"
    >
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-sky-300 backdrop-blur-md border border-slate-700 shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Top Action & Zoom Controls Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm border border-slate-700/60 shadow-lg">
          <span className="truncate max-w-[180px] sm:max-w-xs">
            {imageTitle || 'Diary Image'}
          </span>
          <span className="text-sky-400 font-mono text-[11px]">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-900/80 p-1 backdrop-blur-sm border border-slate-700/60 shadow-lg">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            title="Zoom out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition"
          >
            <Minus className="h-4 w-4" />
          </button>

          {scale > 1.05 ? (
            <button
              type="button"
              onClick={resetZoom}
              aria-label="Reset zoom"
              title="Reset zoom"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sky-400 hover:bg-white/10 active:scale-95 cursor-pointer transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={zoomIn}
              disabled={scale >= MAX_SCALE}
              aria-label="Zoom in"
              title="Zoom in"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            title="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 cursor-pointer transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Full Viewport Drag & Zoom Stage Container (overflow-visible inner transform) */}
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
        className="fixed inset-0 z-10 flex h-full w-full items-center justify-center overflow-visible select-none cursor-grab active:cursor-grabbing"
      >
        <div
          style={{
            transform: `translate3d(${translate.x}px, ${translate.y}px, 0px) scale(${scale})`,
            transition: isGesturing
              ? 'none'
              : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
          className="relative flex items-center justify-center max-w-full max-h-full overflow-visible"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={imageTitle || 'Full resolution diary image'}
            referrerPolicy="no-referrer"
            draggable={false}
            className="max-h-[100vh] max-w-[100vw] w-auto h-auto object-contain select-none pointer-events-none"
          />
        </div>
      </div>

      {/* Photo Action Menu Modal (Centered on Mobile, Anchored on Tablet/Desktop) */}
      {showPressMenu && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowPressMenu(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm md-animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={anchoredStyle}
            className="w-full max-w-xs rounded-3xl border border-slate-700/80 bg-slate-900 p-4 text-white shadow-2xl space-y-2"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 px-1">
              <span className="font-display text-xs font-bold text-slate-300">
                Photo Actions
              </span>
              <button
                type="button"
                onClick={() => setShowPressMenu(false)}
                className="rounded-full p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={handleSaveImage}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer"
              >
                <Download className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Save Image</span>
              </button>

              <button
                type="button"
                onClick={handleShareImage}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer"
              >
                <Share2 className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Share Image</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer"
              >
                <Copy className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Copy Image</span>
              </button>

              {!isDataUrl && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer"
                >
                  <Link2 className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Copy Link</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenOriginal}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Open Original in New Tab</span>
              </button>

              <button
                type="button"
                onClick={handleResetFromMenu}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-amber-300 hover:bg-slate-800/80 active:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span>Reset Zoom & Position</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
