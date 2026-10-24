import { describe, expect, it } from "vitest";
import { DOCUMENT_TEMPLATES, isDocumentTemplateId } from "./document-templates";

// Markdown restricted to exactly what seed-template-plugin.tsx's shared
// NOTES_TRANSFORMERS set (headings/lists/text-formatting) can import —
// the same restriction seed-notes-plugin.tsx documents and relies on.
// A table, blockquote, code fence, or link here would either be silently
// dropped or throw when converted, so this is a real regression guard,
// not just a style check.
const DISALLOWED_MARKDOWN = /(^|\n)(>|```|\|.*\|)|\[[^\]]+\]\([^)]+\)/;

describe("DOCUMENT_TEMPLATES", () => {
  it("only uses headings, lists, and plain text — no tables/quotes/code/links", () => {
    for (const template of Object.values(DOCUMENT_TEMPLATES)) {
      expect(template.content).not.toMatch(DISALLOWED_MARKDOWN);
    }
  });

  it("gives every template a non-empty label, description, and content", () => {
    for (const template of Object.values(DOCUMENT_TEMPLATES)) {
      expect(template.label.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.content.length).toBeGreaterThan(0);
    }
  });

  it("keys every entry by its own id", () => {
    for (const [key, template] of Object.entries(DOCUMENT_TEMPLATES)) {
      expect(template.id).toBe(key);
    }
  });
});

describe("isDocumentTemplateId", () => {
  it("accepts every real template id", () => {
    for (const id of Object.keys(DOCUMENT_TEMPLATES)) {
      expect(isDocumentTemplateId(id)).toBe(true);
    }
  });

  it("rejects an unrecognized string", () => {
    expect(isDocumentTemplateId("not-a-template")).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isDocumentTemplateId(null)).toBe(false);
    expect(isDocumentTemplateId(undefined)).toBe(false);
  });
});
