"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { deleteSavedQuery, getSavedQueries } from "@/lib/api/endpoints";
import { useAppStore } from "@/store/useAppStore";
import type { SavedQuery } from "@/types";

type LoadStatus = "loading" | "ready" | "error";

/** Why a delete failed, in the investigator's terms. 404 never gets here: gone is gone. */
function deleteErrorMessage(reason: unknown): string {
  if (reason instanceof ApiError && (reason.status === 405 || reason.status === 501)) {
    return "Deleting saved queries isn't available yet — the backend doesn't support it.";
  }
  return `Couldn't delete this query${reason instanceof Error ? `: ${reason.message}` : "."}`;
}

export function SavedQueriesScreen() {
  const router = useRouter();
  const runSearch = useAppStore((state) => state.runSearch);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  // Bumped by "Retry" to re-run the fetch effect.
  const [attempt, setAttempt] = useState(0);
  /** Row awaiting "Confirm delete" — deleting is irreversible, so it takes two clicks. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteSavedQuery(id);
      setSavedQueries((rows) => rows.filter((row) => row.id !== id));
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 404) {
        setSavedQueries((rows) => rows.filter((row) => row.id !== id));
      } else {
        setDeleteError(deleteErrorMessage(reason));
      }
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getSavedQueries()
      .then((queries) => {
        if (cancelled) return;
        setSavedQueries(queries);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not load saved queries.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Saved Queries</h1>
      <p className="text-ink-2 mb-7 text-sm">Bookmarked searches for quick re-run.</p>

      {status === "loading" ? (
        <p aria-busy="true" className="text-ink-3 text-sm">
          Loading saved queries…
        </p>
      ) : null}

      {status === "error" ? (
        <div
          role="alert"
          className="rounded-card glass-card-flat flex items-center justify-between gap-4 px-[18px] py-4"
        >
          <p className="text-flag text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="glass-card-flat text-ink-2 hover:text-ink h-9 shrink-0 cursor-pointer rounded-full px-4 font-sans text-[13px] transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && savedQueries.length === 0 ? (
        <p className="text-ink-3 text-sm">
          No saved queries yet. Use the bookmark beside a query in Results to save it.
        </p>
      ) : null}

      {deleteError ? (
        <p role="alert" className="text-flag mb-3 text-sm">
          {deleteError}
        </p>
      ) : null}

      {status === "ready" && savedQueries.length > 0 ? (
        <ul className="flex list-none flex-col gap-3 p-0">
          {savedQueries.map((query) => (
            <li
              key={query.id}
              className="rounded-card glass-card-flat flex items-center justify-between px-[18px] py-4"
            >
              <div>
                <p className="text-ink mb-1 text-sm">{query.text}</p>
                <p className="text-ink-3 font-mono text-xs">
                  Saved {query.savedOn} · {query.hits} matches last run
                </p>
              </div>
              {confirmingId === query.id ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    disabled={deletingId === query.id}
                    className="glass-card-flat text-ink-2 hover:text-ink h-9 cursor-pointer rounded-full px-4 font-sans text-[13px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(query.id)}
                    disabled={deletingId === query.id}
                    className="text-flag border-flag/45 bg-flag/10 hover:bg-flag/20 h-9 cursor-pointer rounded-full border px-4 font-sans text-[13px] font-semibold disabled:opacity-60"
                  >
                    {deletingId === query.id ? "Deleting…" : "Confirm delete"}
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmingId(query.id);
                    }}
                    aria-label={`Delete "${query.text}"`}
                    title="Delete"
                    className="text-ink-3 hover:text-flag hover:bg-flag/10 flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-150"
                  >
                    <Trash2 size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void runSearch(query.text);
                      router.push("/results");
                    }}
                    className="surface-action shadow-action h-9 cursor-pointer rounded-full px-4 font-sans text-[13px]"
                  >
                    Run again
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
