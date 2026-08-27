import { ClipCard } from "@/components/results/ClipCard";
import type { Clip } from "@/types";

interface ClipGridProps {
  clips: Clip[];
}

export function ClipGrid({ clips }: ClipGridProps) {
  return (
    <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px] p-0">
      {clips.map((clip) => (
        <li key={clip.id}>
          <ClipCard clip={clip} />
        </li>
      ))}
    </ul>
  );
}
