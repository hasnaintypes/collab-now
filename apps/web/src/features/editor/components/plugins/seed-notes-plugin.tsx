"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { RefreshCw } from "lucide-react";

import { getGeneratedNotesForDocument } from "@/features/ingestion/actions/ingestion.actions";
import { NOTES_TRANSFORMERS, isEditorEmpty } from "./notes-transformers";

/**
 * Client-side content-seeding (P1-8) — the piece `process-ingestion-job.ts`
 * (P1-7) deliberately left for here: a document created from a completed
 * ingestion job starts with an *empty* Liveblocks room, same as a manual
 * "New Document," because there's no supported way to seed Yjs-backed
 * Lexical room content from the server. This plugin fills it in the first
 * time the document is actually opened.
 *
 * Deliberately **not** the full `TRANSFORMERS` set `export-plugin.tsx` uses
 * for export — that includes quote/code/link transformers that construct
 * `QuoteNode`/`CodeNode`/`LinkNode`, none of which are registered in this
 * editor's `nodes: [HeadingNode, ListNode, ListItemNode]` (`editor.tsx`).
 * Lexical throws when a transformer tries to insert an unregistered node
 * type, so this uses a restricted set matching exactly what's registered —
 * headings, lists, and text formatting (bold/italic/etc., which only flip
 * flags on the already-registered `TextNode`, no new node type needed).
 *
 * "Already seeded" guard: this only runs when the editor is empty (Lexical/
 * Liveblocks' actual starting state — one empty paragraph). Once seeded,
 * the room is never empty again for any future viewer, so this naturally
 * doesn't re-run — except in the edge case of a user deleting all content
 * back down to empty and reloading, which would re-seed from the original
 * notes. Accepted for now rather than adding a `source_content` column to
 * track "already seeded" explicitly; revisit if that turns out to matter.
 *
 * Failure handling: `getGeneratedNotesForDocument` already retries a
 * transient DB failure server-side, but if it still comes back
 * unsuccessful (or the call itself rejects — a dropped connection mid
 * request), this used to just give up silently, leaving the document
 * permanently blank with no indication anything went wrong. Now it shows
 * a dismissible banner with a manual retry instead.
 */

export default function SeedNotesPlugin({ roomId }: { roomId: string }) {
  const [editor] = useLexicalComposerContext();
  const attempted = useRef(false);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const attemptSeed = useCallback(() => {
    if (!isEditorEmpty(editor)) return;

    let cancelled = false;

    getGeneratedNotesForDocument({ roomId })
      .then((result) => {
        if (cancelled) return;
        if (!result.success || !result.data) {
          setFailed(true);
          return;
        }

        editor.update(() => {
          // Clear the default empty paragraph before importing —
          // otherwise the notes get inserted after a leading blank line.
          $getRoot().clear();
          $convertFromMarkdownString(result.data!.notes, NOTES_TRANSFORMERS);
        });
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setRetrying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editor, roomId]);

  useEffect(() => {
    // Guards against re-running on unrelated re-renders within the same
    // mount — this is a one-shot check per document view, not a subscription.
    if (attempted.current) return;
    attempted.current = true;
    return attemptSeed();
  }, [attemptSeed]);

  if (!failed) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-sm border border-destructive/30 bg-background px-3.5 py-2 text-sm shadow-md"
    >
      <span>Couldn&apos;t load this document&apos;s generated notes.</span>
      <button
        type="button"
        onClick={() => {
          setRetrying(true);
          attemptSeed();
        }}
        disabled={retrying}
        className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${retrying ? "animate-spin" : ""}`} />
        Retry
      </button>
    </div>
  );
}
