"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type LoadState = "loading" | "loaded" | "error";

interface ThumbnailProps {
  /** The backend's `thumbnail_url`. Without one, only the gray placeholder shows. */
  src?: string;
  className?: string;
  /** Extra classes for the image itself, e.g. `thumb-filter` or `object-contain`. */
  imgClassName?: string;
}

/**
 * A footage thumbnail on a flat gray placeholder. The backend may generate the
 * image on first request, so it can take a while: a spinner shows until it loads,
 * then it fades in. On failure the placeholder simply stays. Fills its parent,
 * which must be positioned.
 */
export function Thumbnail({ src, className, imgClassName }: ThumbnailProps) {
  const [state, setState] = useState<LoadState>("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // A cached image can finish before React attaches onLoad.
    const img = imgRef.current;
    setState(img?.complete && img.naturalWidth > 0 ? "loaded" : "loading");
  }, [src]);

  return (
    <div
      aria-hidden={state !== "loading"}
      className={cn("bg-video-bar absolute inset-0", className)}
    >
      {src && state !== "error" ? (
        // A plain <img>, not next/image: thumbnails come from backend/storage hosts
        // that aren't known at build time, and we need raw load/error events.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt=""
          decoding="async"
          loading="lazy"
          data-loaded={state === "loaded"}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            state === "loaded" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      ) : null}
      {src && state === "loading" ? (
        <span
          role="status"
          aria-label="Loading thumbnail"
          className="absolute inset-0 flex items-center justify-center text-white/60"
        >
          <Loader2 size={18} strokeWidth={2} className="animate-spin" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
