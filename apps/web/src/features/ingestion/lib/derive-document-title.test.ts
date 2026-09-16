import { describe, expect, it } from "vitest";
import { deriveDocumentTitle } from "./derive-document-title";

describe("deriveDocumentTitle", () => {
  it("prefers the article's own title when present", () => {
    expect(
      deriveDocumentTitle({
        articleTitle: "How Databases Actually Work",
        notes: "# A Different Heading\n- point",
      })
    ).toBe("How Databases Actually Work");
  });

  it("falls back to the first heading in the notes when there's no article title", () => {
    expect(
      deriveDocumentTitle({
        articleTitle: null,
        notes: "# The Video's Main Topic\n\n- point one\n- point two",
      })
    ).toBe("The Video's Main Topic");
  });

  it("ignores a blank/whitespace-only article title", () => {
    expect(
      deriveDocumentTitle({
        articleTitle: "   ",
        notes: "## Second-Level Heading\n- point",
      })
    ).toBe("Second-Level Heading");
  });

  it("falls back to a generic placeholder when neither is available", () => {
    expect(
      deriveDocumentTitle({ articleTitle: undefined, notes: "just bullet points, no heading" })
    ).toBe("Untitled document");
  });

  it("truncates an excessively long title", () => {
    const longTitle = "A".repeat(300);
    const title = deriveDocumentTitle({ articleTitle: longTitle, notes: "" });
    expect(title.length).toBe(200);
  });
});
