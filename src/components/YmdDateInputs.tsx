import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';

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

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function getNowWallClock(): string {
  const now = new Date();
  return `${getTodayIso()}T${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

function parseIsoParts(isoDate: string): { year: number; month: number; day: number } | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function toIsoYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0'
  )}`;
}

interface PopoverCoords {
  top: number;
  left: number;
  placeAbove: boolean;
}

function computePopoverCoords(
  anchorEl: HTMLElement | null,
  popoverWidth: number,
  estimatedHeight: number
): PopoverCoords {
  if (!anchorEl || typeof window === 'undefined') {
    return { top: 80, left: 16, placeAbove: false };
  }
  const rect = anchorEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeAbove = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;
  const rawTop = placeAbove ? Math.round(rect.top - 6) : Math.round(rect.bottom + 6);
  const rawLeft = Math.round(rect.right - popoverWidth);
  const clampedLeft = Math.max(
    8,
    Math.min(window.innerWidth - popoverWidth - 8, rawLeft)
  );
  return {
    top: rawTop,
    left: clampedLeft,
    placeAbove,
  };
}

interface CalendarGridProps {
  selectedIso: string;
  viewYear: number;
  viewMonth: number; // 1..12
  onChangeView: (year: number, month: number) => void;
  onSelectDate: (isoDate: string) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  selectedIso,
  viewYear,
  viewMonth,
  onChangeView,
  onSelectDate,
}) => {
  const todayIso = getTodayIso();

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    const minY = Math.min(2005, viewYear - 5);
    const maxY = Math.max(base + 15, viewYear + 5);
    const list: number[] = [];
    for (let y = minY; y <= maxY; y++) list.push(y);
    return list;
  }, [viewYear]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();
    const prevMonthDays = new Date(Date.UTC(viewYear, viewMonth - 1, 0)).getUTCDate();

    const items: {
      iso: string;
      day: number;
      inCurrentMonth: boolean;
    }[] = [];

    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      items.push({
        iso: toIsoYmd(prevYear, prevMonth, d),
        day: d,
        inCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      items.push({
        iso: toIsoYmd(viewYear, viewMonth, d),
        day: d,
        inCurrentMonth: true,
      });
    }

    const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    const trailing = (7 - (items.length % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      items.push({
        iso: toIsoYmd(nextYear, nextMonth, d),
        day: d,
        inCurrentMonth: false,
      });
    }

    return items;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      onChangeView(viewYear - 1, 12);
    } else {
      onChangeView(viewYear, viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      onChangeView(viewYear + 1, 1);
    } else {
      onChangeView(viewYear, viewMonth + 1);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="Previous month"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1 min-w-0">
          <select
            aria-label="Month"
            value={viewMonth}
            onChange={(e) => onChangeView(viewYear, Number(e.target.value))}
            className="rounded-lg border border-slate-200/80 bg-white px-1.5 py-1 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name.slice(0, 3)}
              </option>
            ))}
          </select>

          <select
            aria-label="Year"
            value={viewYear}
            onChange={(e) => onChangeView(Number(e.target.value), viewMonth)}
            className="rounded-lg border border-slate-200/80 bg-white px-1.5 py-1 text-xs font-semibold text-slate-800 tabular-nums focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Next month"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            {wd}
          </div>
        ))}
        {cells.map((cell) => {
          const isSelected = cell.iso === selectedIso;
          const isToday = cell.iso === todayIso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              className={`h-8 w-full rounded-lg text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-sky-600 font-bold text-white shadow-sm'
                  : isToday
                  ? 'border border-sky-400/80 bg-sky-50/80 font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-500/70 dark:bg-sky-950/50 dark:text-sky-300'
                  : cell.inCurrentMonth
                  ? 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  : 'text-slate-400 hover:bg-slate-100/70 dark:text-slate-600 dark:hover:bg-slate-800/60'
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState(() => formatIsoYmdToDot(value));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);

  const normalizedIso = parseDotYmdToIso(value) || '';
  const initialParts = parseIsoParts(normalizedIso || getTodayIso())!;
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  useEffect(() => {
    if (!focused) {
      setText(formatIsoYmdToDot(value));
    }
  }, [value, focused]);

  useLayoutEffect(() => {
    if (!open) return;

    const syncCoords = () => {
      const measuredH = popoverRef.current?.offsetHeight || 310;
      const next = computePopoverCoords(containerRef.current, 272, measuredH);
      setCoords((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.placeAbove === next.placeAbove
          ? prev
          : next
      );
    };
    syncCoords();

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('scroll', syncCoords, true);
    window.addEventListener('resize', syncCoords);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', syncCoords, true);
      window.removeEventListener('resize', syncCoords);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const parts = parseIsoParts(normalizedIso || getTodayIso());
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
    setCoords(computePopoverCoords(containerRef.current, 272, 310));
    setOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
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
      <button
        ref={toggleBtnRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Open date picker'}
        title="Toggle calendar"
        className={`absolute right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
          open
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-300'
            : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white'
        } ${iconClassName}`}
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Date picker'}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove
                ? `${window.innerHeight - coords.top}px`
                : 'auto',
              left: `${coords.left}px`,
              width: '272px',
              maxHeight: 'calc(100dvh - 16px)',
              overflowY: 'auto',
              zIndex: 99999,
            }}
            className="rounded-2xl border border-slate-200/95 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <CalendarGrid
              selectedIso={normalizedIso}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onChangeView={(y, m) => {
                setViewYear(y);
                setViewMonth(m);
              }}
              onSelectDate={(iso) => {
                onChange(iso);
                setText(formatIsoYmdToDot(iso));
                setOpen(false);
              }}
            />

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const today = getTodayIso();
                  onChange(today);
                  setText(formatIsoYmdToDot(today));
                  setOpen(false);
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/50 cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center gap-1.5">
                {normalizedIso && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setText('');
                      setOpen(false);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close calendar"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState(() => formatWallClockToDotDateTime(value));
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);

  const normalizedWall = parseDotDateTimeToWallClock(value) || '';
  const [datePart, timePart] = normalizedWall
    ? normalizedWall.split('T')
    : ['', ''];
  const currentHour24 = timePart ? Number(timePart.split(':')[0]) : new Date().getHours();
  const currentMinute = timePart ? Number(timePart.split(':')[1]) : new Date().getMinutes();
  const currentPeriod: 'AM' | 'PM' = currentHour24 >= 12 ? 'PM' : 'AM';
  const currentHour12 = currentHour24 % 12 || 12;

  const initialParts = parseIsoParts(datePart || getTodayIso())!;
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);

  useEffect(() => {
    if (!focused) {
      setText(formatWallClockToDotDateTime(value));
    }
  }, [value, focused]);

  useLayoutEffect(() => {
    if (!open) return;

    const syncCoords = () => {
      const measuredH = popoverRef.current?.offsetHeight || 390;
      const next = computePopoverCoords(containerRef.current, 288, measuredH);
      setCoords((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.placeAbove === next.placeAbove
          ? prev
          : next
      );
    };
    syncCoords();

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('scroll', syncCoords, true);
    window.addEventListener('resize', syncCoords);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', syncCoords, true);
      window.removeEventListener('resize', syncCoords);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    const parts = parseIsoParts(datePart || getTodayIso());
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
    setCoords(computePopoverCoords(containerRef.current, 288, 390));
    setOpen(true);
  };

  const commitDateTime = (nextIsoDate: string, nextHour24: number, nextMin: number) => {
    const nextWall = `${nextIsoDate}T${String(nextHour24).padStart(2, '0')}:${String(
      nextMin
    ).padStart(2, '0')}`;
    onChange(nextWall);
    setText(formatWallClockToDotDateTime(nextWall));
  };

  const toHour24 = (h12: number, period: 'AM' | 'PM'): number => {
    if (period === 'AM') return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
  };

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
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
      <button
        ref={toggleBtnRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Open date and time picker'}
        title="Toggle date & time calendar"
        className={`absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
          open
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-300'
            : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white'
        }`}
      >
        <CalendarClock className="h-3.5 w-3.5" />
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={ariaLabel ? `${ariaLabel} calendar` : 'Date and time picker'}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove
                ? `${window.innerHeight - coords.top}px`
                : 'auto',
              left: `${coords.left}px`,
              width: '288px',
              maxHeight: 'calc(100dvh - 16px)',
              overflowY: 'auto',
              zIndex: 99999,
            }}
            className="rounded-2xl border border-slate-200/95 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-3"
          >
            <CalendarGrid
              selectedIso={datePart}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onChangeView={(y, m) => {
                setViewYear(y);
                setViewMonth(m);
              }}
              onSelectDate={(iso) => {
                commitDateTime(iso, currentHour24, currentMinute);
              }}
            />

            <div className="border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  Time
                </span>

                <div className="flex items-center gap-1">
                  <select
                    aria-label="Hour"
                    value={currentHour12}
                    onChange={(e) => {
                      const nextH24 = toHour24(Number(e.target.value), currentPeriod);
                      commitDateTime(datePart || getTodayIso(), nextH24, currentMinute);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-800 tabular-nums focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-slate-400">:</span>
                  <select
                    aria-label="Minute"
                    value={currentMinute}
                    onChange={(e) => {
                      commitDateTime(
                        datePart || getTodayIso(),
                        currentHour24,
                        Number(e.target.value)
                      );
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-800 tabular-nums focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {Array.from({ length: 60 }, (_, m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    {(['AM', 'PM'] as const).map((period) => {
                      const active = currentPeriod === period;
                      return (
                        <button
                          key={period}
                          type="button"
                          onClick={() => {
                            const nextH24 = toHour24(currentHour12, period);
                            commitDateTime(datePart || getTodayIso(), nextH24, currentMinute);
                          }}
                          className={`px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-600 text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {period}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const nowWall = getNowWallClock();
                  onChange(nowWall);
                  setText(formatWallClockToDotDateTime(nowWall));
                  const p = parseIsoParts(nowWall.split('T')[0]);
                  if (p) {
                    setViewYear(p.year);
                    setViewMonth(p.month);
                  }
                }}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/50 cursor-pointer"
              >
                Now
              </button>
              <div className="flex items-center gap-1.5">
                {normalizedWall && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setText('');
                      setOpen(false);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
