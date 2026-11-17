import React, { useMemo } from 'react';
import { Globe } from 'lucide-react';
import { DEFAULT_TIME_ZONE, getAllTimeZoneOptions } from '../lib/timeZones';

interface TimeZoneSelectProps {
  value?: string | null;
  onChange: (timeZone: string) => void;
  id?: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const TimeZoneSelect: React.FC<TimeZoneSelectProps> = ({
  value,
  onChange,
  id,
  label = 'Time Zone (optional)',
  compact = false,
  className = '',
}) => {
  const options = useMemo(() => getAllTimeZoneOptions(), []);
  const defaultOpt = options[0];
  const worldOpts = options.slice(1);
  const normalizedValue = (value || '').trim() || DEFAULT_TIME_ZONE;

  return (
    <div className={className}>
      {!compact && label && (
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
        >
          <Globe className="h-3 w-3 text-sky-600 dark:text-sky-400" />
          <span>{label}</span>
        </label>
      )}
      <select
        id={id}
        aria-label={label || 'Time Zone'}
        value={normalizedValue}
        onChange={(e) => onChange(e.target.value || DEFAULT_TIME_ZONE)}
        className={
          compact
            ? 'rounded-xl border border-slate-200/90 bg-white/85 px-2.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/75 dark:text-white'
            : 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white'
        }
      >
        <optgroup label="My Diaries Time (Default)">
          <option value={defaultOpt.id}>{defaultOpt.label}</option>
        </optgroup>
        <optgroup label="All World Time Zones">
          {worldOpts.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
};
