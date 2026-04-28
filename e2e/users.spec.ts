/**
 * E2E tests for the User Management feature (/users page).
 *
 * Only tests functionality that cannot be covered by unit tests:
 *  - Real server mutations (create, edit, deactivate/activate, delete, restore)
 *  - Live server-side uniqueness validation
 *  - Real server-side search filtering
 *  - Role-based route access
 *  - Full multi-step workflows (delete → deleted view → restore → active view)
 *
 * Client-side validation, dialog UX (Escape/cancel/click-outside), table
 * rendering, and loading states are covered by UsersPage.test.tsx unit tests.
 */

import { test, expect, type Page } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "../playwright.config";

test.use({ storageState: ADMIN_STORAGE_STATE });
test.setTimeout(60000);

const ADMIN_EMAIL = "admin@test.com";
const USERS_URL = "/users";

async function goToUsersPage(page: Page): Promise<void> {
  await page.goto(USERS_URL);
  await expect(page).toHaveURL(USERS_URL);
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page
    .locator("table tbody .animate-pulse")
    .first()
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => {});
}

async function createUserViaApi(
  page: Page,
  payload: { name: string; email: string; password: string; role?: "ADMIN" | "AGENT" }
): Promise<void> {
  const response = await page.request.post("/api/users", {
    data: { role: "AGENT", ...payload },
  });
  if (response.status() !== 201) {
    const body = await response.text();
    throw new Error(`createUserViaApi failed with ${response.status()}: ${body}`);
  }
}

function rowByText(page: Page, text: string) {
  return page.locator("table tbody tr").filter({ hasText: text });
}

async function openAddUserDialog(page: Page): Promise<void> {
  await page.getByRole("button", { name: /add user/i }).click();
  await expect(dialogTitle(page, /add user/i)).toBeVisible();
}

function dialogTitle(page: Page, titleText: RegExp | string) {
  return page.locator('[data-slot="dialog-title"]').filter({ hasText: titleText });
}

async function fillCreateForm(
  page: Page,
  opts: { name?: string; email?: string; password?: string }
): Promise<void> {
  if (opts.name !== undefined) await page.getByLabel(/^name$/i).fill(opts.name);
  if (opts.email !== undefined) await page.getByLabel(/^email$/i).fill(opts.email);
  if (opts.password !== undefined) await page.getByLabel(/^password$/i).fill(opts.password);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function uniqueUser() {
  const id = uid();
  return { name: `Test User ${id}`, email: `testuser-${id}@example.com`, password: "Password123!" };
}

// ---------------------------------------------------------------------------
// Role-based route access
// ---------------------------------------------------------------------------

test.describe("User Management — page access", () => {
  test("admin can access /users and sees the Users heading", async ({ page }) => {
    await goToUsersPage(page);
    await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Own-account restrictions (Deactivate disabled — not covered by unit tests)
// ---------------------------------------------------------------------------

test.describe("User Management — own account row", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
    await page.getByPlaceholder(/search by name or email/i).fill(ADMIN_EMAIL);
    await expect(page.locator("table tbody tr").filter({ hasText: "(you)" })).toBeVisible({
      timeout: 6000,
    });
  });

  test("Deactivate button is disabled for own account", async ({ page }) => {
    const selfRow = page.locator("table tbody tr").filter({ hasText: "(you)" });
    await expect(selfRow.getByRole("button", { name: /deactivate/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Create user — real server: user appears in table after creation
// ---------------------------------------------------------------------------

test.describe("User Management — create user", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("creating a new user makes them appear in the table", async ({ page }) => {
    const user = uniqueUser();

    await openAddUserDialog(page);
    await fillCreateForm(page, user);
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(dialogTitle(page, /add user/i)).not.toBeVisible({ timeout: 8000 });
    await expect(rowByText(page, user.name)).toBeVisible({ timeout: 10000 });
    await expect(rowByText(page, user.email)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Server-side uniqueness errors (live checks require real server)
// ---------------------------------------------------------------------------

test.describe("User Management — server-side uniqueness errors", () => {
  test("duplicate email shows a live uniqueness error in the dialog", async ({ page }) => {
    const existingUser = uniqueUser();
    await createUserViaApi(page, existingUser);

    await goToUsersPage(page);
    await openAddUserDialog(page);

    const newUser = uniqueUser();
    await fillCreateForm(page, { name: newUser.name, email: existingUser.email, password: "Password123!" });

    await expect(page.getByText(/already taken/i)).toBeVisible({ timeout: 4000 });
  });

  test("duplicate name shows a live uniqueness error in the dialog", async ({ page }) => {
    const existingUser = uniqueUser();
    await createUserViaApi(page, existingUser);

    await goToUsersPage(page);
    await openAddUserDialog(page);

    const newUser = uniqueUser();
    await fillCreateForm(page, { name: existingUser.name, email: newUser.email, password: "Password123!" });

    await expect(page.getByText(/already taken/i)).toBeVisible({ timeout: 4000 });
  });
});

// ---------------------------------------------------------------------------
// Edit user — real server: updated values reflected in table
// ---------------------------------------------------------------------------

test.describe("User Management — edit user", () => {
  test("saving edited name and email updates the row in the table", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /edit/i }).click();

    await expect(dialogTitle(page, /edit user/i)).toBeVisible();

    const updated = uniqueUser();
    await page.getByLabel(/^name$/i).fill(updated.name);
    await page.getByLabel(/^email$/i).fill(updated.email);
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(dialogTitle(page, /edit user/i)).not.toBeVisible({ timeout: 8000 });
    await expect(rowByText(page, updated.name)).toBeVisible({ timeout: 10000 });
    await expect(rowByText(page, updated.email)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Deactivate and reactivate (real API mutations, status badge updates)
// ---------------------------------------------------------------------------

test.describe("User Management — deactivate and reactivate", () => {
  test("Deactivate button changes user status badge from Active to Inactive", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: /deactivate/i }).click();

    await expect(row.getByText("Inactive", { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(row.getByText("Active", { exact: true })).not.toBeVisible();
  });

  test("Activate button changes user status badge from Inactive back to Active", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: /deactivate/i }).click();
    await expect(row.getByText("Inactive", { exact: true })).toBeVisible({ timeout: 8000 });

    await row.getByRole("button", { name: /activate/i }).click();
    await expect(row.getByText("Active", { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(row.getByText("Inactive", { exact: true })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Soft delete and restore — full multi-step workflow
// ---------------------------------------------------------------------------

test.describe("User Management — soft delete and restore", () => {
  test("deleted users appear in the deleted view and can be restored", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /delete/i }).click();

    await expect(dialogTitle(page, /delete user/i)).toBeVisible();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole("button", { name: /^delete$/i })
      .click();

    await expect(dialogTitle(page, /delete user/i)).not.toBeVisible({ timeout: 8000 });
    await expect(rowByText(page, user.email)).not.toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /view deleted/i }).click();

    const deletedRow = rowByText(page, user.email);
    await expect(deletedRow).toBeVisible({ timeout: 10000 });

    await deletedRow.getByRole("button", { name: /restore/i }).click();
    await expect(deletedRow).not.toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /view active/i }).click();
    await expect(rowByText(page, user.email)).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Search — real server-side filtering (unit tests only verify the API param)
// ---------------------------------------------------------------------------

test.describe("User Management — search", () => {
  test("search by name filters the list to matching users only", async ({ page }) => {
    const userA = uniqueUser();
    const userB = uniqueUser();
    await createUserViaApi(page, userA);
    await createUserViaApi(page, userB);

    await goToUsersPage(page);

    await expect(rowByText(page, userA.name)).toBeVisible({ timeout: 10000 });
    await expect(rowByText(page, userB.name)).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    const uniquePart = userA.name.split(" ").pop()!;
    await searchInput.fill(uniquePart);

    await expect(rowByText(page, userA.name)).toBeVisible({ timeout: 4000 });
    await expect(rowByText(page, userB.name)).not.toBeVisible({ timeout: 4000 });
  });
});

// ---------------------------------------------------------------------------
// Seeded admin data (requires real seed, cannot be mocked)
// ---------------------------------------------------------------------------

test.describe("User Management — seeded admin in table", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("seeded admin appears with correct name, role badge, and Active status", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill(ADMIN_EMAIL);

    const adminRow = page.locator("table tbody tr").filter({ hasText: ADMIN_EMAIL });
    await expect(adminRow).toBeVisible({ timeout: 6000 });
    await expect(adminRow.locator("td").first()).toContainText("Admin");
    await expect(adminRow.getByText("ADMIN", { exact: true })).toBeVisible();
    await expect(adminRow.getByText("Active", { exact: true })).toBeVisible();
  });
});
