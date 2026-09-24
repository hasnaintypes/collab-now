import { describe, expect, it, vi, beforeEach } from "vitest";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));
vi.mock("@/lib/gemini", () => ({ generateText: generateTextMock }));

const { answerQuestionFromChunks } = await import("./document-chat");

beforeEach(() => {
  generateTextMock.mockReset().mockResolvedValue("  the answer.  ");
});

describe("answerQuestionFromChunks", () => {
  it("builds a prompt restricted to the given chunks and returns the trimmed answer", async () => {
    const result = await answerQuestionFromChunks({
      chunks: ["chunk one text", "chunk two text"],
      question: "What happens at the end?",
    });

    expect(result).toBe("the answer.");
    expect(generateTextMock).toHaveBeenCalledTimes(1);

    const prompt = generateTextMock.mock.calls[0]![0] as string;
    expect(prompt).toContain("chunk one text");
    expect(prompt).toContain("chunk two text");
    expect(prompt).toContain("What happens at the end?");
    expect(prompt).toMatch(/ONLY/);
    expect(prompt).toMatch(/never reference any other document/i);
  });

  it("never includes chunks it wasn't given", async () => {
    await answerQuestionFromChunks({
      chunks: ["this document's own chunk"],
      question: "q",
    });

    const prompt = generateTextMock.mock.calls[0]![0] as string;
    expect(prompt).not.toContain("some other document's chunk");
  });

  it("propagates errors from generateText as-is", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("Gemini returned an empty response."));

    await expect(
      answerQuestionFromChunks({ chunks: ["a"], question: "q" })
    ).rejects.toThrow(/empty response/);
  });
});
