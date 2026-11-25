import type { CustomThemePreset, DesignSettings } from '../types';

export const DARK_THEME_IDS = new Set([
  'twilight-lagoon',
  'metro-eclipse-dark',
  'metro-ipod-electric',
  'y2k-phosphor-grid',
]);

/**
 * Editable defaults for every preloaded built-in theme EXCEPT `'default'` (System Default),
 * which must remain locked and non-editable.
 */
export const PRELOADED_THEME_DEFAULTS: Record<string, Omit<CustomThemePreset, 'id'>> = {
  'aero-daylight': {
    name: 'Frutiger Aero Daylight',
    isDark: false,
    canvasBg: '#eff8fd',
    surfaceStyle: 'aero-glass',
    accentStart: '#38bdf8',
    accentEnd: '#0284c7',
    backdropImageUrl: '/samples/aero-daylight.jpg',
  },
  'twilight-lagoon': {
    name: 'Twilight Lagoon',
    isDark: true,
    canvasBg: '#06131c',
    surfaceStyle: 'aero-glass',
    accentStart: '#38bdf8',
    accentEnd: '#0284c7',
    backdropImageUrl: '/samples/twilight-lagoon.jpg',
  },
  'metro-prism-light': {
    name: 'Frutiger Metro Daylight',
    isDark: false,
    canvasBg: '#f4fbff',
    surfaceStyle: 'aero-glass',
    accentStart: '#06b6d4',
    accentEnd: '#2563eb',
    backdropImageUrl: '/samples/metro-prism-light.jpg',
  },
  'metro-eclipse-dark': {
    name: 'Frutiger Metro Eclipse',
    isDark: true,
    canvasBg: '#050d17',
    surfaceStyle: 'aero-glass',
    accentStart: '#22d3ee',
    accentEnd: '#0284c7',
    backdropImageUrl: '/samples/metro-eclipse-dark.jpg',
  },
  'metro-ipod-pop': {
    name: 'Frutiger Metro Neon Pop',
    isDark: false,
    canvasBg: '#f7fff4',
    surfaceStyle: 'aero-glass',
    accentStart: '#f43f5e',
    accentEnd: '#db2777',
    backdropImageUrl: '/samples/metro-ipod-pop.jpg',
  },
  'metro-ipod-electric': {
    name: 'Frutiger Metro Electric Club',
    isDark: true,
    canvasBg: '#0b0719',
    surfaceStyle: 'aero-glass',
    accentStart: '#0891b2',
    accentEnd: '#db2777',
    backdropImageUrl: '/samples/metro-ipod-electric.jpg',
  },
  'meadow-mint': {
    name: 'Meadow Mint Breeze',
    isDark: false,
    canvasBg: '#f1fbf6',
    surfaceStyle: 'aero-glass',
    accentStart: '#34d399',
    accentEnd: '#059669',
    backdropImageUrl: '/samples/meadow-mint.jpg',
  },
  'sunset-glass': {
    name: 'Sunset Tangerine Glass',
    isDark: false,
    canvasBg: '#fff8f3',
    surfaceStyle: 'aero-glass',
    accentStart: '#fb923c',
    accentEnd: '#e11d48',
    backdropImageUrl: '/samples/sunset-glass.jpg',
  },
  'crystal-pearl': {
    name: 'Crystal Pearl Minimal',
    isDark: false,
    canvasBg: '#f8fafc',
    surfaceStyle: 'aero-glass',
    accentStart: '#475569',
    accentEnd: '#0f172a',
    backdropImageUrl: '/samples/crystal-pearl.jpg',
  },
  'y2k-chrome-cd': {
    name: 'Y2K Liquid Chrome CD',
    isDark: false,
    canvasBg: '#cbd5e1',
    surfaceStyle: 'aero-glass',
    accentStart: '#3b82f6',
    accentEnd: '#1d4ed8',
    backdropImageUrl: '/samples/y2k-chrome-cd.jpg',
  },
  'y2k-phosphor-grid': {
    name: 'Y2K Phosphor Cyber Grid',
    isDark: true,
    canvasBg: '#07110d',
    surfaceStyle: 'aero-glass',
    accentStart: '#84cc16',
    accentEnd: '#0d9488',
    backdropImageUrl: '/samples/y2k-phosphor-grid.jpg',
  },
  'y2k-bubblegum-flip': {
    name: 'Y2K Candy Flip Hologram',
    isDark: false,
    canvasBg: '#f3e8ff',
    surfaceStyle: 'aero-glass',
    accentStart: '#ec4899',
    accentEnd: '#7c3aed',
    backdropImageUrl: '/samples/y2k-bubblegum-flip.jpg',
  },
  'y2k-arcade-peach': {
    name: 'Y2K Dreamcast Tangerine',
    isDark: false,
    canvasBg: '#faf2e4',
    surfaceStyle: 'aero-glass',
    accentStart: '#f97316',
    accentEnd: '#0891b2',
    backdropImageUrl: '/samples/y2k-arcade-peach.jpg',
  },
};

export const PRELOADED_EDITABLE_THEME_IDS: ReadonlySet<string> = new Set(
  Object.keys(PRELOADED_THEME_DEFAULTS)
);

export function resolvePreloadedThemePreset(
  presetId: string,
  customThemes?: CustomThemePreset[]
): CustomThemePreset | null {
  if (presetId === 'default') return null;
  const base = PRELOADED_THEME_DEFAULTS[presetId];
  if (!base) return null;
  const override = (customThemes || []).find((t) => t.id === presetId);
  return override || { id: presetId, ...base };
}

export function getCustomOnlyThemes(
  customThemes?: CustomThemePreset[]
): CustomThemePreset[] {
  return (customThemes || []).filter(
    (t) => t && t.id !== 'default' && !PRELOADED_EDITABLE_THEME_IDS.has(t.id)
  );
}

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
