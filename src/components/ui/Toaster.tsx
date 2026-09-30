"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { dismissToast, TOAST_DURATION_MS, useToasts, type Toast } from "@/lib/toast";

/**
 * Where toasts appear: top centre, just under the top bar, clear of the chat input and the
 * matching-moments strip. The live region is always on the page, so a screen reader
 * announces each toast as it is added (a region created with its content often isn't).
 */
export function Toaster() {
  const toasts = useToasts((state) => state.toasts);

  return (
    <section
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed top-[76px] left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2"
    >
      <ol className="flex list-none flex-col gap-2 p-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ol>
    </section>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  /** Hovered or focused: the reader is still on it, so don't take it away (WCAG 2.2.1). */
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [paused, toast.id]);

  const Icon = toast.tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <li
      data-tone={toast.tone}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="glass-panel toast-in pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3"
    >
      <Icon
        size={18}
        strokeWidth={2}
        aria-hidden
        className={cn("mt-px shrink-0", toast.tone === "error" ? "text-flag" : "text-match")}
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink text-[14px] font-semibold">{toast.message}</p>
        {toast.detail ? (
          <p className="text-ink-2 mt-0.5 truncate text-[13px]" title={toast.detail}>
            {toast.detail}
          </p>
        ) : null}
        {toast.action ? (
          <Link
            href={toast.action.href}
            onClick={() => dismissToast(toast.id)}
            className="text-accent-strong mt-1.5 inline-block text-[13px] font-medium no-underline hover:underline"
          >
            {toast.action.label}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="text-ink-3 hover:text-ink -mr-1 shrink-0 cursor-pointer rounded-md p-0.5 transition-colors duration-150"
      >
        <X size={15} strokeWidth={2} aria-hidden />
      </button>
    </li>
  );
}
