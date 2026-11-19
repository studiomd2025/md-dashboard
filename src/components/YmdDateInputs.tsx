import React, { useEffect, useRef, useState } from 'react';
import { Calendar, CalendarClock } from 'lucide-react';

/**
 * Formats canonical YYYY-MM-DD (or yyyy.m.d) to unpadded yyyy.m.d (e.g. 2026.3.5).
 */
export function formatIsoYmdToDot(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}.${Number(isoMatch[2])}.${Number(isoMatch[3])}`;
  }
  const dotMatch = trimmed.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (dotMatch) {
    return `${dotMatch[1]}.${Number(dotMatch[2])}.${Number(dotMatch[3])}`;
  }
  return trimmed;
}

/**
 * Parses user-entered yyyy.m.d (or yyyy-m-d / yyyy/m/d) back to canonical YYYY-MM-DD.
 */
export function parseDotYmdToIso(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;
}

/**
 * Formats YYYY-MM-DDTHH:mm to "yyyy.m.d h:mm AM/PM".
 */
export function formatWallClockToDotDateTime(wallClock: string): string {
  const trimmed = (wallClock || '').trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})$/);
  if (!m) return trimmed;
  const year = m[1];
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour24 = Number(m[4]);
  const min = m[5];
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${year}.${month}.${day} ${hour12}:${min} ${period}`;
}

/**
 * Parses "yyyy.m.d h:mm AM/PM" or "yyyy.m.d HH:mm" or "yyyy.m.d" into canonical YYYY-MM-DDTHH:mm.
 */
export function parseDotDateTimeToWallClock(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})$/);
  if (isoMatch) {
    const isoDate = parseDotYmdToIso(`${isoMatch[1]}.${isoMatch[2]}.${isoMatch[3]}`);
    if (!isoDate) return null;
    const h = Number(isoMatch[4]);
    const min = Number(isoMatch[5]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return `${isoDate}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  const fullMatch = trimmed.match(
    /^(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i
  );
  if (!fullMatch) return null;

  const isoDate = parseDotYmdToIso(fullMatch[1]);
  if (!isoDate) return null;

  if (!fullMatch[2]) {
    return `${isoDate}T00:00`;
  }

  let h = Number(fullMatch[2]);
  const min = Number(fullMatch[3]);
  const ampm = fullMatch[4]?.toUpperCase();
  if (min < 0 || min > 59) return null;

  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === 'AM') {
      h = h === 12 ? 0 : h;
    } else {
      h = h === 12 ? 12 : h + 12;
    }
  } else if (h < 0 || h > 23) {
    return null;
  }

  return `${isoDate}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function triggerNativePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
  } catch {
    // Fallback below if browser blocks showPicker()
  }
  el.focus();
  el.click();
}

interface YmdDateInputProps {
  value: string;
  onChange: (nextIsoDate: string) => void;
  id?: string;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
}

export const YmdDateInput: React.FC<YmdDateInputProps> = ({
  value,
  onChange,
  id,
  required = false,
  ariaLabel,
  placeholder = 'yyyy.m.d',
  className = '',
  inputClassName = '',
  iconClassName = '',
}) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => formatIsoYmdToDot(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatIsoYmdToDot(value));
    }
  }, [value, focused]);

  const pickerValue = parseDotYmdToIso(value) || '';

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        required={required}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            onChange('');
            return;
          }
          const parsed = parseDotYmdToIso(next);
          if (parsed) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (!text.trim()) {
            onChange('');
            setText('');
            return;
          }
          const parsed = parseDotYmdToIso(text);
          if (parsed) {
            onChange(parsed);
            setText(formatIsoYmdToDot(parsed));
          } else {
            setText(formatIsoYmdToDot(value));
          }
        }}
        className={`w-full pr-8 tabular-nums ${inputClassName}`}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={pickerValue}
        onChange={(e) => {
          const nextIso = e.target.value;
          onChange(nextIso);
          setText(formatIsoYmdToDot(nextIso));
        }}
        className="pointer-events-none absolute right-0 top-0 h-full w-8 opacity-0"
      />
      <button
        type="button"
        onClick={() => triggerNativePicker(pickerRef.current)}
        aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Open date picker'}
        title="Pick date"
        className={`absolute right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white cursor-pointer ${iconClassName}`}
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

interface YmdDateTimeInputProps {
  value: string;
  onChange: (nextWallClock: string) => void;
  id?: string;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export const YmdDateTimeInput: React.FC<YmdDateTimeInputProps> = ({
  value,
  onChange,
  id,
  required = false,
  ariaLabel,
  placeholder = 'yyyy.m.d --:-- --',
  className = '',
  inputClassName = '',
}) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => formatWallClockToDotDateTime(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatWallClockToDotDateTime(value));
    }
  }, [value, focused]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        id={id}
        type="text"
        required={required}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            onChange('');
            return;
          }
          const parsed = parseDotDateTimeToWallClock(next);
          if (parsed) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (!text.trim()) {
            onChange('');
            setText('');
            return;
          }
          const parsed = parseDotDateTimeToWallClock(text);
          if (parsed) {
            onChange(parsed);
            setText(formatWallClockToDotDateTime(parsed));
          } else {
            setText(formatWallClockToDotDateTime(value));
          }
        }}
        className={`w-full pr-9 tabular-nums ${inputClassName}`}
      />
      <input
        ref={pickerRef}
        type="datetime-local"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => {
          const nextVal = e.target.value;
          onChange(nextVal);
          setText(formatWallClockToDotDateTime(nextVal));
        }}
        className="pointer-events-none absolute right-0 top-0 h-full w-9 opacity-0"
      />
      <button
        type="button"
        onClick={() => triggerNativePicker(pickerRef.current)}
        aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Open date and time picker'}
        title="Pick date & time"
        className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white cursor-pointer"
      >
        <CalendarClock className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
