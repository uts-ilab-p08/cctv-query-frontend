"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cameraNames } from "@/data/cameras";
import { useAppStore } from "@/lib/store";

const breadcrumbs: Array<{ prefix: string; label: string }> = [
  { prefix: "/dashboard", label: "Query" },
  { prefix: "/results", label: "Results" },
  { prefix: "/clips", label: "Clip Detail" },
  { prefix: "/saved", label: "Saved Queries" },
  { prefix: "/reports", label: "Reports" },
  { prefix: "/pipeline", label: "Annotation Pipeline" },
];

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const setOpenModal = useAppStore((state) => state.setOpenModal);

  const breadcrumb =
    breadcrumbs.find((entry) => pathname.startsWith(entry.prefix))?.label ?? "Query";
  const showBack = !pathname.startsWith("/dashboard");

  return (
    <header className="border-border/80 sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-white/72 px-8 backdrop-blur-[18px]">
      <div className="flex items-center gap-3.5">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="border-border text-ink-muted hover:text-ink flex cursor-pointer items-center gap-1.5 rounded-lg border bg-white/70 px-3 py-1.5 text-[13px] transition-colors duration-150 hover:bg-white"
          >
            <ArrowLeft size={14} aria-hidden />
            Back
          </button>
        ) : null}
        <h1 className="text-[15px] font-semibold">{breadcrumb}</h1>
      </div>

      <button
        type="button"
        onClick={() => setOpenModal("cameras")}
        className="text-ink-muted hover:text-ink flex cursor-pointer items-center gap-2 font-mono text-xs transition-colors duration-150"
      >
        <span aria-hidden className="bg-indigo-strong h-[7px] w-[7px] rounded-full" />
        Archived footage · {cameraNames.length} cameras indexed
      </button>
    </header>
  );
}
