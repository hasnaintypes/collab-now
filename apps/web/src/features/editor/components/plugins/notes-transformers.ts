import {
  HEADING,
  ORDERED_LIST,
  TEXT_FORMAT_TRANSFORMERS,
  UNORDERED_LIST,
} from "@lexical/markdown";

/**
 * Shared by every plugin that imports Gemini-generated notes Markdown into
 * this editor (`seed-notes-plugin.tsx` for P1-8's first-open fill,
 * `regenerate-notes-plugin.tsx` for P2-2's style-switch replace).
 *
 * Deliberately **not** the full `TRANSFORMERS` set `export-plugin.tsx` uses
 * for export — that includes quote/code/link transformers that construct
 * `QuoteNode`/`CodeNode`/`LinkNode`, none of which are registered in this
 * editor's `nodes: [HeadingNode, ListNode, ListItemNode]` (`editor.tsx`).
 * Lexical throws when a transformer tries to insert an unregistered node
 * type, so this uses a restricted set matching exactly what's registered —
 * headings, lists, and text formatting (bold/italic/etc., which only flip
 * flags on the already-registered `TextNode`, no new node type needed).
 * Matches the same restriction `notes-generator.ts`'s prompts are held to
 * on the generation side.
 */
export const NOTES_TRANSFORMERS = [
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  ...TEXT_FORMAT_TRANSFORMERS,
];
