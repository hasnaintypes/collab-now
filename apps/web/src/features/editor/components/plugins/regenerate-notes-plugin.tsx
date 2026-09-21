"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { $convertFromMarkdownString } from "@lexical/markdown";

import { NOTES_TRANSFORMERS } from "./notes-transformers";

/**
 * P2-2's client-side half of "switch note style": unlike
 * `seed-notes-plugin.tsx` (which only ever fills an *empty* room once),
 * this unconditionally clears and replaces the document's current content
 * — a deliberately destructive operation the UI (`NoteStylePicker`, in
 * `features/ingestion/components/`) gates behind a confirmation dialog
 * before ever calling it.
 *
 * `DocumentNavbar` (where the style picker lives) is a sibling of `Editor`,
 * not a descendant of its `LexicalComposer` — so it has no direct way to
 * call Lexical APIs. This uses the same ref-bridge pattern as
 * `export-plugin.tsx`'s `ExportBridge`: a plugin mounted *inside* the
 * composer populates a ref that a component *outside* it calls into.
 *
 * The resulting `editor.update()` call syncs to every connected client
 * automatically via the same Liveblocks Yjs `CollaborationPlugin` binding
 * that already propagates ordinary typing — no extra multi-client plumbing
 * needed here.
 */
export type RegenerateFunctions = {
  replaceContent: (markdown: string) => void;
};

export function RegenerateBridge({
  regenerateRef,
}: {
  regenerateRef: React.MutableRefObject<RegenerateFunctions | null>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    regenerateRef.current = {
      replaceContent: (markdown: string) => {
        editor.update(() => {
          $getRoot().clear();
          $convertFromMarkdownString(markdown, NOTES_TRANSFORMERS);
        });
      },
    };
  }, [editor, regenerateRef]);

  return null;
}
