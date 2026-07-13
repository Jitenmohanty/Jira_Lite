'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * Accessible single-select dropdown (listbox pattern): opens on click, supports
 * ArrowUp/Down + Enter + Escape, and closes on outside click. `trigger` renders
 * the closed control given the current selection.
 */
export function Menu<T extends string>({
  value,
  options,
  onChange,
  trigger,
  align = 'left',
  className,
}: {
  value: T;
  options: MenuOption<T>[];
  onChange: (value: T) => void;
  trigger: (state: { open: boolean; selected?: MenuOption<T> }) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) {
      const i = options.findIndex((o) => o.value === value);
      setActive(i < 0 ? 0 : i);
    }
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const o = options[active];
        if (o) {
          onChange(o.value);
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, active, options, onChange]);

  return (
    <div className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full">
        {trigger({ open, selected })}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="listbox"
            className={cn(
              'animate-scale-in absolute z-30 mt-1 min-w-[190px] rounded-md border border-border bg-surface-elevated p-1 shadow-xl',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  i === active ? 'bg-surface-hover text-foreground' : 'text-muted',
                )}
              >
                {o.icon}
                <span className="flex-1 truncate">{o.label}</span>
                {o.value === value && <Check size={14} className="text-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
