import { test, expect } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "./global-setup";

// Prerequisites beyond what smoke.spec.ts needs: a real `GEMINI_API_KEY` in
// `apps/web/.env` (the job fails at the generate-notes step without one —
// verified directly: it fails cleanly and predictably, retried via
// Inngest's own backoff schedule rather than hanging, exactly as designed),
// `INNGEST_DEV=1` set (without it every `inngest.send()` fails immediately
// with "no signing key found" — see .env.example/README.md), and
// `npx inngest-cli@latest dev` running in a separate terminal, started
// *after* the Next.js dev server has already served `/api/inngest` at
// least once (its first hit is slow — 60–90s in a cold Turbopack dev
// build, importing jsdom/@google/genai/franc/etc. — and this Inngest dev
// server's one-shot auto-discovery scan can otherwise run before the
// route is even ready to respond). `playwright.config.ts`'s `webServer`
// only starts the Next.js dev server, not this — auto-starting a second
// local process with this specific a warm-up/discovery-ordering
// requirement isn't something to guess at wiring up reliably.
//
// The one required flow per docs/ROADMAP.md P1-9: paste an article URL,
// wait for the full ingestion pipeline (P1-1 through P1-8 — fetch, validate,
// generate notes, save as a document) to actually complete, and land in a
// real document with real generated content in it.
//
// A real, third-party article URL rather than a local fixture — this
// exercises the actual article-extraction step (P1-3), which needs a real
// HTTP response with real HTML structure for `@mozilla/readability` to
// parse; a canned local fixture would only prove the pipeline handles
// exactly the HTML shape it was handed, not that it works against a real
// page. Chosen for being short, structurally simple, and about as stable a
// reference page as exists on the public web — accepted as a genuine
// external dependency, consistent with this suite not gating CI (it's
// `workflow_dispatch`-only per CLAUDE.md, not part of the required PR checks).
const ARTICLE_URL = "https://en.wikipedia.org/wiki/Hypertext";

test("paste an article URL, wait for the job to finish, and land in the generated document", async ({
  page,
}) => {
  // The default per-test timeout (60s, `playwright.config.ts`) is tuned for
  // the smoke test — this one waits on a real article fetch + a real LLM
  // call, which routinely takes longer than that on its own, so the test's
  // own timeout needs raising too; the 180s on the assertion below is
  // otherwise silently cut short by this one.
  test.setTimeout(210_000);

  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(E2E_USER_EMAIL);
  await page.getByLabel("Password").fill(E2E_USER_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Same slow-round-trip allowance as the smoke test — sign-in is a real
  // Postgres round trip, not the thing this test is actually about.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  await page.getByRole("button", { name: "New from URL" }).click();
  await page.getByPlaceholder("https://...").fill(ARTICLE_URL);
  await page.getByRole("button", { name: "Generate notes" }).click();

  // The full pipeline (fetch → validate → Gemini → save document) runs
  // asynchronously through Inngest and is by far the slowest step in this
  // whole suite — a real network fetch plus a real LLM call. A long,
  // generous timeout here is the correct call, not a sign of a flaky test:
  // treating a slow (but successful) run as a failure would be the actual
  // flakiness. `new-from-url-dialog.tsx` polls and redirects automatically
  // once the job reaches "ready".
  await expect(page).toHaveURL(/\/documents\//, { timeout: 180_000 });

  // Scoped to Lexical's own editor root specifically — the page also has a
  // separate Liveblocks comment composer, which is also `contenteditable`
  // (see smoke.spec.ts for the same distinction).
  const editor = page.locator('[data-lexical-editor="true"]');

  // `seed-notes-plugin.tsx` fills the room in client-side once it detects
  // the editor is empty — give that a moment to run after navigation lands.
  await expect(editor).not.toBeEmpty({ timeout: 10_000 });

  // The generated notes are a bullet/outline summary (P1-6's single default
  // style) — a real list item confirms actual generated content landed,
  // not just an incidental non-empty paragraph.
  await expect(editor.locator("li").first()).toBeVisible();
});
