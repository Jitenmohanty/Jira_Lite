'use client';

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Field, FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type IconType = LucideIcon;

/** Icon-badged page header shared by every auth screen. */
export function AuthHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: IconType;
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div className="mb-6">
      <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-elevated text-accent shadow-sm">
        <Icon size={20} strokeWidth={2} />
      </span>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>
    </div>
  );
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: IconType;
  error?: string;
  /** Optional node rendered on the right of the label row (e.g. "Forgot password?"). */
  labelRight?: ReactNode;
}

/**
 * Labelled input with a left icon, `aria-invalid` wiring, and a built-in
 * show/hide toggle when `type="password"`. Works with react-hook-form's
 * `register()` because it forwards the ref and spreads name/handlers.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, icon: Icon, error, labelRight, id, type = 'text', className, ...props },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (reveal ? 'text' : 'password') : type;

  return (
    <Field>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-medium text-muted">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
          <Icon size={16} />
        </span>
        <Input
          ref={ref}
          id={id}
          type={inputType}
          aria-invalid={!!error}
          className={cn('pl-9', isPassword && 'pr-9', className)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition-colors hover:text-muted focus-visible:text-foreground"
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  );
});

/** Consistent inline error banner for a failed submit. */
export function AuthError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
    >
      <AlertCircle size={14} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}
