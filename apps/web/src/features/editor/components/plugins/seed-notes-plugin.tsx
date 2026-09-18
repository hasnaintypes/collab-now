"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import {
  $convertFromMarkdownString,
  HEADING,
  ORDERED_LIST,
  TEXT_FORMAT_TRANSFORMERS,
  UNORDERED_LIST,
} from "@lexical/markdown";

import { getGeneratedNotesForDocument } from "@/features/ingestion/actions/ingestion.actions";

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
 */
const NOTES_TRANSFORMERS = [
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  ...TEXT_FORMAT_TRANSFORMERS,
];

export default function SeedNotesPlugin({ roomId }: { roomId: string }) {
  const [editor] = useLexicalComposerContext();
  const attempted = useRef(false);

  useEffect(() => {
    // Guards against re-running on unrelated re-renders within the same
    // mount — this is a one-shot check per document view, not a subscription.
    if (attempted.current) return;
    attempted.current = true;

    const isEmpty = editor.getEditorState().read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      return (
        children.length === 0 ||
        (children.length === 1 &&
          children[0]!.getType() === "paragraph" &&
          children[0]!.getTextContent() === "")
      );
    });

    if (!isEmpty) return;

    let cancelled = false;

    getGeneratedNotesForDocument({ roomId }).then((result) => {
      if (cancelled || !result.success || !result.data) return;

      editor.update(() => {
        // Clear the default empty paragraph before importing — otherwise
        // the notes get inserted after a leading blank line.
        $getRoot().clear();
        $convertFromMarkdownString(result.data!.notes, NOTES_TRANSFORMERS);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [editor, roomId]);

  return null;
}
