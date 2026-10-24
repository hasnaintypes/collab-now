/**
 * P4-1 / PRD GAP.md "pre-filled document starters". Each template's
 * `content` is plain Markdown restricted to headings, lists, and
 * bold/italic text only — the same restriction `seed-notes-plugin.tsx`
 * (P1-8) documents and enforces, since `editor.tsx` only registers
 * `HeadingNode`/`ListNode`/`ListItemNode` (`nodes: [...]`). A table,
 * blockquote, code block, or link in a template's Markdown would either
 * be silently dropped or throw when imported — see that plugin's own
 * comment for why.
 *
 * `seed-template-plugin.tsx` is the client-side half that actually
 * converts this into editor content, the same "there's no supported way
 * to seed Yjs-backed Lexical content from the server" constraint P1-8
 * already worked around.
 */

export type DocumentTemplateId =
  | "meeting-notes"
  | "project-brief"
  | "weekly-status"
  | "reading-notes";

export type DocumentTemplate = {
  id: DocumentTemplateId;
  label: string;
  description: string;
  content: string;
};

export const DOCUMENT_TEMPLATES: Record<DocumentTemplateId, DocumentTemplate> = {
  "meeting-notes": {
    id: "meeting-notes",
    label: "Meeting Notes",
    description: "Attendees, agenda, decisions, and action items.",
    content:
      "# Meeting Notes\n\n" +
      "## Attendees\n\n" +
      "- \n\n" +
      "## Agenda\n\n" +
      "1. \n\n" +
      "## Discussion\n\n" +
      "- \n\n" +
      "## Decisions\n\n" +
      "- \n\n" +
      "## Action Items\n\n" +
      "- \n",
  },
  "project-brief": {
    id: "project-brief",
    label: "Project Brief",
    description: "Problem, goals, scope, and timeline for a new project.",
    content:
      "# Project Brief\n\n" +
      "## Problem\n\n" +
      "*What are we solving, and for whom?*\n\n" +
      "## Goals\n\n" +
      "- \n\n" +
      "## Non-Goals\n\n" +
      "- \n\n" +
      "## Scope\n\n" +
      "- \n\n" +
      "## Timeline\n\n" +
      "- \n\n" +
      "## Open Questions\n\n" +
      "- \n",
  },
  "weekly-status": {
    id: "weekly-status",
    label: "Weekly Status Update",
    description: "What shipped, what's in progress, and what's blocked.",
    content:
      "# Weekly Status Update\n\n" +
      "## Shipped\n\n" +
      "- \n\n" +
      "## In Progress\n\n" +
      "- \n\n" +
      "## Blocked\n\n" +
      "- \n\n" +
      "## Next Week\n\n" +
      "- \n",
  },
  "reading-notes": {
    id: "reading-notes",
    label: "Reading / Research Notes",
    description: "Source, key takeaways, quotes, and your own thoughts.",
    content:
      "# Reading Notes\n\n" +
      "## Source\n\n" +
      "*Title, author, link.*\n\n" +
      "## Key Takeaways\n\n" +
      "- \n\n" +
      "## Notable Quotes\n\n" +
      "- \n\n" +
      "## My Thoughts\n\n" +
      "- \n",
  },
};

export function isDocumentTemplateId(
  value: string | undefined | null
): value is DocumentTemplateId {
  return typeof value === "string" && value in DOCUMENT_TEMPLATES;
}
