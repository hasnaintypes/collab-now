import { test, expect } from "@playwright/test";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "./global-setup";

// The one required smoke flow per docs/ROADMAP.md P0-11: sign in, create a
// document, edit it, sign out. Deliberately a single linear test rather
// than split into isolated cases — the point of a smoke test is confirming
// the whole path works end to end in one real browser session.
test("sign in, create a document, edit it, and sign out", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(E2E_USER_EMAIL);
  await page.getByLabel("Password").fill(E2E_USER_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // The auth round trip (password hash verify + session creation) can take
  // longer than Playwright's 5s default assertion timeout under load — give
  // it more room rather than tightening what's actually a slow-network/slow-DB
  // situation into a flaky test.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

  // The empty-state dashboard renders a "New Document" button both in the
  // header and inline in the empty documents list — either does the same
  // thing, so just take the first match.
  await page.getByRole("button", { name: "New Document" }).first().click();
  // `createDocument` round-trips to both Liveblocks and Postgres before the
  // client navigates — same slow-round-trip allowance as the sign-in step.
  await expect(page).toHaveURL(/\/documents\//, { timeout: 20_000 });

  // Scoped to Lexical's own editor root specifically — the page also has a
  // separate Liveblocks comment composer, which is also `contenteditable`.
  const editor = page.locator('[data-lexical-editor="true"]');
  await editor.click();
  await editor.pressSequentially("Hello from the Playwright smoke test.");
  await expect(editor).toContainText("Hello from the Playwright smoke test.");

  await page.getByTestId("user-menu-trigger").click();
  await page.getByTestId("sign-out-button").click();

  await expect(page).toHaveURL(/\/sign-in/);
});
