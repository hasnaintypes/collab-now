import { describe, expect, it } from "vitest";
import {
  MAX_ARTICLE_WORD_COUNT,
  MAX_VIDEO_DURATION_SECONDS,
  SourceValidationError,
  validateArticleSource,
  validateYoutubeSource,
} from "./source-validator";

// A genuine, grammatical English paragraph — used as-is for "is this
// English?" checks, and repeated to hit exact word counts for the
// article word-cap tests without corrupting franc's trigram-based
// language detection (repeating real text just scales the same trigram
// distribution rather than producing gibberish).
const ENGLISH_PARAGRAPH =
  "The research team spent several months analyzing how large language " +
  "models process natural language text across many different domains " +
  "and writing styles, focusing especially on the challenges posed by " +
  "low resource languages and informal conversational text found across " +
  "the internet and social media platforms used every single day.";

// Genuine Hindi (Devanagari) and Urdu (Perso-Arabic) paragraphs, long
// enough for franc to confidently classify.
const HINDI_PARAGRAPH =
  "यह एक परीक्षण अनुच्छेद है जो हिंदी भाषा में लिखा गया है। हम इस पाठ का " +
  "उपयोग भाषा पहचान की जांच करने के लिए कर रहे हैं। हिंदी भारत की एक " +
  "प्रमुख और व्यापक रूप से बोली जाने वाली भाषा है।";

const URDU_PARAGRAPH =
  "یہ ایک تجرباتی پیراگراف ہے جو اردو زبان میں لکھا گیا ہے۔ ہم اس متن کو " +
  "زبان کی شناخت کی جانچ کے لیے استعمال کر رہے ہیں۔ اردو پاکستان کی قومی " +
  "اور ایک اہم زبان ہے۔";

// A genuine French paragraph — stands in for "a language we don't support".
const FRENCH_PARAGRAPH =
  "L'équipe de recherche a passé plusieurs mois à analyser comment les " +
  "grands modèles de langage traitent le texte en langage naturel dans " +
  "de nombreux domaines et styles d'écriture différents, en se concentrant " +
  "particulièrement sur les défis posés par les langues à faibles ressources.";

function repeatToWordCount(paragraph: string, targetWords: number): string {
  const words = paragraph.trim().split(/\s+/);
  const repeated: string[] = [];
  while (repeated.length < targetWords) repeated.push(...words);
  return repeated.slice(0, targetWords).join(" ");
}

describe("validateYoutubeSource", () => {
  it("passes for an English transcript within the duration cap", () => {
    expect(() =>
      validateYoutubeSource({
        text: ENGLISH_PARAGRAPH,
        durationSeconds: MAX_VIDEO_DURATION_SECONDS - 1,
      })
    ).not.toThrow();
  });

  it("passes for a Hindi transcript within the duration cap", () => {
    expect(() =>
      validateYoutubeSource({
        text: HINDI_PARAGRAPH,
        durationSeconds: 600,
      })
    ).not.toThrow();
  });

  it("passes for an Urdu transcript within the duration cap", () => {
    expect(() =>
      validateYoutubeSource({
        text: URDU_PARAGRAPH,
        durationSeconds: 600,
      })
    ).not.toThrow();
  });

  it("rejects a video over the 60-minute cap with a specific message, checked before language", () => {
    const error = (() => {
      try {
        validateYoutubeSource({
          text: FRENCH_PARAGRAPH, // also unsupported language, but duration should win
          durationSeconds: MAX_VIDEO_DURATION_SECONDS + 60,
        });
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(SourceValidationError);
    expect(error).toMatchObject({ reason: "video-too-long" });
    expect((error as SourceValidationError).message).toMatch(/60-minute limit/);
  });

  it("rejects a video whose language isn't English, Hindi, or Urdu, with a specific message", () => {
    const error = (() => {
      try {
        validateYoutubeSource({
          text: FRENCH_PARAGRAPH,
          durationSeconds: 600,
        });
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(SourceValidationError);
    expect(error).toMatchObject({ reason: "unsupported-language" });
    expect((error as SourceValidationError).message).toMatch(
      /English, Hindi, or Urdu/
    );
  });
});

describe("validateArticleSource", () => {
  it("passes for an English article at exactly the word cap", () => {
    const text = repeatToWordCount(ENGLISH_PARAGRAPH, MAX_ARTICLE_WORD_COUNT);
    expect(() => validateArticleSource({ text })).not.toThrow();
  });

  it("rejects an article one word over the cap with a specific message", () => {
    const text = repeatToWordCount(
      ENGLISH_PARAGRAPH,
      MAX_ARTICLE_WORD_COUNT + 1
    );

    const error = (() => {
      try {
        validateArticleSource({ text });
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(SourceValidationError);
    expect(error).toMatchObject({ reason: "article-too-long" });
    expect((error as SourceValidationError).message).toMatch(
      /20,000-word limit/
    );
  });

  it("passes for a Hindi article within the word cap", () => {
    expect(() =>
      validateArticleSource({ text: HINDI_PARAGRAPH })
    ).not.toThrow();
  });

  it("passes for an Urdu article within the word cap", () => {
    expect(() =>
      validateArticleSource({ text: URDU_PARAGRAPH })
    ).not.toThrow();
  });

  it("rejects an article whose language isn't English, Hindi, or Urdu, with a specific message", () => {
    const error = (() => {
      try {
        validateArticleSource({ text: FRENCH_PARAGRAPH });
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(SourceValidationError);
    expect(error).toMatchObject({ reason: "unsupported-language" });
    expect((error as SourceValidationError).message).toMatch(
      /English, Hindi, or Urdu/
    );
  });

  it("rejects text too short/ambiguous for language detection to confirm as supported", () => {
    const error = (() => {
      try {
        validateArticleSource({ text: "ok" });
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(SourceValidationError);
    expect(error).toMatchObject({ reason: "unsupported-language" });
  });
});
