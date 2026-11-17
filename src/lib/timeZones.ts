export const DEFAULT_TIME_ZONE = 'MDT' as const;
export const DEFAULT_TIME_ZONE_OFFSET_MINUTES = 8 * 60; // GMT+8 (My Diaries Time)

export interface TimeZoneOption {
  id: string;
  label: string;
  abbr: string;
  offsetMinutes: number;
}

const FALLBACK_IANA_ZONES = [
  'UTC',
  'Pacific/Midway',
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Atlantic/Reykjavik',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Europe/Athens',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Tehran',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Ho_Chi_Minh',
  'Asia/Singapore',
  'Asia/Manila',
  'Asia/Kuala_Lumpur',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Fiji',
];

const KNOWN_STANDARD_ABBR: Record<string, { standard: string; daylight?: string }> = {
  UTC: { standard: 'UTC' },
  'Etc/UTC': { standard: 'UTC' },
  'Etc/GMT': { standard: 'GMT' },
  'America/New_York': { standard: 'EST', daylight: 'EDT' },
  'America/Toronto': { standard: 'EST', daylight: 'EDT' },
  'America/Detroit': { standard: 'EST', daylight: 'EDT' },
  'America/Chicago': { standard: 'CST', daylight: 'CDT' },
  'America/Mexico_City': { standard: 'CST', daylight: 'CDT' },
  'America/Winnipeg': { standard: 'CST', daylight: 'CDT' },
  'America/Denver': { standard: 'MST', daylight: 'MDT' },
  'America/Phoenix': { standard: 'MST' },
  'America/Los_Angeles': { standard: 'PST', daylight: 'PDT' },
  'America/Vancouver': { standard: 'PST', daylight: 'PDT' },
  'America/Anchorage': { standard: 'AKST', daylight: 'AKDT' },
  'Pacific/Honolulu': { standard: 'HST' },
  'America/Halifax': { standard: 'AST', daylight: 'ADT' },
  'America/Sao_Paulo': { standard: 'BRT', daylight: 'BRST' },
  'America/Argentina/Buenos_Aires': { standard: 'ART' },
  'Europe/London': { standard: 'GMT', daylight: 'BST' },
  'Europe/Dublin': { standard: 'GMT', daylight: 'IST' },
  'Europe/Lisbon': { standard: 'WET', daylight: 'WEST' },
  'Europe/Paris': { standard: 'CET', daylight: 'CEST' },
  'Europe/Berlin': { standard: 'CET', daylight: 'CEST' },
  'Europe/Madrid': { standard: 'CET', daylight: 'CEST' },
  'Europe/Rome': { standard: 'CET', daylight: 'CEST' },
  'Europe/Amsterdam': { standard: 'CET', daylight: 'CEST' },
  'Europe/Brussels': { standard: 'CET', daylight: 'CEST' },
  'Europe/Zurich': { standard: 'CET', daylight: 'CEST' },
  'Europe/Vienna': { standard: 'CET', daylight: 'CEST' },
  'Europe/Warsaw': { standard: 'CET', daylight: 'CEST' },
  'Europe/Stockholm': { standard: 'CET', daylight: 'CEST' },
  'Europe/Athens': { standard: 'EET', daylight: 'EEST' },
  'Europe/Helsinki': { standard: 'EET', daylight: 'EEST' },
  'Europe/Bucharest': { standard: 'EET', daylight: 'EEST' },
  'Europe/Istanbul': { standard: 'TRT' },
  'Europe/Moscow': { standard: 'MSK' },
  'Africa/Cairo': { standard: 'EET', daylight: 'EEST' },
  'Africa/Johannesburg': { standard: 'SAST' },
  'Africa/Lagos': { standard: 'WAT' },
  'Africa/Nairobi': { standard: 'EAT' },
  'Asia/Dubai': { standard: 'GST' },
  'Asia/Riyadh': { standard: 'AST' },
  'Asia/Jerusalem': { standard: 'IST', daylight: 'IDT' },
  'Asia/Tehran': { standard: 'IRST', daylight: 'IRDT' },
  'Asia/Karachi': { standard: 'PKT' },
  'Asia/Kolkata': { standard: 'IST' },
  'Asia/Calcutta': { standard: 'IST' },
  'Asia/Kathmandu': { standard: 'NPT' },
  'Asia/Dhaka': { standard: 'BST' },
  'Asia/Yangon': { standard: 'MMT' },
  'Asia/Bangkok': { standard: 'ICT' },
  'Asia/Ho_Chi_Minh': { standard: 'ICT' },
  'Asia/Jakarta': { standard: 'WIB' },
  'Asia/Singapore': { standard: 'SGT' },
  'Asia/Manila': { standard: 'PHT' },
  'Asia/Kuala_Lumpur': { standard: 'MYT' },
  'Asia/Hong_Kong': { standard: 'HKT' },
  'Asia/Taipei': { standard: 'CST' },
  'Asia/Shanghai': { standard: 'CST' },
  'Asia/Seoul': { standard: 'KST' },
  'Asia/Tokyo': { standard: 'JST' },
  'Australia/Perth': { standard: 'AWST' },
  'Australia/Darwin': { standard: 'ACST' },
  'Australia/Adelaide': { standard: 'ACST', daylight: 'ACDT' },
  'Australia/Brisbane': { standard: 'AEST' },
  'Australia/Sydney': { standard: 'AEST', daylight: 'AEDT' },
  'Australia/Melbourne': { standard: 'AEST', daylight: 'AEDT' },
  'Pacific/Auckland': { standard: 'NZST', daylight: 'NZDT' },
  'Pacific/Fiji': { standard: 'FJT', daylight: 'FJST' },
};

export function resolveEffectiveTimeZone(tz?: string | null): string {
  const trimmed = (tz || '').trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_TIME_ZONE;
}

export interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour24: number;
  minute: number;
  second: number;
}

function getFixedMdtParts(utcMs: number): WallClockParts {
  const shifted = new Date(utcMs + DEFAULT_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour24: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function getIanaParts(utcMs: number, ianaZone: string): WallClockParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(new Date(utcMs));
    const lookup: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        lookup[p.type] = Number(p.value);
      }
    }
    return {
      year: lookup.year || 1970,
      month: lookup.month || 1,
      day: lookup.day || 1,
      hour24: (lookup.hour ?? 0) % 24,
      minute: lookup.minute ?? 0,
      second: lookup.second ?? 0,
    };
  } catch {
    return getFixedMdtParts(utcMs);
  }
}

export function getWallClockParts(
  input: string | Date | number,
  tzId?: string | null
): WallClockParts {
  const ms =
    typeof input === 'number'
      ? input
      : input instanceof Date
      ? input.getTime()
      : new Date(input).getTime();
  const safeMs = Number.isNaN(ms) ? Date.now() : ms;
  const effective = resolveEffectiveTimeZone(tzId);
  if (effective === DEFAULT_TIME_ZONE) {
    return getFixedMdtParts(safeMs);
  }
  return getIanaParts(safeMs, effective);
}

export function getTimeZoneOffsetMinutes(
  tzId?: string | null,
  atDate: Date = new Date()
): number {
  const effective = resolveEffectiveTimeZone(tzId);
  if (effective === DEFAULT_TIME_ZONE) {
    return DEFAULT_TIME_ZONE_OFFSET_MINUTES;
  }
  const utcMs = atDate.getTime();
  const p = getIanaParts(utcMs, effective);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour24, p.minute, p.second);
  const utcRounded = Date.UTC(
    atDate.getUTCFullYear(),
    atDate.getUTCMonth(),
    atDate.getUTCDate(),
    atDate.getUTCHours(),
    atDate.getUTCMinutes(),
    atDate.getUTCSeconds()
  );
  return Math.round((asUtc - utcRounded) / 60000);
}

export function formatGmtOffsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'GMT+0';
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

function isZoneInDst(ianaZone: string, atDate: Date): boolean {
  const year = atDate.getUTCFullYear();
  const janOffset = getTimeZoneOffsetMinutes(ianaZone, new Date(Date.UTC(year, 0, 1, 12, 0)));
  const julOffset = getTimeZoneOffsetMinutes(ianaZone, new Date(Date.UTC(year, 6, 1, 12, 0)));
  if (janOffset === julOffset) return false;
  const currentOffset = getTimeZoneOffsetMinutes(ianaZone, atDate);
  return currentOffset === Math.max(janOffset, julOffset);
}

export function getTimeZoneAbbr(
  tzId?: string | null,
  atDateInput: Date | number | string = new Date()
): string {
  const effective = resolveEffectiveTimeZone(tzId);
  if (effective === DEFAULT_TIME_ZONE) {
    return 'MDT';
  }
  const dateObj =
    atDateInput instanceof Date
      ? atDateInput
      : new Date(atDateInput);
  const safeDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;

  try {
    const intlShort = new Intl.DateTimeFormat('en-US', {
      timeZone: effective,
      timeZoneName: 'short',
    })
      .formatToParts(safeDate)
      .find((p) => p.type === 'timeZoneName')?.value;

    if (intlShort && /^[A-Z]{2,5}$/.test(intlShort)) {
      return intlShort;
    }
  } catch {
    // ignore and fallback
  }

  const mapped = KNOWN_STANDARD_ABBR[effective];
  if (mapped) {
    if (mapped.daylight && isZoneInDst(effective, safeDate)) {
      return mapped.daylight;
    }
    return mapped.standard;
  }

  // Try matching by last city/region token or return GMT offset
  const offset = getTimeZoneOffsetMinutes(effective, safeDate);
  return formatGmtOffsetLabel(offset);
}

export function wallClockToIso(
  localDateTime: string,
  tzId?: string | null
): string {
  const trimmed = localDateTime.trim();
  if (!trimmed) return '';
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);

  const effective = resolveEffectiveTimeZone(tzId);
  if (effective === DEFAULT_TIME_ZONE) {
    const utcMs =
      Date.UTC(year, month - 1, day, hour, minute, second) -
      DEFAULT_TIME_ZONE_OFFSET_MINUTES * 60 * 1000;
    return new Date(utcMs).toISOString();
  }

  const targetUtcBasis = Date.UTC(year, month - 1, day, hour, minute, second);
  // Two-pass iterative offset resolution for exact DST boundary handling
  const pass1Parts = getIanaParts(targetUtcBasis, effective);
  const pass1AsUtc = Date.UTC(
    pass1Parts.year,
    pass1Parts.month - 1,
    pass1Parts.day,
    pass1Parts.hour24,
    pass1Parts.minute,
    pass1Parts.second
  );
  let refinedMs = targetUtcBasis - (pass1AsUtc - targetUtcBasis);

  const pass2Parts = getIanaParts(refinedMs, effective);
  const pass2AsUtc = Date.UTC(
    pass2Parts.year,
    pass2Parts.month - 1,
    pass2Parts.day,
    pass2Parts.hour24,
    pass2Parts.minute,
    pass2Parts.second
  );
  refinedMs = targetUtcBasis - (pass2AsUtc - refinedMs);

  return new Date(refinedMs).toISOString();
}

export function isoToWallClockInput(
  iso: string | null | undefined,
  tzId?: string | null
): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = getWallClockParts(d, tzId);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour24)}:${pad(
    p.minute
  )}`;
}

export function dateFilterBoundToMs(
  dateStr: string,
  boundary: 'start' | 'end',
  tzId?: string | null
): number | null {
  if (!dateStr) return null;
  const iso = wallClockToIso(
    `${dateStr}T${boundary === 'start' ? '00:00:00' : '23:59:59'}`,
    tzId
  );
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return boundary === 'end' ? ms + 999 : ms;
}

export function getHourInTimeZone(
  date: Date,
  tzId?: string | null
): number {
  return getWallClockParts(date, tzId).hour24;
}

let cachedOptions: TimeZoneOption[] | null = null;

export function getAllTimeZoneOptions(): TimeZoneOption[] {
  if (cachedOptions) return cachedOptions;

  const now = new Date();
  const intlAny = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  const rawZones =
    typeof intlAny.supportedValuesOf === 'function'
      ? intlAny.supportedValuesOf('timeZone')
      : FALLBACK_IANA_ZONES;

  const extraZones = [
    'UTC',
    'Etc/GMT+12',
    'Etc/GMT+11',
    'Etc/GMT+10',
    'Etc/GMT+9',
    'Etc/GMT+8',
    'Etc/GMT+7',
    'Etc/GMT+6',
    'Etc/GMT+5',
    'Etc/GMT+4',
    'Etc/GMT+3',
    'Etc/GMT+2',
    'Etc/GMT+1',
    'Etc/GMT-1',
    'Etc/GMT-2',
    'Etc/GMT-3',
    'Etc/GMT-4',
    'Etc/GMT-5',
    'Etc/GMT-6',
    'Etc/GMT-7',
    'Etc/GMT-8',
    'Etc/GMT-9',
    'Etc/GMT-10',
    'Etc/GMT-11',
    'Etc/GMT-12',
    'Etc/GMT-13',
    'Etc/GMT-14',
  ];

  const uniqueZones = Array.from(new Set([...rawZones, ...extraZones]));
  const worldOptions: TimeZoneOption[] = uniqueZones.map((zoneId) => {
    const offsetMinutes = getTimeZoneOffsetMinutes(zoneId, now);
    const gmtLabel = formatGmtOffsetLabel(offsetMinutes);
    const abbr = getTimeZoneAbbr(zoneId, now);
    const cleanName = zoneId.replace(/_/g, ' ');
    const abbrSuffix =
      abbr && abbr !== gmtLabel && !abbr.startsWith('GMT') ? ` · ${abbr}` : '';
    return {
      id: zoneId,
      label: `(${gmtLabel}) ${cleanName}${abbrSuffix}`,
      abbr,
      offsetMinutes,
    };
  });

  worldOptions.sort((a, b) => {
    if (a.offsetMinutes !== b.offsetMinutes) {
      return a.offsetMinutes - b.offsetMinutes;
    }
    return a.id.localeCompare(b.id);
  });

  cachedOptions = [
    {
      id: DEFAULT_TIME_ZONE,
      label: 'MDT — My Diaries Time (GMT+8) [Default]',
      abbr: 'MDT',
      offsetMinutes: DEFAULT_TIME_ZONE_OFFSET_MINUTES,
    },
    ...worldOptions,
  ];
  return cachedOptions;
}
