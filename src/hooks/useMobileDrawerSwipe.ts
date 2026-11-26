import { useEffect, useRef, useState } from 'react';

interface UseMobileDrawerSwipeOptions {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  drawerWidthPx?: number;
  enabled?: boolean;
}

interface UseMobileDrawerSwipeResult {
  isDraggingDrawer: boolean;
  dragOffsetPx: number | null;
  backdropOpacity: number | null;
}

function isExcludedSwipeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  if (
    target.closest(
      'iframe, video, audio, input, textarea, select, [role="slider"], [data-no-drawer-swipe="true"], .no-drawer-swipe'
    )
  ) {
    return true;
  }

  let el: Element | null = target;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowX = style.overflowX;
    if (
      (overflowX === 'auto' || overflowX === 'scroll') &&
      el.scrollWidth > el.clientWidth + 2
    ) {
      return true;
    }
    el = el.parentElement;
  }

  return false;
}

export function useMobileDrawerSwipe({
  isOpen,
  onOpen,
  onClose,
  drawerWidthPx = 340,
  enabled = true,
}: UseMobileDrawerSwipeOptions): UseMobileDrawerSwipeResult {
  const [isDraggingDrawer, setIsDraggingDrawer] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState<number | null>(null);
  const [backdropOpacity, setBackdropOpacity] = useState<number | null>(null);

  const stateRef = useRef({
    isOpen,
    onOpen,
    onClose,
    drawerWidthPx,
  });
  stateRef.current = { isOpen, onOpen, onClose, drawerWidthPx };

  const rafRef = useRef<number | null>(null);

  const gestureRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startTime: number;
    lock: 'none' | 'horizontal' | 'vertical';
    lastDx: number;
    wasOpenAtStart: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    lock: 'none',
    lastDx: 0,
    wasOpenAtStart: false,
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const resetVisualDrag = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      gestureRef.current.active = false;
      gestureRef.current.lock = 'none';
      setIsDraggingDrawer(false);
      setDragOffsetPx(null);
      setBackdropOpacity(null);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 1024) return;
      if (e.touches.length !== 1) {
        resetVisualDrag();
        return;
      }

      const touch = e.touches[0];
      const { isOpen: currentlyOpen } = stateRef.current;

      // STRICT LEFT EDGE ZONE: When drawer is closed, swipe MUST start within 24px of left edge
      if (!currentlyOpen && touch.clientX > 24) {
        gestureRef.current.active = false;
        return;
      }

      if (isExcludedSwipeTarget(e.target)) {
        gestureRef.current.active = false;
        return;
      }

      gestureRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        lock: 'none',
        lastDx: 0,
        wasOpenAtStart: currentlyOpen,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.active || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;
      g.lastDx = dx;

      if (g.lock === 'vertical') return;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (g.lock === 'none') {
        if (Math.hypot(dx, dy) < 10) return;

        if (absDy * 1.25 >= absDx) {
          g.lock = 'vertical';
          g.active = false;
          return;
        }

        if (!g.wasOpenAtStart) {
          if (g.startX > 24 || dx <= 0 || dx < 12 || absDx <= absDy * 1.5) {
            if (dx < -8) {
              g.lock = 'vertical';
              g.active = false;
            }
            return;
          }
        } else {
          if (dx >= 0 || absDx <= absDy * 1.3) {
            if (dx > 10) {
              g.lock = 'vertical';
              g.active = false;
            }
            return;
          }
        }

        g.lock = 'horizontal';
        setIsDraggingDrawer(true);
      }

      if (g.lock === 'horizontal') {
        const width = Math.min(stateRef.current.drawerWidthPx, window.innerWidth * 0.86);
        let clamped: number;
        let progress: number;

        if (!g.wasOpenAtStart) {
          clamped = Math.max(-width, Math.min(0, -width + dx));
          progress = Math.max(0, Math.min(1, 1 + clamped / width));
        } else {
          clamped = Math.max(-width, Math.min(0, dx));
          progress = Math.max(0, Math.min(1, 1 + clamped / width));
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setDragOffsetPx(clamped);
          setBackdropOpacity(progress);
        });
      }
    };

    const onTouchEnd = () => {
      const g = gestureRef.current;
      if (!g.active || g.lock !== 'horizontal') {
        g.active = false;
        g.lock = 'none';
        return;
      }

      const elapsed = Math.max(1, performance.now() - g.startTime);
      const velocityX = g.lastDx / elapsed; // px per ms
      const width = Math.min(stateRef.current.drawerWidthPx, window.innerWidth * 0.86);

      if (!g.wasOpenAtStart) {
        const threshold = Math.max(44, width * 0.25);
        if (g.lastDx >= threshold || velocityX > 0.35) {
          stateRef.current.onOpen();
        }
      } else {
        const closeThreshold = Math.max(44, width * 0.25);
        if (g.lastDx <= -closeThreshold || velocityX < -0.35) {
          stateRef.current.onClose();
        }
      }

      resetVisualDrag();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', resetVisualDrag, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', resetVisualDrag);
    };
  }, [enabled]);

  return {
    isDraggingDrawer,
    dragOffsetPx,
    backdropOpacity,
  };
}
