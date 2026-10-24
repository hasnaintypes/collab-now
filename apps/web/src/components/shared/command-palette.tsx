"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getDocumentsForUser } from "@/features/documents/actions/room.actions";
import type { RoomDocument } from "@/features/documents/types";

const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 8;

/**
 * P4-2's Cmd/Ctrl+K document search palette. Reuses the exact same
 * `getDocumentsForUser({ search })` server action the dashboard's own
 * search box (`documents-section.tsx`) already calls — this is the same
 * search, just reachable from anywhere instead of only the dashboard.
 *
 * Mounted once in `(root)/layout.tsx` (which already has the signed-in
 * session) so the shortcut works on every page under that layout,
 * including inside an open document — not just the dashboard.
 */
export default function CommandPalette({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RoomDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Radix focuses the dialog panel itself on open; this grabs the
    // search input a tick later so typing starts immediately.
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  // Query/results state is reset from the handlers that actually change
  // `open`/`query` below (handleOpenChange, handleQueryChange) rather than
  // reactively in an effect — a bare setState at the top of an effect body
  // just to "reset on change" is what react-hooks/set-state-in-effect
  // flags, and doing it in the handler is both simpler and avoids an
  // extra render.
  useEffect(() => {
    if (!query.trim()) return;

    debounceRef.current = setTimeout(async () => {
      const result = await getDocumentsForUser(userId, {
        search: query.trim(),
        limit: RESULT_LIMIT,
      });
      setResults(result.success ? result.data.documents : []);
      setActiveIndex(0);
      setLoading(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, userId]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (value.trim()) {
      setLoading(true);
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setResults([]);
      setLoading(false);
    }
  }, []);

  const openDocument = useCallback(
    (roomId: string) => {
      setOpen(false);
      router.push(`/documents/${roomId}`);
    },
    [router]
  );

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) openDocument(selected.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Search documents</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search documents…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {!loading && query.trim() && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No documents found.
            </p>
          )}
          {!query.trim() && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type to search your documents.
            </p>
          )}
          {results.map((doc, index) => (
            <button
              key={doc.id}
              onClick={() => openDocument(doc.id)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex ? "bg-muted" : "hover:bg-muted"
              }`}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{doc.metadata.title}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
