"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { $convertFromMarkdownString } from "@lexical/markdown";

import {
  DOCUMENT_TEMPLATES,
  isDocumentTemplateId,
} from "@/features/documents/lib/document-templates";
import { NOTES_TRANSFORMERS } from "./notes-transformers";

/**
 * Client-side content-seeding for P4-1's document templates — the exact
 * same mechanism `seed-notes-plugin.tsx` (P1-8) uses for ingestion-derived
 * notes, for the same reason: a document's Liveblocks room always starts
 * *empty*, and there's no supported way to seed Yjs-backed Lexical content
 * from the server. `createDocument` (`room.actions.ts`) stores the chosen
 * template's id in the room's own metadata; this plugin converts that
 * template's Markdown into real editor content the first time the
 * document is actually opened.
 *
 * Shares `NOTES_TRANSFORMERS` (restricted to headings/lists/text
 * formatting — everything `editor.tsx`'s registered node set supports)
 * with `seed-notes-plugin.tsx` rather than keeping its own copy, since
 * both plugins are seeding into the exact same editor configuration.
 */
export default function SeedTemplatePlugin({
  templateId,
}: {
  templateId?: string;
}) {
  const [editor] = useLexicalComposerContext();
  const attempted = useRef(false);

  useEffect(() => {
    // One-shot per document view, same guard as seed-notes-plugin.tsx.
    if (attempted.current) return;
    attempted.current = true;

    if (!isDocumentTemplateId(templateId)) return;

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

    const template = DOCUMENT_TEMPLATES[templateId];
    editor.update(() => {
      // Clear the default empty paragraph before importing — otherwise
      // the template content gets inserted after a leading blank line.
      $getRoot().clear();
      $convertFromMarkdownString(template.content, NOTES_TRANSFORMERS);
    });
  }, [editor, templateId]);

  return null;
}
