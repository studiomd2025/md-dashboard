import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { DiaryFont } from '../types';

export interface FontOption {
  id: DiaryFont;
  label: string;
  fontFamily: string;
  sampleStyle?: React.CSSProperties;
}

export const DIARY_FONT_OPTIONS: FontOption[] = [
  {
    id: 'sans',
    label: 'DM Sans',
    fontFamily: 'var(--font-body)',
  },
  {
    id: 'serif',
    label: 'Fraunces Serif',
    fontFamily: 'var(--font-serif)',
  },
  {
    id: 'mono',
    label: 'JetBrains Mono',
    fontFamily: 'var(--font-mono)',
    sampleStyle: { fontSize: '0.92em' },
  },
  {
    id: 'hand',
    label: 'Caveat Journal',
    fontFamily: 'var(--font-hand)',
    sampleStyle: { fontSize: '1.2em', lineHeight: 1.1 },
  },
];

interface FontSelectProps {
  value: DiaryFont;
  onChange: (font: DiaryFont) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
}

export const FontSelect: React.FC<FontSelectProps> = ({
  value,
  onChange,
  id,
  ariaLabel = 'Select font',
  className = '',
  buttonClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  const selected =
    DIARY_FONT_OPTIONS.find((opt) => opt.id === value) || DIARY_FONT_OPTIONS[0];

  const updateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 220 && rect.top > 220;
    setCoords({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 180),
      placeAbove,
    });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handleScrollOrResize = () => updateCoords();
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !document.getElementById('font-select-portal')?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open) updateCoords();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer ${buttonClassName}`}
      >
        <span
          className="truncate"
          style={{
            fontFamily: selected.fontFamily,
            ...selected.sampleStyle,
          }}
        >
          {selected.label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        ReactDOM.createPortal(
          <ul
            id="font-select-portal"
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: coords.placeAbove ? 'auto' : `${coords.top}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : 'auto',
              left: `${coords.left}px`,
              minWidth: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {DIARY_FONT_OPTIONS.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <li key={opt.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="truncate text-sm"
                      style={{
                        fontFamily: opt.fontFamily,
                        ...opt.sampleStyle,
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
};
