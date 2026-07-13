// Tiny decoupled toast bus so non-component code (e.g. React Query mutation
// callbacks) can raise toasts without importing React context.

export type ToastVariant = 'default' | 'success' | 'error';
export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let handler: ((t: ToastInput) => void) | null = null;

/** Registered by the ToastProvider on mount. */
export function setToastHandler(h: ((t: ToastInput) => void) | null) {
  handler = h;
}

/** Raise a toast from anywhere. No-op if the provider isn't mounted. */
export function emitToast(input: ToastInput) {
  handler?.(input);
}
