"use client";

import { Modal } from "@/components/ui/Modal";
import { precincts } from "@/data/precincts";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/lib/store";
import type { SearchMode } from "@/types";

interface ModeOption {
  value: SearchMode;
  title: string;
  description: string;
}

const modeOptions: ModeOption[] = [
  {
    value: "nlq",
    title: "Natural language query",
    description:
      "Type freely — the assistant detects keywords and surfaces filters inline as you type.",
  },
  {
    value: "classic",
    title: "Classic filters",
    description:
      "Use the Filters button to set camera, date range, confidence and event type manually.",
  },
];

export function SettingsModal() {
  const openModal = useAppStore((state) => state.openModal);
  const setOpenModal = useAppStore((state) => state.setOpenModal);
  const searchMode = useAppStore((state) => state.searchMode);
  const setSearchMode = useAppStore((state) => state.setSearchMode);
  const selectedPrecinct = useAppStore((state) => state.selectedPrecinct);
  const setSelectedPrecinct = useAppStore((state) => state.setSelectedPrecinct);

  const close = () => setOpenModal(null);

  return (
    <Modal
      open={openModal === "settings"}
      onClose={close}
      title="Search settings"
      description="Choose how you search the camera network."
      width={440}
    >
      <div role="radiogroup" aria-label="Search mode" className="flex flex-col gap-2.5">
        {modeOptions.map((option) => {
          const active = searchMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSearchMode(option.value)}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3.5 text-left transition-colors duration-150",
                active ? "border-indigo-strong bg-indigo-wash" : "border-border bg-transparent",
              )}
            >
              <span
                aria-hidden
                className="border-indigo-strong mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
              >
                {active ? <span className="bg-indigo-strong h-2 w-2 rounded-full" /> : null}
              </span>
              <span>
                <span className="mb-[3px] block text-sm font-semibold">{option.title}</span>
                <span className="text-ink-muted block text-xs">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-border mt-[22px] border-t pt-[18px]">
        <p className="text-ink-muted mb-2.5 text-xs">
          Precinct — which camera network you&apos;re querying.
        </p>
        <div role="radiogroup" aria-label="Precinct" className="flex flex-wrap gap-2">
          {precincts.map((precinct) => {
            const active = selectedPrecinct === precinct;
            return (
              <button
                key={precinct}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedPrecinct(precinct)}
                className={cn(
                  "cursor-pointer rounded-md border px-3.5 py-2 font-sans text-[13px] transition-colors duration-150",
                  active
                    ? "border-indigo-strong bg-indigo-wash text-indigo-strong"
                    : "border-border-input text-ink-muted hover:text-ink bg-white",
                )}
              >
                {precinct}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
