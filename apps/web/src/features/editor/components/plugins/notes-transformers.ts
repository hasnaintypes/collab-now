import { $getRoot, type LexicalEditor } from "lexical";
import {
  HEADING,
  ORDERED_LIST,
  TEXT_FORMAT_TRANSFORMERS,
  UNORDERED_LIST,
} from "@lexical/markdown";

/**
 * Restricted Markdown-transformer set shared by `seed-notes-plugin.tsx`
 * (P1-8) and `seed-template-plugin.tsx` (P4-1) — headings, lists, and
 * text formatting (bold/italic/etc., which only flip flags on the
 * already-registered `TextNode`, no new node type needed). Deliberately
 * **not** `@lexical/markdown`'s full `TRANSFORMERS` set (which
 * `export-plugin.tsx` uses for export), since that includes quote/code/
 * link transformers that construct node types `editor.tsx` never
 * registers (`nodes: [HeadingNode, ListNode, ListItemNode]`) — Lexical
 * throws when a transformer tries to insert an unregistered node type.
 */
export const NOTES_TRANSFORMERS = [
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  ...TEXT_FORMAT_TRANSFORMERS,
];

/**
 * Shared "is this document still blank" check for both seeding plugins —
 * Lexical/Liveblocks' actual starting state is one empty paragraph, not
 * zero nodes. Kept in one place so a future change to what counts as
 * empty can't drift between `seed-notes-plugin.tsx` and
 * `seed-template-plugin.tsx`.
 */
export function isEditorEmpty(editor: LexicalEditor): boolean {
  return editor.getEditorState().read(() => {
    const root = $getRoot();
    const children = root.getChildren();
    return (
      children.length === 0 ||
      (children.length === 1 &&
        children[0]!.getType() === "paragraph" &&
        children[0]!.getTextContent() === "")
    );
  });
}
