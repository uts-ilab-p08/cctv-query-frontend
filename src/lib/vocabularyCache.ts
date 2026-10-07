"use client";

import { useEffect, useState } from "react";

import { getVocabulary } from "@/lib/api/endpoints";
import type { Vocabulary } from "@/types";

// `GET /vocabulary`, kept in localStorage: the first search field after signing in (Home)
// loads it, and every field after reads it from here, so underlining is right from the
// first keystroke. A day-old copy is refreshed in the background, so a newly indexed day
// or location reaches a long session, and signing out clears it (see Sidebar).

/** localStorage key holding `{ savedAt, vocabulary }`. */
export const VOCABULARY_STORAGE_KEY = "cctv-ai:vocabulary";

/** How long a stored copy is used without asking the backend again. */
export const VOCABULARY_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredVocabulary {
  vocabulary: Vocabulary;
  /** False once older than `VOCABULARY_TTL_MS`: still shown, but refreshed. */
  fresh: boolean;
}

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function isVocabulary(value: unknown): value is Vocabulary {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isStrings(v.scenes) &&
    isStrings(v.cameras) &&
    isStrings(v.dates) &&
    typeof v.synonyms === "object" &&
    v.synonyms !== null &&
    isStrings(Object.values(v.synonyms))
  );
}

/** The stored copy, or null when there is none, it is unreadable, or storage is blocked. */
export function readVocabulary(now = Date.now()): StoredVocabulary | null {
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    if (!raw) return null;
    const { savedAt, vocabulary } = JSON.parse(raw) as { savedAt?: unknown; vocabulary?: unknown };
    if (typeof savedAt !== "number" || !isVocabulary(vocabulary)) return null;
    return { vocabulary, fresh: now - savedAt < VOCABULARY_TTL_MS };
  } catch {
    return null;
  }
}

function writeVocabulary(vocabulary: Vocabulary, now: number): void {
  try {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify({ savedAt: now, vocabulary }));
  } catch {
    // Storage full or blocked: the copy in memory still serves this page.
  }
}

/** Forget the stored copy, so the next sign-in loads it fresh. */
export function clearVocabulary(): void {
  try {
    localStorage.removeItem(VOCABULARY_STORAGE_KEY);
  } catch {
    // Nothing stored, or storage blocked.
  }
}

/** One request at a time, however many fields mount together. */
let inFlight: Promise<Vocabulary | null> | null = null;

/**
 * A fresh stored copy, else the backend's (stored for next time). When the backend fails
 * the stale copy, if any, still serves; null means there is nothing to offer, and the
 * field falls back to its built-in words.
 */
export function loadVocabulary(now = Date.now()): Promise<Vocabulary | null> {
  const stored = readVocabulary(now);
  if (stored?.fresh) return Promise.resolve(stored.vocabulary);
  inFlight ??= getVocabulary()
    .then((vocabulary) => {
      writeVocabulary(vocabulary, now);
      return vocabulary;
    })
    .catch(() => stored?.vocabulary ?? null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * The vocabulary for a search field: null on the first render (as on the server, so
 * hydration matches), then the stored copy, then a refreshed one if it was stale.
 */
export function useVocabulary(): Vocabulary | null {
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const show = (next: Vocabulary | null) => {
      if (!cancelled && next) setVocabulary(next);
    };
    // A fresh copy resolves at once, with no request. A stale one is shown while the
    // refresh runs, then replaced.
    const stored = readVocabulary();
    if (stored && !stored.fresh) void Promise.resolve(stored.vocabulary).then(show);
    void loadVocabulary().then(show);
    return () => {
      cancelled = true;
    };
  }, []);

  return vocabulary;
}
