import { generateText } from "@/lib/gemini";
import type { SupportedLanguage } from "./source-validator";

/**
 * Gemini-based notes generation (P1-6 / PRD FR-8). Ships with exactly one
 * note style for the MVP — Bullet/Outline Summary, per docs/ROADMAP.md
 * P1-6 ("simplest to validate quality against, and useful for both video
 * and article sources"). A single Gemini call handles translation (if the
 * source is Hindi/Urdu) and summarization together — output is always
 * English regardless of source language, per FR-8.
 *
 * Deliberately thin: builds one prompt combining the fixed style
 * instructions with the source text, and calls the P0-14 Gemini wrapper's
 * `generateText` as-is rather than extending it with system
 * instructions/structured output — a single default style doesn't need
 * that, and the wrapper's own doc comment already earmarks that
 * extensibility for whenever it's actually needed (e.g. Phase 2's
 * multi-style picker, FR-9).
 */

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  ur: "Urdu",
};

function buildPrompt(text: string, language: SupportedLanguage): string {
  const translationInstruction =
    language === "en"
      ? ""
      : `The source material below is in ${LANGUAGE_NAMES[language]} — translate it to English as part of producing the notes; don't include any of the original-language text in your output.\n\n`;

  return (
    "You are a note-taking assistant. Read the following source material " +
    "and produce a concise, well-organized set of notes in a bullet/outline " +
    "format (nested bullet points grouped under short headings). Output " +
    "only the notes themselves as Markdown — no preamble, no commentary, " +
    "no closing remarks. Always write the notes in English, regardless of " +
    `the source language.\n\n${translationInstruction}` +
    `Source material:\n"""\n${text}\n"""`
  );
}

/**
 * Generates the single default style of notes (Bullet/Outline Summary)
 * from already-fetched-and-validated source text. Errors (missing
 * `GEMINI_API_KEY`, an empty response, network/rate-limit failures)
 * propagate as-is — the caller (P1-5's Inngest job) already retries
 * transient failures and marks the job "failed" once retries are
 * exhausted, so there's no need to reclassify failures here.
 */
export async function generateNotes({
  text,
  language,
}: {
  text: string;
  language: SupportedLanguage;
}): Promise<string> {
  const notes = await generateText(buildPrompt(text, language));
  return notes.trim();
}
