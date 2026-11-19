import type { CustomThemePreset, DesignSettings } from '../types';

export const DARK_THEME_IDS = new Set([
  'twilight-lagoon',
  'metro-eclipse-dark',
  'metro-ipod-electric',
  'y2k-phosphor-grid',
]);

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

export function getRgbLuminance(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function getHexLuminance(hex: string): number | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  return getRgbLuminance(rgb[0], rgb[1], rgb[2]);
}

export function mixHex(hexA: string, hexB: string, ratioB: number): string {
  const a = parseHexRgb(hexA);
  const b = parseHexRgb(hexB);
  if (!a || !b) return hexB;
  const t = Math.max(0, Math.min(1, ratioB));
  const r = Math.round(a[0] * (1 - t) + b[0] * t);
  const g = Math.round(a[1] * (1 - t) + b[1] * t);
  const bl = Math.round(a[2] * (1 - t) + b[2] * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function getThemeIsDark(
  design: DesignSettings,
  systemPrefersDark?: boolean
): boolean {
  if (design.theme === 'default') {
    if (typeof systemPrefersDark === 'boolean') return systemPrefersDark;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
  const custom = (design.customThemes || []).find((t) => t.id === design.theme);
  if (custom) {
    if (!custom.backdropImageUrl && !design.customBackdropUrl) {
      const lum = getHexLuminance(custom.canvasBg);
      if (lum !== null) return lum < 0.42;
    }
    return custom.isDark;
  }
  return DARK_THEME_IDS.has(design.theme);
}

export function getCustomThemeColors(theme: CustomThemePreset): {
  isDark: boolean;
  countdownInk: string;
  themeLink: string;
} {
  const lum = !theme.backdropImageUrl ? getHexLuminance(theme.canvasBg) : null;
  const isDark = lum !== null ? lum < 0.42 : theme.isDark;

  const countdownInk = isDark
    ? mixHex(theme.accentStart, '#ffffff', 0.82)
    : mixHex(theme.accentEnd, '#0f172a', 0.72);
  const themeLink = isDark
    ? mixHex(theme.accentStart, '#ffffff', 0.3)
    : theme.accentEnd;

  return { isDark, countdownInk, themeLink };
}

export async function sampleBackdropTopIsDark(
  imageUrl: string,
  overlayIsDark: boolean
): Promise<boolean | null> {
  if (typeof window === 'undefined' || !imageUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;

    const finish = (val: boolean | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const timer = window.setTimeout(() => finish(null), 2500);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const w = 24;
        const h = 10;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        const srcH = Math.max(1, Math.floor((img.naturalHeight || 100) * 0.28));
        ctx.drawImage(img, 0, 0, img.naturalWidth || 100, srcH, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let sumLum = 0;
        const pixels = w * h;
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          // Blend with the same linear-gradient wash applied in App.tsx wrapperStyle
          if (overlayIsDark) {
            const a = 0.52;
            r = r * (1 - a) + 4 * a;
            g = g * (1 - a) + 11 * a;
            b = b * (1 - a) + 20 * a;
          } else {
            const a = 0.34;
            r = r * (1 - a) + 255 * a;
            g = g * (1 - a) + 255 * a;
            b = b * (1 - a) + 255 * a;
          }
          sumLum += getRgbLuminance(r, g, b);
        }

        const avgLum = sumLum / pixels;
        finish(avgLum < 0.48);
      } catch {
        finish(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };

    img.src = imageUrl;
  });
}
