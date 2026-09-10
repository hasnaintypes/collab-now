import { GoogleGenAI } from "@google/genai";

/**
 * Server-only Gemini client wrapper. `GEMINI_API_KEY` is never read until
 * first use (same lazy-init `Proxy` pattern as `liveblocks.ts`), so importing
 * this module doesn't blow up in contexts where the env var isn't set yet
 * (e.g. build time, or tests that mock this module entirely).
 *
 * Not wired to any feature yet — this exists so Phase 1 notes-generation
 * work (P1-6) has a starting point. See docs/ROADMAP.md P0-14.
 */
let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to apps/web/.env (see .env.example)."
      );
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

/** Default text model — see docs/ROADMAP.md P1-6 for where this gets used. */
export const GEMINI_DEFAULT_MODEL = "gemini-3-flash-preview";

/**
 * Minimal single-call wrapper: send a prompt, get back plain text.
 * Intentionally thin — real ingestion/notes-generation logic (P1-6) will
 * likely need a richer wrapper (system instructions, structured output,
 * etc.) built on top of this rather than growing this function in place.
 */
export async function generateText(
  prompt: string,
  model: string = GEMINI_DEFAULT_MODEL
): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}
