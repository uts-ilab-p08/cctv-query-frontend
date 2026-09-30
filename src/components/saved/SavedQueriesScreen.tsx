"use client";

import { Bookmark, Loader2, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { QueryListSkeleton } from "@/components/ui/QueryListSkeleton";
import { ApiError } from "@/lib/api/client";
import { deleteSavedQuery, getSavedQueries } from "@/lib/api/endpoints";
import { EXAMPLE_QUESTIONS } from "@/lib/exampleQuestions";
import { resultsHref } from "@/lib/routes";
import { useAppStore } from "@/store/useAppStore";
import type { SavedQuery } from "@/types";

type LoadStatus = "loading" | "ready" | "error";

/** Why a delete failed, in the investigator's terms. 404 never gets here: gone is gone. */
function deleteErrorMessage(reason: unknown): string {
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
  /** Row whose "Run again" was clicked: it spins until Results replaces this page, and
   *  every other run waits, so a double click can't start two searches. */
  const [runningId, setRunningId] = useState<string | null>(null);

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
        <QueryListSkeleton label="Loading saved queries" detailed className="gap-3" />
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

      {status === "ready" && savedQueries.length === 0 ? <EmptySavedQueries /> : null}

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
                      if (runningId) return;
                      setRunningId(query.id);
                      void runSearch(query.text);
                      router.push(resultsHref(query.text));
                    }}
                    aria-busy={runningId === query.id || undefined}
                    disabled={runningId !== null}
                    className="surface-action shadow-action flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 font-sans text-[13px] disabled:cursor-progress disabled:opacity-70 aria-busy:opacity-100"
                  >
                    {runningId === query.id ? (
                      <Loader2 size={14} strokeWidth={2.2} className="animate-spin" aria-hidden />
                    ) : null}
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

/**
 * Nothing saved yet: say what saving is for, show where the bookmark sits (a replica of a
 * question bubble in Results), and offer a way in: a new search or a ready-made one.
 */
function EmptySavedQueries() {
  return (
    <section
      aria-labelledby="saved-empty-title"
      className="flex flex-col items-center px-6 py-10 text-center"
    >
      <span
        aria-hidden
        className="border-accent-line bg-accent-soft text-accent-strong mb-5 flex size-14 items-center justify-center rounded-full border"
      >
        <Bookmark size={24} strokeWidth={1.8} />
      </span>
      <h2 id="saved-empty-title" className="text-ink mb-2 text-[20px] font-semibold">
        No saved queries yet
      </h2>
      <p
        className="text-ink-2 mb-6 max-w-[46ch] text-[14px] leading-[1.6]"
        style={{ textWrap: "pretty" }}
      >
        Save the searches you run often and re-run them in one click. In Results, use the bookmark
        next to your question.
      </p>

      {/* Where to look: the bookmark beside the question bubble, as it appears in Results. */}
      <div aria-hidden className="mb-7 flex items-center gap-2">
        <Bookmark size={16} strokeWidth={2} className="text-accent-strong shrink-0" />
        <span className="surface-chat-user border-accent-line text-ink rounded-[10px] rounded-br-none border px-3 py-2 text-[13px]">
          {EXAMPLE_QUESTIONS[0]}
        </span>
      </div>

      <Link
        href="/dashboard"
        className="surface-action shadow-action mb-8 inline-flex h-10 items-center gap-2 rounded-full px-5 text-[14px] font-semibold no-underline"
      >
        <Search size={15} strokeWidth={2.2} aria-hidden />
        Start a search
      </Link>

      <p className="text-ink-3 mb-2.5 font-mono text-[11px] tracking-[1.2px]">
        OR TRY ONE OF THESE
      </p>
      <ul
        aria-label="Example searches"
        className="flex list-none flex-wrap justify-center gap-2 p-0"
      >
        {EXAMPLE_QUESTIONS.slice(0, 3).map((question) => (
          <li key={question}>
            <Link
              href={resultsHref(question)}
              className="border-hairline text-ink-2 hover:border-accent-line hover:text-ink inline-block rounded-full border px-3 py-1.5 text-[13px] no-underline transition-colors duration-150"
            >
              {question}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
