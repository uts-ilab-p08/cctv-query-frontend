"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";

import { cn } from "@/lib/cn";
import {
  CAMERA_FOR_PHRASE,
  CONFIDENCE_FOR_PHRASE,
  TAG_FOR_PHRASE,
  replaceRange,
  toSegments,
  type EntityHit,
} from "@/lib/entities";
import { useAppStore } from "@/store/useAppStore";
import type { ClipTag } from "@/types";

interface MenuState {
  hit: EntityHit;
  top: number;
  left: number;
}

export interface QueryFieldProps {
  /** "hero" on Home/Search, "compact" at the top of Results. */
  variant?: "hero" | "compact";
  onSubmit: () => void;
}

/** The phrase map is authored as plain strings; narrow it back to the domain union. */
const CLIP_TAGS: readonly ClipTag[] = [
  "Person",
  "Vehicle",
  "Entry",
  "Exit",
  "Loitering",
  "Object Left",
];

function asClipTag(value: string | undefined): ClipTag | undefined {
  return CLIP_TAGS.find((tag) => tag === value);
}

/**
 * The tokenized query field: a highlight overlay (z-2, pointer-events-none except tokens)
 * sits ON TOP of a transparent textarea (z-1) that owns the caret and typing.
 * Detected terms are bold + dashed-underlined in --token-ink and open a dropdown on click.
 */
export function QueryField({ variant = "hero", onSubmit }: QueryFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  const classicMode = useAppStore((s) => s.searchMode === "classic");
  const openFilters = useAppStore((s) => s.openFilters);
  const setCameras = useAppStore((s) => s.setCameras);
  const addTag = useAppStore((s) => s.addTag);
  const setConfidence = useAppStore((s) => s.setConfidence);

  const hero = variant === "hero";
  const pad = hero ? "py-5 pl-7 pr-[130px]" : "py-4 pl-6 pr-[118px]";
  const text = hero ? "text-base leading-[1.7]" : "text-[15px] leading-[1.6]";

  const openMenu = (hit: EntityHit) => (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const field = fieldRef.current;
    if (!field) return;
    const r = event.currentTarget.getBoundingClientRect();
    const fr = field.getBoundingClientRect();
    setMenu({
      hit,
      top: r.bottom - fr.top + 8,
      left: Math.max(8, Math.min(r.left - fr.left, fr.width - 232)),
    });
  };

  const applyFilter = (kind: EntityHit["def"]["id"], phrase: string) => {
    const key = phrase.toLowerCase();
    if (kind === "camera") {
      const code = CAMERA_FOR_PHRASE[key];
      if (code) setCameras([code]);
      return;
    }
    if (kind === "confidence") {
      const value = CONFIDENCE_FOR_PHRASE[key];
      if (value !== undefined) setConfidence(value);
      return;
    }
    const tag = asClipTag(TAG_FOR_PHRASE[key]);
    if (tag) addTag(tag);
  };

  const choose = (label: string) => () => {
    if (!menu) return;
    const { hit } = menu;
    setQuery(replaceRange(query, hit.start, hit.end, label));
    applyFilter(hit.def.id, label);
    setMenu(null);
    const caret = hit.start + label.length;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      <div
        ref={fieldRef}
        onClick={() => {
          inputRef.current?.focus();
          setMenu(null);
        }}
        className={cn(
          "rounded-field glass-card relative z-20 w-full cursor-text",
          !hero && "max-w-[820px]",
        )}
      >
        <div
          className={cn(
            "text-ink-2 pointer-events-none relative z-[2] font-sans break-words whitespace-pre-wrap",
            pad,
            text,
            hero ? "min-h-16" : "min-h-14",
          )}
        >
          {query.length === 0 ? (
            <span className="text-ink-3">
              {hero
                ? "Ask anything… e.g. anyone who entered after the red car arrived"
                : "Ask anything…"}
            </span>
          ) : (
            toSegments(query).map((segment, index) =>
              segment.kind === "text" ? (
                <span key={index}>{segment.text}</span>
              ) : (
                <span
                  key={index}
                  onClick={openMenu(segment.hit)}
                  className="border-token-line text-token-ink pointer-events-auto cursor-pointer border-b-2 border-dashed pb-[3px] font-bold"
                >
                  {segment.text}
                </span>
              ),
            )
          )}
        </div>

        <textarea
          ref={inputRef}
          value={query}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          aria-label="Search the camera network"
          className={cn(
            "absolute inset-0 z-[1] h-full w-full resize-none overflow-hidden border-none bg-transparent font-sans text-transparent caret-[var(--accent)] outline-none",
            pad,
            text,
          )}
        />

        {menu ? (
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ top: menu.top, left: menu.left }}
            className="glass-panel rounded-chip absolute z-40 max-h-[252px] min-w-[212px] overflow-y-auto p-2"
          >
            <div className="text-ink-3 px-2 pt-1 pb-2 font-mono text-[10px] tracking-[1px]">
              {menu.hit.def.title}
            </div>
            {menu.hit.def.options.map((option) => {
              const current =
                query.slice(menu.hit.start, menu.hit.end).toLowerCase() === option.toLowerCase();
              return (
                <button
                  key={option}
                  type="button"
                  onClick={choose(option)}
                  className={cn(
                    "block w-full cursor-pointer rounded-lg px-2.5 py-2 text-left text-[13px]",
                    current ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-accent-soft",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className={cn(
            "absolute z-[3] flex items-center gap-2",
            hero ? "top-[11px] right-3" : "top-[9px] right-2.5",
          )}
        >
          {classicMode ? (
            <button
              type="button"
              onClick={openFilters}
              aria-label="Filters"
              className={cn(
                "glass-card-flat text-ink-2 flex cursor-pointer items-center justify-center rounded-full",
                hero ? "size-11" : "size-[38px]",
              )}
            >
              <SlidersHorizontal size={hero ? 18 : 16} strokeWidth={2} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            aria-label="Search"
            className={cn(
              "surface-action shadow-action flex cursor-pointer items-center justify-center rounded-full",
              hero ? "size-11" : "size-[38px]",
            )}
          >
            <Search size={hero ? 19 : 17} strokeWidth={2.1} />
          </button>
        </div>
      </div>
    </div>
  );
}
