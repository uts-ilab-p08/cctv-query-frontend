"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import type { ClipTag, DetectedKeyword } from "@/types";

interface KeywordChipsProps {
  keywords: DetectedKeyword[];
}

/** Inline filter suggestions derived from the natural-language query. */
export function KeywordChips({ keywords }: KeywordChipsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filters = useAppStore((state) => state.filters);
  const toggleCamera = useAppStore((state) => state.toggleCamera);
  const toggleTag = useAppStore((state) => state.toggleTag);

  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  if (keywords.length === 0) return null;

  const isSelected = (keyword: DetectedKeyword, option: string) =>
    keyword.kind === "camera"
      ? filters.cameras.includes(option)
      : keyword.kind === "tag"
        ? filters.tags.includes(option as ClipTag)
        : false;

  const selectOption = (keyword: DetectedKeyword, option: string) => {
    if (keyword.kind === "camera") toggleCamera(option);
    else if (keyword.kind === "tag") toggleTag(option as ClipTag);
    setOpenId(null);
  };

  return (
    <div ref={containerRef} className="mt-3.5 flex flex-wrap gap-2">
      {keywords.map((keyword) => {
        const open = openId === keyword.id;
        return (
          <div key={keyword.id} className="relative">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              onClick={() => setOpenId(open ? null : keyword.id)}
              className="border-indigo/35 bg-indigo/12 text-indigo-strong hover:bg-indigo/20 flex cursor-pointer items-center gap-1.5 rounded-[20px] border px-3 py-[7px] font-mono text-xs transition-colors duration-150"
            >
              <span aria-hidden className="bg-indigo-strong h-[5px] w-[5px] rounded-full" />
              {keyword.label}
            </button>

            {open ? (
              <div
                role="menu"
                aria-label={keyword.dropdownTitle}
                className="absolute top-[calc(100%+6px)] left-0 z-20 min-w-[210px] rounded-md border border-white/70 bg-white/90 p-2 shadow-[0_16px_40px_rgba(67,56,202,0.2)] backdrop-blur-[20px]"
              >
                <p className="text-ink-subtle px-2 pt-1 pb-2 font-mono text-[10px] tracking-[1px]">
                  {keyword.dropdownTitle}
                </p>
                {keyword.options.map((option) => {
                  const selected = isSelected(keyword, option);
                  return (
                    <button
                      key={option}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={selected}
                      disabled={keyword.kind === "time"}
                      onClick={() => selectOption(keyword, option)}
                      className={cn(
                        "block w-full rounded-xs px-2.5 py-2 text-left text-[13px] transition-colors duration-150",
                        selected
                          ? "bg-indigo-wash text-indigo-strong"
                          : "text-ink-soft bg-transparent",
                        keyword.kind === "time"
                          ? "cursor-default opacity-70"
                          : "hover:bg-indigo-wash cursor-pointer",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
