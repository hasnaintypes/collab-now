import { describe, expect, it, vi } from "vitest";
import {
  actionSuccess,
  actionError,
  ActionError,
  safeAction,
} from "./action-result";

describe("actionSuccess / actionError", () => {
  it("builds a success result", () => {
    expect(actionSuccess({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });

  it("builds an error result, optionally with retryAfterSeconds", () => {
    expect(actionError("nope")).toEqual({ success: false, error: "nope" });
    expect(actionError("slow down", 30)).toEqual({
      success: false,
      error: "slow down",
      retryAfterSeconds: 30,
    });
  });
});

describe("safeAction", () => {
  it("resolves to a success result when the function resolves normally", async () => {
    const result = await safeAction(async () => "ok");
    expect(result).toEqual({ success: true, data: "ok" });
  });

  it("surfaces an ActionError's message as-is to the client", async () => {
    const result = await safeAction(async () => {
      throw new ActionError("You cannot remove yourself from the document.");
    });
    expect(result).toEqual({
      success: false,
      error: "You cannot remove yourself from the document.",
    });
  });

  it("replaces an unexpected error with the fallback message and logs it server-side", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const dbError = new Error("connection terminated unexpectedly");

    const result = await safeAction(
      async () => {
        throw dbError;
      },
      "Something went wrong. Please try again."
    );

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(dbError);
    consoleError.mockRestore();
  });

  it("uses the default fallback message when none is provided", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await safeAction(async () => {
      throw new Error("boom");
    });
    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    vi.restoreAllMocks();
  });

  it("lets Next.js control-flow errors (redirect/notFound) propagate instead of being caught", async () => {
    // Mirrors the shape of the error `redirect()`/`notFound()` throw —
    // `unstable_rethrow` (used internally by `safeAction`) detects this
    // `digest` and rethrows it untouched rather than treating it as a
    // failure.
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });

    await expect(
      safeAction(async () => {
        throw redirectError;
      })
    ).rejects.toBe(redirectError);
  });
});
