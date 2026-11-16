import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

export function shouldReduceAnimations(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('safemode') === '1' ||
      params.get('animations') === 'off' ||
      params.get('reduced-motion') === '1'
    ) {
      return true;
    }
  } catch {
    // ignore URL parse issues
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return true;
  }

  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    deviceMemory?: number;
  };

  if (nav.connection?.saveData) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) {
    return true;
  }
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 1) {
    return true;
  }

  return false;
}

/**
 * Keeps `html.reduce-animations` synchronized with OS / browser performance
 * and safe-mode signals. Under normal conditions, animations stay enabled by default.
 */
export function useSystemAnimationGuard(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const root = document.documentElement;
    const sync = () => {
      root.classList.toggle('reduce-animations', shouldReduceAnimations());
    };

    sync();

    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    mq?.addEventListener?.('change', sync);

    const conn = (navigator as Navigator & { connection?: NetworkInformationLike })
      .connection;
    conn?.addEventListener?.('change', sync);

    return () => {
      mq?.removeEventListener?.('change', sync);
      conn?.removeEventListener?.('change', sync);
    };
  }, []);
}

/**
 * Smooth FLIP animation hook for panels/tiles whose DOM containers reorder
 * (e.g., Timeline Stack <-> Grid or Play Event List <-> Tiles).
 */
export function useFlipLayout(layoutKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const pendingFlipRef = useRef(false);

  const captureFlip = useCallback(() => {
    if (shouldReduceAnimations() || !containerRef.current) {
      prevRectsRef.current.clear();
      pendingFlipRef.current = false;
      return;
    }

    const map = new Map<string, DOMRect>();
    const nodes = containerRef.current.querySelectorAll<HTMLElement>('[data-flip-id]');
    nodes.forEach((el) => {
      const id = el.dataset.flipId;
      if (id) {
        map.set(id, el.getBoundingClientRect());
      }
    });
    prevRectsRef.current = map;
    pendingFlipRef.current = map.size > 0;
  }, []);

  useLayoutEffect(() => {
    if (!pendingFlipRef.current || !containerRef.current) return;
    pendingFlipRef.current = false;

    if (shouldReduceAnimations()) {
      prevRectsRef.current.clear();
      return;
    }

    const prevRects = prevRectsRef.current;
    const nodes = containerRef.current.querySelectorAll<HTMLElement>('[data-flip-id]');
    const maxViewportRange = (typeof window !== 'undefined' ? window.innerHeight : 900) * 2.2;

    nodes.forEach((el) => {
      const id = el.dataset.flipId;
      if (!id) return;

      el.getAnimations?.().forEach((anim) => anim.cancel());

      const first = prevRects.get(id);
      if (!first) return;

      const last = el.getBoundingClientRect();
      if (last.width === 0 || last.height === 0) return;

      // Skip animating far off-screen cards to keep large timelines smooth
      if (
        (first.bottom < -maxViewportRange || first.top > maxViewportRange) &&
        (last.bottom < -maxViewportRange || last.top > maxViewportRange)
      ) {
        return;
      }

      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const rawScaleX = first.width / last.width;
      const clampedScale = Math.max(0.68, Math.min(1.45, rawScaleX));

      if (
        Math.abs(dx) < 1 &&
        Math.abs(dy) < 1 &&
        Math.abs(clampedScale - 1) < 0.02
      ) {
        return;
      }

      if (typeof el.animate === 'function') {
        el.animate(
          [
            {
              transformOrigin: 'top left',
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${clampedScale})`,
              opacity: 0.85,
            },
            {
              transformOrigin: 'top left',
              transform: 'translate3d(0, 0, 0) scale(1)',
              opacity: 1,
            },
          ],
          {
            duration: 380,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'none',
          }
        );
      }
    });

    prevRectsRef.current.clear();
  }, [layoutKey]);

  return { containerRef, captureFlip };
}
