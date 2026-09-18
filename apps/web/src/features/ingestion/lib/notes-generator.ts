import { generateText } from "@/lib/gemini";
import type { SupportedLanguage } from "./source-validator";

/**
 * Gemini-based notes generation. Ships with one default style at MVP
 * (P1-6, Bullet/Outline Summary) and grows to all 5 styles named in PRD
 * §6.9 at P2-1 — Cornell Notes, Bullet/Outline Summary, Mind-Map Outline,
 * Q&A/Flashcards, and Executive Summary (TL;DR). A single Gemini call
 * handles translation (if the source is Hindi/Urdu) and summarization
 * together — output is always English regardless of source language and
 * regardless of style, per FR-8.
 *
 * The PRD names all 5 styles but specifies no internal format for any of
 * them beyond Mind-Map's "(text-based hierarchy)" hint — `STYLE_INSTRUCTIONS`
 * below is this module's own design for what each one actually produces.
 *
 * Every style's instructions are constrained to headings, lists, and
 * bold/italic text only — no tables, block quotes, code blocks, or links.
 * That's not a stylistic choice, it's a hard requirement: this editor only
 * registers `HeadingNode`/`ListNode`/`ListItemNode` (`editor.tsx`), and
 * `seed-notes-plugin.tsx`'s markdown-to-Lexical conversion only wires up
 * transformers for exactly those node types — a table or blockquote in the
 * generated Markdown would either be silently dropped or throw when
 * imported, depending on the construct.
 *
 * Deliberately thin: builds one prompt combining the style instructions
 * with the source text, and calls the P0-14 Gemini wrapper's `generateText`
 * as-is rather than extending it with system instructions/structured
 * output — plain-text Markdown in, Markdown out is enough for all 5 styles.
 */

export type NoteStyle =
  | "bullet-outline"
  | "cornell"
  | "mindmap"
  | "qa-flashcards"
  | "executive-summary";

/** The MVP's only style (P1-6) — still the default for initial generation. */
export const DEFAULT_NOTE_STYLE: NoteStyle = "bullet-outline";

/** Human-readable labels for each style, for the style-picker UI (P2-2). */
export const NOTE_STYLE_LABELS: Record<NoteStyle, string> = {
  "bullet-outline": "Bullet / Outline Summary",
  cornell: "Cornell Notes",
  mindmap: "Mind-Map Outline",
  "qa-flashcards": "Q&A / Flashcards",
  "executive-summary": "Executive Summary (TL;DR)",
};

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  ur: "Urdu",
};

const STYLE_INSTRUCTIONS: Record<NoteStyle, string> = {
  "bullet-outline":
    "produce a concise, well-organized set of notes in a bullet/outline " +
    "format: nested bullet points grouped under short headings.",
  cornell:
    "produce notes using the Cornell Notes method, adapted to a single " +
    'column: a "## Key Questions & Cues" section with short bullet points ' +
    "(keywords or questions a reader could quiz themselves with), a " +
    '"## Notes" section with the detailed bullet-point notes those cues ' +
    'correspond to, and a "## Summary" section with two or three ' +
    "sentences summarizing the whole source.",
  mindmap:
    "produce notes as a Mind-Map Outline: a single top-level heading " +
    "naming the central topic, with nested bullet points branching from " +
    "it — each top-level bullet is a main branch/theme, with sub-bullets " +
    "for related sub-points, going at least two levels deep where the " +
    "source supports it. Favor short phrases over full sentences, the " +
    "way a mind map's branches would read.",
  "qa-flashcards":
    "produce notes as Q&A/Flashcards: short headings for each topic " +
    "covered, and under each heading a bullet list of question-and-answer " +
    'pairs, each written as a bold "**Q:**" line immediately followed by ' +
    'a "**A:**" line, covering the key facts a reader would want to quiz ' +
    "themselves on.",
  "executive-summary":
    "produce an Executive Summary (TL;DR): a very short paragraph (2-4 " +
    'sentences) under a "## TL;DR" heading capturing the single most ' +
    'important takeaway, followed by a "## Key Points" section with no ' +
    "more than 5-7 bullets of the most important supporting points. " +
    "Prioritize brevity over completeness — this style is for someone " +
    "who wants the gist in under a minute, not a comprehensive summary.",
};

function buildPrompt(
  text: string,
  language: SupportedLanguage,
  style: NoteStyle
): string {
  const translationInstruction =
    language === "en"
      ? ""
      : `The source material below is in ${LANGUAGE_NAMES[language]} — translate it to English as part of producing the notes; don't include any of the original-language text in your output.\n\n`;

  return (
    "You are a note-taking assistant. Read the following source material " +
    `and ${STYLE_INSTRUCTIONS[style]} Output only the notes themselves as ` +
    "Markdown, using only headings, bullet/numbered lists, and bold/italic " +
    "text — no tables, block quotes, code blocks, or links. No preamble, " +
    "no commentary, no closing remarks. Always write the notes in English, " +
    `regardless of the source language.\n\n${translationInstruction}` +
    `Source material:\n"""\n${text}\n"""`
  );
}

/**
 * Generates notes in the given style from already-fetched-and-validated
 * source text. Errors (missing `GEMINI_API_KEY`, an empty response,
 * network/rate-limit failures) propagate as-is — callers already handle
 * retrying/reporting failure (the initial-generation Inngest step, or the
 * `regenerateNotes` action for an existing document).
 */
export async function generateNotes({
  text,
  language,
  style,
}: {
  text: string;
  language: SupportedLanguage;
  style: NoteStyle;
}): Promise<string> {
  const notes = await generateText(buildPrompt(text, language, style));
  return notes.trim();
}
