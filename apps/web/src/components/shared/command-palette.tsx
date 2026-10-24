"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDocumentSearch } from "@/features/documents/hooks/use-document-search";

const RESULT_LIMIT = 8;

/**
 * P4-2's Cmd/Ctrl+K document search palette. Shares `useDocumentSearch`
 * with `documents-section.tsx`'s own search box — this is the same debounced
 * search (and the same race-condition handling), reachable from anywhere
 * instead of only the dashboard.
 *
 * Mounted once in `(root)/layout.tsx` (which already has the signed-in
 * session) so the shortcut works on every page under that layout,
 * including inside an open document — not just the dashboard.
 */
export default function CommandPalette({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, setQuery, debouncedQuery, results, loading } =
    useDocumentSearch(userId, { limit: RESULT_LIMIT });
  const displayed = debouncedQuery.trim() ? results ?? [] : [];

  // The single path every close goes through — Escape/outside-click (via
  // Radix's onOpenChange), the Cmd/Ctrl+K toggle below, and selecting a
  // result (openDocument below) all call this, so the query/selection
  // always actually resets instead of only resetting on some close paths
  // and leaving stale state behind for the next open.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        setQuery("");
        setActiveIndex(0);
      }
    },
    [setQuery]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleOpenChange]);

  useEffect(() => {
    if (!open) return;
    // Radix focuses the dialog panel itself on open; this grabs the
    // search input a tick later so typing starts immediately.
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  const openDocument = useCallback(
    (roomId: string) => {
      handleOpenChange(false);
      router.push(`/documents/${roomId}`);
    },
    [handleOpenChange, router]
  );

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (displayed.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % displayed.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + displayed.length) % displayed.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = displayed[activeIndex];
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
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search documents…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {!loading && debouncedQuery.trim() && displayed.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No documents found.
            </p>
          )}
          {!debouncedQuery.trim() && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type to search your documents.
            </p>
          )}
          {displayed.map((doc, index) => (
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
