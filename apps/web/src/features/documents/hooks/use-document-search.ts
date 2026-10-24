"use client";

import { useCallback, useEffect, useState } from "react";
import { getDocumentsForUser } from "../actions/room.actions";
import type { DocumentFilter, RoomDocument } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Shared debounced document search, backing both `documents-section.tsx`'s
 * search box and `command-palette.tsx`'s Cmd/Ctrl+K search (P4-2) — these
 * started as two separate inline implementations that would have silently
 * drifted from each other, so this is the one place the debounce/race
 * handling lives.
 *
 * `results`/`loading` deliberately aren't reset back to `null`/`false`
 * reactively when `debouncedQuery` becomes empty — a caller should gate
 * display on `debouncedQuery` being truthy (same as the UI already did
 * before this was extracted), not on `results` alone, so there's nothing
 * to reset. Avoiding that reset also sidesteps `react-hooks/
 * set-state-in-effect`'s objection to a bare setState-then-return at the
 * top of an effect body purely to mirror a derived condition.
 */
export function useDocumentSearch(
  userId: string,
  options: { filter?: DocumentFilter; limit?: number } = {}
) {
  const { filter, limit } = options;
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<RoomDocument[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Flips `loading` on immediately, from the input's own onChange handler
  // rather than reactively inside the effect below — a bare `setLoading(true)`
  // sitting in that effect's body (not inside its async callback) is exactly
  // what `react-hooks/set-state-in-effect` flags.
  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (value.trim()) setLoading(true);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) return;

    // Guards against an in-flight request for an *earlier* query resolving
    // after a later one and overwriting its results — `clearTimeout` above
    // only ever cancels a still-pending debounce timer, not a request
    // that's already left for the server, so this is the actual fix for
    // that race, not just the debounce.
    let cancelled = false;

    getDocumentsForUser(userId, { filter, search: trimmed, limit }).then(
      (result) => {
        if (cancelled) return;
        setResults(result.success ? result.data.documents : []);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [debouncedQuery, userId, filter, limit]);

  return { query, setQuery, debouncedQuery, results, setResults, loading };
}
