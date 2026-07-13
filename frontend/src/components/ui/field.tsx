import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted">
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}

export function Field({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}
