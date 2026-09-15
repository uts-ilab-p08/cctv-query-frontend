import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatCard } from "@/components/ui/StatCard";
import { cameraNames } from "@/data/cameras";
import { averageConfidenceLabel, reports } from "@/data/reports";
import { getAllClips } from "@/lib/clips";
import type { StatCardData } from "@/types";

export function ReportsScreen() {
  const clipCount = getAllClips().length;

  const stats: StatCardData[] = [
    { label: "EVENTS THIS WEEK", value: clipCount + 42 },
    { label: "ACTIVE CAMERAS", value: `${cameraNames.length} / ${cameraNames.length}` },
    { label: "AVG. CONFIDENCE", value: averageConfidenceLabel },
    { label: "REPORTS GENERATED", value: reports.length },
  ];

  return (
    <div className="mx-auto w-full max-w-[900px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Reports</h1>
      <p className="text-ink-2 mb-7 text-sm">
        Generated activity summaries across the camera network.
      </p>

      <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <SectionLabel>RECENT REPORTS</SectionLabel>
      <ul className="flex list-none flex-col gap-2.5 p-0">
        {reports.map((report) => (
          <li
            key={report.id}
            className="rounded-card glass-card-flat flex items-center justify-between px-[18px] py-4"
          >
            <div>
              <p className="text-ink mb-1 text-sm">{report.title}</p>
              <p className="text-ink-3 font-mono text-xs">
                {report.range} · {report.cameras} cameras
              </p>
            </div>
            <span className="text-ink-2 shrink-0 font-mono text-xs">{report.generatedOn}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
