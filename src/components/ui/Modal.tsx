"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Dialog width in pixels; capped at 90vw. */
  width?: number;
  /**
   * "bare" floats `children` alone over a light, blurred backdrop — no panel, no
   * header (the title stays for screen readers). Escape / backdrop click close it.
   */
  variant?: "panel" | "bare";
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
  variant = "panel",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", handleKeyDown);

    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const bare = variant === "bare";

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        bare ? "bg-scrim/40 backdrop-blur-[6px]" : "bg-scrim backdrop-blur-[4px]",
      )}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={{ width }}
        className={cn(
          "w-full max-w-[90vw]",
          !bare && "rounded-card glass-panel max-h-[80vh] overflow-y-auto p-[26px]",
        )}
      >
        {bare ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : (
          <div className={cn("flex items-center justify-between", description ? "mb-1.5" : "mb-5")}>
            <h2 id={titleId} className="text-[17px] font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-ink-2 hover:text-ink cursor-pointer rounded-lg p-1 transition-colors duration-150"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        )}

        {description ? (
          <p
            id={descriptionId}
            className={cn("text-ink-2 text-xs", bare ? "sr-only" : "mb-[18px]")}
          >
            {description}
          </p>
        ) : null}

        {children}

        {footer}
      </div>
    </div>
  );
}
