/**
 * Auth setup — runs once before the main test project via the "setup" project.
 *
 * Logs in as the seeded admin user, then saves the browser storage state
 * (cookies) to disk. The "chromium" project depends on "setup", so by the
 * time any regular test runs, the session file already exists.
 *
 * Tests that need an authenticated context load it with:
 *   test.use({ storageState: ADMIN_STORAGE_STATE });
 */

import { test as setup } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "../playwright.config";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "test-admin-password-123";

setup("authenticate as admin and save session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("/");

  // Save the authenticated state (cookies) so all tests can reuse it
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
