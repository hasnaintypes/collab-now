import { describe, expect, it } from "vitest";
import { detectSourceType } from "./source-detector";

describe("detectSourceType", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ",
  ])("classifies %s as youtube", (url) => {
    expect(detectSourceType(url)).toBe("youtube");
  });

  it.each([
    "https://example.com/blog/some-article",
    "https://news.ycombinator.com/item?id=123",
    "http://example.com/article",
    "https://not-youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
  ])("classifies %s as article", (url) => {
    expect(detectSourceType(url)).toBe("article");
  });

  it.each([
    "not-a-url",
    "",
    "ftp://example.com/file.txt",
    "javascript:alert(1)",
  ])("returns null for %s", (url) => {
    expect(detectSourceType(url)).toBeNull();
  });
});
