import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Gesture tracking refs
  const initialTouchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialTranslateRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);
  const isPinchingRef = useRef(false);

  // Reset transforms whenever opening a new image or closing
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsGesturing(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetZoom();
    }
  }, [isOpen, imageUrl, resetZoom]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate pan limits to keep image within view
  const clampTranslate = useCallback((x: number, y: number, currentScale: number) => {
    if (currentScale <= 1 || !containerRef.current || !imgRef.current) {
      return { x: 0, y: 0 };
    }
    const container = containerRef.current.getBoundingClientRect();
    const maxPanX = Math.max(0, (container.width * (currentScale - 1)) / 2);
    const maxPanY = Math.max(0, (container.height * (currentScale - 1)) / 2);

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, []);

  // 1. Two-finger pinch to zoom + 1-finger pan
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch started
      isPinchingRef.current = true;
      setIsGesturing(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const now = Date.now();
      // Double tap check
      if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY_MS) {
        lastTapTimeRef.current = 0;
        if (scale > 1.05) {
          resetZoom();
        } else {
          const newScale = 2.5;
          setScale(newScale);
          setTranslate({ x: 0, y: 0 });
        }
        return;
      }
      lastTapTimeRef.current = now;

      // Start drag if zoomed in
      if (scale > 1) {
        setIsGesturing(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        initialTranslateRef.current = { ...translate };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialTouchDistRef.current !== null) {
      // Pinch zoom in progress
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDistRef.current;
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, initialScaleRef.current * ratio)
      );
      setScale(nextScale);
      setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
    } else if (e.touches.length === 1 && dragStartRef.current && scale > 1 && !isPinchingRef.current) {
      // 1-finger panning in progress
      e.preventDefault();
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      const nextX = initialTranslateRef.current.x + deltaX;
      const nextY = initialTranslateRef.current.y + deltaY;
      setTranslate(clampTranslate(nextX, nextY, scale));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialTouchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      dragStartRef.current = null;
      isPinchingRef.current = false;
      setIsGesturing(false);

      // Snap back if scaled below 1
      if (scale <= 1.05) {
        resetZoom();
      } else {
        setTranslate((prev) => clampTranslate(prev.x, prev.y, scale));
      }
    }
  };

  // 2. Mouse / Trackpad Wheel Zoom (for desktop)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));
    setScale(nextScale);
    if (nextScale <= 1.05) {
      resetZoom();
    } else {
      setTranslate((prev) => clampTranslate(prev.x, prev.y, nextScale));
    }
  };

  // Manual zoom button helpers
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

  if (!isOpen || !imageUrl) return null;

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
      className="md-animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4 backdrop-blur-md select-none"
    >
      {/* Zoom / Action Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none"
      >
        {/* Image Title or Zoom Percentage */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm border border-slate-700/60 shadow-lg">
          <span className="truncate max-w-[200px] sm:max-w-xs">
            {imageTitle || 'Diary Image'}
          </span>
          <span className="text-sky-400 font-mono text-[11px]">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Toolbar Controls */}
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

      {/* Main image viewport with touch gesture handlers */}
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
        className="relative flex h-full w-full max-h-[92vh] max-w-5xl items-center justify-center overflow-hidden"
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt={imageTitle || 'Full resolution diary image'}
          referrerPolicy="no-referrer"
          draggable={false}
          style={{
            transform: `translate3d(${translate.x}px, ${translate.y}px, 0px) scale(${scale})`,
            transition: isGesturing ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
          className="max-h-[90vh] max-w-full w-auto h-auto object-contain select-none cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Touch hint for first time user */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-4 py-1 text-[11px] font-medium text-slate-300 backdrop-blur-sm sm:hidden">
        Pinch to zoom · Double tap to toggle
      </div>
    </div>
  );
};
