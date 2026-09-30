import { create } from "zustand";

export type ToastTone = "success" | "error";

export interface ToastAction {
  label: string;
  href: string;
}

export interface Toast {
  id: number;
  message: string;
  /** A second, quieter line, e.g. the query that was saved. */
  detail?: string;
  tone: ToastTone;
  action?: ToastAction;
}

/** How long a toast stays, not counting time the pointer or focus spends on it. */
export const TOAST_DURATION_MS = 5_000;

/** Older toasts give way once this many are on screen. */
const MAX_TOASTS = 3;

interface ToastState {
  toasts: Toast[];
}

export const useToasts = create<ToastState>()(() => ({ toasts: [] }));

let nextId = 0;

/** Shows a toast (see `Toaster`) and returns its id. */
export function showToast(toast: Omit<Toast, "id" | "tone"> & { tone?: ToastTone }): number {
  const next: Toast = { ...toast, tone: toast.tone ?? "success", id: ++nextId };
  useToasts.setState((state) => ({ toasts: [...state.toasts, next].slice(-MAX_TOASTS) }));
  return next.id;
}

export function dismissToast(id: number): void {
  useToasts.setState((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
}
