"use client";

import { Cctv, Check, Clock, Loader2, Search, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";

import { getCameras } from "@/lib/api/endpoints";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { camerasInQuery, withCamera, withoutCamera } from "@/lib/cameraQuery";
import { cn } from "@/lib/cn";
import { replaceRange, toSegments, type EntityHit } from "@/lib/entities";
import {
  hourAfter,
  timeInQuery,
  withoutTime,
  withTime,
  type TimeFilter,
  type TimeMode,
} from "@/lib/timeQuery";
import { useAppStore } from "@/store/useAppStore";
import type { CameraDirectoryEntry } from "@/types";

interface MenuState {
  hit: EntityHit;
  top: number;
  left: number;
}

export interface QueryFieldProps {
  /** "hero" on Home/Search, "compact" at the top of Results. */
  variant?: "hero" | "compact";
  /**
   * Controlled mode: pass both to edit a local draft (e.g. the New Query dialog)
   * instead of the shared `query` the rest of the screen is showing.
   */
  value?: string;
  onChange?: (value: string) => void;
  /** Over a modal backdrop: swap the translucent card for the opaque floating surface. */
  floating?: boolean;
  onSubmit: () => void;
  /** The search was sent and the next page is loading: the button spins and further
   *  submits (click or Enter) are ignored. */
  submitting?: boolean;
  /** `view-transition-name` of the field's box, for it to morph across screens. */
  transitionName?: string;
}

const TIME_MODES = [
  { value: "at", label: "At" },
  { value: "after", label: "After" },
  { value: "before", label: "Before" },
  { value: "between", label: "Between" },
] as const;

/** Characters typed before the clear button appears — below this it is noise. */
const CLEAR_MIN_LENGTH = 3;

/** The indexed cameras, loaded the first time a camera list is opened. */
type Directory =
  { status: "idle" | "loading" | "error" } | { status: "ready"; cameras: CameraDirectoryEntry[] };

/**
 * The tokenized query field: a highlight overlay (z-2, pointer-events-none except tokens)
 * sits ON TOP of a transparent textarea (z-1) that owns the caret and typing.
 * Detected terms are dashed-underlined in --token-ink and open a dropdown on click. Their
 * emphasis is a text stroke, NOT font-weight: bold glyphs are wider than the textarea's
 * regular ones, which would push the visible text ahead of the (textarea-owned) caret.
 *
 * Cameras are part of the text too: a typed code (`G328`) is a token that swaps for any
 * indexed camera, and the camera picker writes or removes "on cameras …" in the query.
 * The time of day works the same way: the clock picker beside it writes "at 7:00 pm" or
 * "between 7:00 pm and 9:00 pm", and a time typed in plain words is a token too. The text
 * is the pickers' only state. The RAG reads both from there; nothing is sent as a
 * separate filter.
 */
export function QueryField({
  variant = "hero",
  value,
  onChange,
  floating = false,
  onSubmit,
  submitting = false,
  transitionName,
}: QueryFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [picker, setPicker] = useState<"cameras" | "time" | null>(null);
  /** The time picker's mode while the query names no time; otherwise the text's wins. */
  const [timeMode, setTimeMode] = useState<TimeMode>("at");
  const [directory, setDirectory] = useState<Directory>({ status: "idle" });

  const storeQuery = useAppStore((s) => s.query);
  const setStoreQuery = useAppStore((s) => s.setQuery);
  const controlled = value !== undefined && onChange !== undefined;
  const query = controlled ? value : storeQuery;
  const setQuery = controlled ? onChange : setStoreQuery;

  const hero = variant === "hero";
  // Right padding reserves room for the overlaid buttons. It is fixed — not per
  // clear-button visibility — so the text never reflows when the clear button appears.
  const pad = hero ? "py-5 pr-[212px] pl-7" : "py-4 pr-[192px] pl-6";
  const showClear = query.length >= CLEAR_MIN_LENGTH;

  /** Fetch the indexed cameras once; a failed load retries on the next open. */
  const loadDirectory = () => {
    if (directory.status === "ready" || directory.status === "loading") return;
    setDirectory({ status: "loading" });
    getCameras()
      .then((cameras) => setDirectory({ status: "ready", cameras }))
      .catch(() => setDirectory({ status: "error" }));
  };

  const clear = () => {
    setQuery("");
    setMenu(null);
    inputRef.current?.focus();
  };

  const togglePicker = (which: "cameras" | "time") => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenu(null);
    setPicker((open) => (open === which ? null : which));
    if (which === "cameras") loadDirectory();
  };

  const selectedCameras = camerasInQuery(query);
  const toggleCamera = (code: string) => () =>
    setQuery(selectedCameras.includes(code) ? withoutCamera(query, code) : withCamera(query, code));

  const currentTime = timeInQuery(query);
  const shownMode = currentTime?.mode ?? timeMode;
  const setTime = (filter: TimeFilter) => setQuery(withTime(query, filter));
  const changeMode = (mode: TimeMode) => {
    setTimeMode(mode);
    if (currentTime) {
      setTime({ mode, from: currentTime.from, to: currentTime.to ?? hourAfter(currentTime.from) });
    }
  };
  // A half-typed native time input reports "": wait for a whole time before writing it.
  const changeFrom = (value: string) => {
    if (value) setTime({ mode: shownMode, from: value, to: currentTime?.to ?? hourAfter(value) });
  };
  const changeTo = (value: string) => {
    if (value && currentTime) setTime({ mode: "between", from: currentTime.from, to: value });
  };
  const clearTime = () => {
    if (currentTime) setTimeMode(currentTime.mode);
    setQuery(withoutTime(query));
  };

  const cameraCodes = directory.status === "ready" ? directory.cameras.map((c) => c.code) : [];
  const sceneNames =
    directory.status === "ready"
      ? [...new Set(directory.cameras.flatMap((c) => (c.scene ? [c.scene] : [])))]
      : [];
  /**
   * Cameras and locations come from the index, so only indexed values are offered. A
   * fixed list leads with the typed term when it lacks it ("carrying"), so the menu
   * always shows what the token is now.
   */
  const optionsFor = (hit: EntityHit) => {
    if (hit.def.id === "camera") return cameraCodes;
    if (hit.def.id === "scene") return sceneNames;
    const typed = query.slice(hit.start, hit.end).toLowerCase();
    const { options } = hit.def;
    return options.length === 0 || options.includes(typed) ? options : [typed, ...options];
  };
  const directoryNote =
    directory.status === "error"
      ? "Couldn't load the cameras."
      : directory.status === "ready" && cameraCodes.length === 0
        ? "No cameras indexed yet."
        : directory.status !== "ready"
          ? "Loading cameras…"
          : null;
  const text = hero ? "text-base leading-[1.7]" : "text-[15px] leading-[1.6]";

  const openMenu = (hit: EntityHit) => (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const field = fieldRef.current;
    if (!field) return;
    const r = event.currentTarget.getBoundingClientRect();
    const fr = field.getBoundingClientRect();
    setPicker(null);
    if (hit.def.id === "camera" || hit.def.id === "scene") loadDirectory();
    setMenu({
      hit,
      top: r.bottom - fr.top + 8,
      left: Math.max(8, Math.min(r.left - fr.left, fr.width - 232)),
    });
  };

  const choose = (label: string) => () => {
    if (!menu) return;
    const { hit } = menu;
    setQuery(replaceRange(query, hit.start, hit.end, label));
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
      if (!submitting) onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      <div
        ref={fieldRef}
        style={transitionName ? { viewTransitionName: transitionName } : undefined}
        onClick={() => {
          inputRef.current?.focus();
          setMenu(null);
          setPicker(null);
        }}
        className={cn(
          "rounded-field relative z-20 w-full cursor-text",
          floating ? "glass-panel" : "glass-card",
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
                  className="border-token-line text-token-ink pointer-events-auto cursor-pointer border-b-2 border-dashed pb-[3px] [-webkit-text-stroke:0.45px_currentColor]"
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
            {menu.hit.def.note ? (
              <p className="text-ink-3 max-w-[260px] px-2 pb-2 text-[11px] leading-[1.45]">
                {menu.hit.def.note}
              </p>
            ) : null}
            {menu.hit.def.id === "camera" && directoryNote ? (
              <p className="text-ink-3 px-2.5 py-2 text-[13px]">{directoryNote}</p>
            ) : null}
            {optionsFor(menu.hit).map((option) => {
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

        {picker === "cameras" ? (
          <div
            role="group"
            aria-label="Search in cameras"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "glass-panel rounded-chip absolute right-3 z-40 w-[248px] p-2",
              hero ? "top-[64px]" : "top-[56px]",
            )}
          >
            <div className="text-ink-3 px-2 pt-1 pb-1 font-mono text-[10px] tracking-[1px]">
              SEARCH IN CAMERAS
            </div>
            <p className="text-ink-3 px-2 pb-2 text-[11px] leading-[1.45]">
              Added to your question, so the assistant searches only these.
            </p>
            {directoryNote ? (
              <p className="text-ink-3 px-2.5 py-2 text-[13px]">{directoryNote}</p>
            ) : null}
            <div className="max-h-[220px] overflow-y-auto">
              {directory.status === "ready"
                ? directory.cameras.map((camera) => {
                    const picked = selectedCameras.includes(camera.code);
                    return (
                      <button
                        key={camera.code}
                        type="button"
                        aria-pressed={picked}
                        aria-label={camera.code}
                        onClick={toggleCamera(camera.code)}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px]",
                          picked ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-accent-soft",
                        )}
                      >
                        <span className="font-mono font-semibold">{camera.code}</span>
                        {camera.scene ? (
                          <span className="text-ink-3 font-mono text-[11px]">{camera.scene}</span>
                        ) : null}
                        {picked ? (
                          <Check size={14} strokeWidth={2.4} aria-hidden className="ml-auto" />
                        ) : null}
                      </button>
                    );
                  })
                : null}
            </div>
          </div>
        ) : null}

        {picker === "time" ? (
          <div
            role="group"
            aria-label="Search at a time"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "glass-panel rounded-chip absolute right-3 z-40 flex w-[280px] flex-col gap-2 p-2",
              hero ? "top-[64px]" : "top-[56px]",
            )}
          >
            <div>
              <div className="text-ink-3 px-2 pt-1 pb-1 font-mono text-[10px] tracking-[1px]">
                SEARCH AT A TIME
              </div>
              <p className="text-ink-3 px-2 text-[11px] leading-[1.45]">
                Added to your question, so the assistant searches only then.
              </p>
            </div>
            <SegmentedControl
              label="Time range"
              options={TIME_MODES}
              value={shownMode}
              onChange={changeMode}
              className="w-full [&>button]:flex-1 [&>button]:px-2"
            />
            <div className="flex gap-2 px-0.5">
              <label className="text-ink-3 flex min-w-0 flex-1 flex-col gap-1 text-[11px]">
                {shownMode === "between" ? "From" : "Time"}
                <Input
                  type="time"
                  mono
                  value={currentTime?.from ?? ""}
                  onChange={(event) => changeFrom(event.target.value)}
                />
              </label>
              {shownMode === "between" ? (
                <label className="text-ink-3 flex min-w-0 flex-1 flex-col gap-1 text-[11px]">
                  To
                  <Input
                    type="time"
                    mono
                    value={currentTime?.to ?? ""}
                    disabled={!currentTime}
                    onChange={(event) => changeTo(event.target.value)}
                    className="disabled:opacity-50"
                  />
                </label>
              ) : null}
            </div>
            {currentTime ? (
              <button
                type="button"
                onClick={clearTime}
                className="text-ink-2 hover:bg-accent-soft flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px]"
              >
                <X size={14} strokeWidth={2.2} aria-hidden />
                Clear time
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "absolute z-[3] flex items-center gap-2",
            hero ? "top-[11px] right-3" : "top-[9px] right-2.5",
          )}
        >
          {showClear ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              title="Clear search"
              className={cn(
                "text-ink-3 hover:text-ink hover:bg-accent-soft flex cursor-pointer items-center justify-center rounded-full transition-colors duration-150",
                hero ? "size-8" : "size-7",
              )}
            >
              <X size={hero ? 17 : 15} strokeWidth={2.2} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={togglePicker("time")}
            aria-label="Choose a time"
            aria-expanded={picker === "time"}
            title="Choose a time"
            className={cn(
              "glass-card-flat flex cursor-pointer items-center justify-center rounded-full",
              currentTime ? "text-accent-strong border-accent-line" : "text-ink-2",
              hero ? "size-11" : "size-[38px]",
            )}
          >
            <Clock size={hero ? 18 : 16} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={togglePicker("cameras")}
            aria-label="Choose cameras"
            aria-expanded={picker === "cameras"}
            title="Choose cameras"
            className={cn(
              "glass-card-flat flex cursor-pointer items-center justify-center rounded-full",
              selectedCameras.length > 0 ? "text-accent-strong border-accent-line" : "text-ink-2",
              hero ? "size-11" : "size-[38px]",
            )}
          >
            <Cctv size={hero ? 18 : 16} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onSubmit}
            aria-label="Search"
            aria-busy={submitting || undefined}
            disabled={submitting}
            className={cn(
              "surface-action shadow-action flex cursor-pointer items-center justify-center rounded-full disabled:cursor-progress",
              hero ? "size-11" : "size-[38px]",
            )}
          >
            {submitting ? (
              <Loader2
                size={hero ? 19 : 17}
                strokeWidth={2.1}
                className="animate-spin"
                aria-hidden
              />
            ) : (
              <Search size={hero ? 19 : 17} strokeWidth={2.1} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
