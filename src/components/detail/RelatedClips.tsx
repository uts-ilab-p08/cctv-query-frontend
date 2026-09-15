import Link from "next/link";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { getThumbUrl } from "@/lib/clips";
import type { Clip } from "@/types";

interface RelatedClipsProps {
  clips: Clip[];
}

export function RelatedClips({ clips }: RelatedClipsProps) {
  return (
    <section>
      <SectionLabel className="mb-2.5">RELATED CLIPS</SectionLabel>
      <ul className="flex list-none gap-3 overflow-x-auto p-0 pb-1">
        {clips.map((clip) => (
          <li key={clip.id} className="shrink-0">
            <Link
              href={`/clips/${clip.id}`}
              className="rounded-chip glass-card-flat hover:border-hairline-strong block w-40 overflow-hidden no-underline transition-colors duration-150"
            >
              <span
                aria-hidden
                className="thumb-filter block h-[88px] bg-cover bg-center"
                style={{ backgroundImage: `url(${getThumbUrl(clip)})` }}
              />
              <span className="block px-2.5 py-2">
                <span className="text-ink block text-xs font-semibold">{clip.action}</span>
                <span className="text-ink-3 block font-mono text-[11px]">{clip.ts}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
