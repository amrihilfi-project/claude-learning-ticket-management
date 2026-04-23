/**
 * E2E tests for the User Management feature (/users page).
 *
 * Auth strategy: the "setup" project (auth.setup.ts) runs once before these
 * tests and saves the admin session cookies to ADMIN_STORAGE_STATE. Every
 * test context in this file loads that file via `test.use({ storageState })`,
 * so tests start already authenticated without performing a login flow.
 *
 * Test data setup: users that are needed for individual tests are created via
 * a direct API call (`createUserViaApi`), which is fast and keeps tests
 * independent. A unique random suffix in each name/email prevents collisions
 * when tests run in parallel.
 */

import { test, expect, type Page } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "../playwright.config";

// All contexts in this file load the saved admin session.
test.use({ storageState: ADMIN_STORAGE_STATE });

// Give each test more room — the dev server may be under parallel load.
test.setTimeout(60000);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin@test.com";
const USERS_URL = "/users";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to /users and wait for:
 * 1. The h1 heading to appear (ProtectedRoute resolved the session).
 * 2. The table data to load (skeleton rows gone and at least one real row visible).
 */
async function goToUsersPage(page: Page): Promise<void> {
  await page.goto(USERS_URL);
  await expect(page).toHaveURL(USERS_URL);
  // Wait for the h1 — rendered only after ProtectedRoute resolves the session.
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible({
    timeout: 20000,
  });
  // Wait for the table data to finish loading:
  // TanStack Query fires GET /api/users; while loading, skeleton rows are shown.
  // We wait for the skeleton animation class to disappear from the table body.
  // Skeletons use the "animate-pulse" utility class from Tailwind.
  // Using waitForSelector with state "hidden" is more reliable than expect().not.toBeVisible()
  // because the element may not be present at all once data loads.
  await page
    .locator("table tbody .animate-pulse")
    .first()
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => {
      // If no skeleton is found, the table already loaded — that's fine.
    });
}

/**
 * Create a user via the API to set up test data without going through the UI.
 * The `role` field defaults to AGENT (required by createUserSchema).
 */
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

/**
 * Find the table row that contains the given text (name or email).
 */
function rowByText(page: Page, text: string) {
  return page.locator("table tbody tr").filter({ hasText: text });
}

/**
 * Click "Add User" and wait for the dialog title to appear.
 * Uses `data-slot="dialog-title"` for reliable detection regardless of
 * what semantic element @base-ui/react uses.
 */
async function openAddUserDialog(page: Page): Promise<void> {
  await page.getByRole("button", { name: /add user/i }).click();
  await expect(dialogTitle(page, /add user/i)).toBeVisible();
}

/**
 * Returns a locator for the dialog title element matching `titleText`.
 */
function dialogTitle(page: Page, titleText: RegExp | string) {
  return page.locator('[data-slot="dialog-title"]').filter({ hasText: titleText });
}

/**
 * Fill visible form fields in the create/edit user dialog.
 */
async function fillCreateForm(
  page: Page,
  opts: { name?: string; email?: string; password?: string }
): Promise<void> {
  if (opts.name !== undefined) {
    await page.getByLabel(/^name$/i).fill(opts.name);
  }
  if (opts.email !== undefined) {
    await page.getByLabel(/^email$/i).fill(opts.email);
  }
  if (opts.password !== undefined) {
    await page.getByLabel(/^password$/i).fill(opts.password);
  }
}

// ---------------------------------------------------------------------------
// Unique name/email factory — keeps tests independent in parallel
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function uniqueUser() {
  const id = uid();
  return {
    name: `Test User ${id}`,
    email: `testuser-${id}@example.com`,
    password: "Password123!",
  };
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

test.describe("User Management — page access", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("admin can access /users and sees the Users heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  });

  test("admin navbar has a Users link", async ({ page }) => {
    await expect(page.getByRole("link", { name: /^users$/i })).toBeVisible();
  });

  test("table has the expected column headers", async ({ page }) => {
    const headers = ["Name", "Email", "Role", "Status", "Joined"];
    for (const header of headers) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }
  });

  test("Add User button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /add user/i })).toBeVisible();
  });

  test("search input is visible", async ({ page }) => {
    await expect(page.getByPlaceholder(/search by name or email/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — own account row", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
    // Search for admin email so the row is on screen regardless of pagination.
    // With many test users, admin may be on a later page (sorted by createdAt desc).
    await page.getByPlaceholder(/search by name or email/i).fill(ADMIN_EMAIL);
    // Wait for the (you) row to appear after search
    await expect(page.locator("table tbody tr").filter({ hasText: "(you)" })).toBeVisible({
      timeout: 6000,
    });
  });

  test("admin's own row shows the (you) label", async ({ page }) => {
    await expect(page.locator("table tbody")).toContainText("(you)");
  });

  test("Deactivate button is disabled for own account", async ({ page }) => {
    const selfRow = page.locator("table tbody tr").filter({ hasText: "(you)" });
    await expect(selfRow.getByRole("button", { name: /deactivate/i })).toBeDisabled();
  });

  test("Delete button is disabled for own account", async ({ page }) => {
    const selfRow = page.locator("table tbody tr").filter({ hasText: "(you)" });
    await expect(selfRow.getByRole("button", { name: /delete/i })).toBeDisabled();
  });

  test("Edit dialog for own account has Role select disabled with helper text", async ({ page }) => {
    const selfRow = page.locator("table tbody tr").filter({ hasText: "(you)" });
    await selfRow.getByRole("button", { name: /edit/i }).click();

    await expect(dialogTitle(page, /edit user/i)).toBeVisible();

    // Role select is disabled when editing your own account
    await expect(page.getByRole("combobox")).toBeDisabled();
    await expect(page.getByText(/you cannot change your own role/i)).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(dialogTitle(page, /edit user/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — create user (happy path)", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("Add User dialog shows name, email, password fields but no role field", async ({ page }) => {
    await openAddUserDialog(page);

    await expect(page.getByLabel(/^name$/i)).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    // Role field is NOT shown in create form (showRole={false})
    await expect(page.getByLabel(/^role$/i)).not.toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("creating a new user makes them appear in the table", async ({ page }) => {
    const user = uniqueUser();

    await openAddUserDialog(page);
    await fillCreateForm(page, user);
    await page.getByRole("button", { name: /^create$/i }).click();

    // Dialog closes
    await expect(dialogTitle(page, /add user/i)).not.toBeVisible({ timeout: 8000 });

    // User appears in the table
    await expect(rowByText(page, user.name)).toBeVisible({ timeout: 10000 });
    await expect(rowByText(page, user.email)).toBeVisible();
  });

  test("newly created user has an Active status badge", async ({ page }) => {
    const user = uniqueUser();

    await openAddUserDialog(page);
    await fillCreateForm(page, user);
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(dialogTitle(page, /add user/i)).not.toBeVisible({ timeout: 8000 });

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — create user (client-side validation)", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
    await openAddUserDialog(page);
  });

  test("name shorter than 3 characters shows inline error", async ({ page }) => {
    await fillCreateForm(page, { name: "AB" });
    // Blur to trigger validation
    await page.getByLabel(/^email$/i).click();
    // Zod message: "Name must be at least 3 characters."
    await expect(page.getByText(/at least 3 characters/i)).toBeVisible();
  });

  test("invalid email format shows inline error", async ({ page }) => {
    await fillCreateForm(page, { email: "not-an-email" });
    await page.getByLabel(/^name$/i).click();
    // Zod message: "Enter a valid email address."
    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test("password shorter than 8 characters shows inline error", async ({ page }) => {
    await fillCreateForm(page, { password: "short" });
    await page.getByLabel(/^name$/i).click();
    // Zod message: "Password must be at least 8 characters."
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("submitting with a short name does not call the API", async ({ page }) => {
    let apiCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/users") && req.method() === "POST") apiCalled = true;
    });

    await fillCreateForm(page, {
      name: "AB",
      email: "valid@example.com",
      password: "Password123!",
    });
    await page.getByRole("button", { name: /^create$/i }).click();

    // Dialog stays open, no API call made
    await expect(dialogTitle(page, /add user/i)).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test("submitting with an invalid email does not close the dialog", async ({ page }) => {
    await fillCreateForm(page, {
      name: "Valid Name",
      email: "bad-email",
      password: "Password123!",
    });
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(dialogTitle(page, /add user/i)).toBeVisible();
  });

  test("submitting with a short password does not close the dialog", async ({ page }) => {
    await fillCreateForm(page, {
      name: "Valid Name",
      email: "valid@example.com",
      password: "short",
    });
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(dialogTitle(page, /add user/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — create user (server-side uniqueness errors)", () => {
  test("duplicate email shows a live uniqueness error in the dialog", async ({ page }) => {
    const existingUser = uniqueUser();
    await createUserViaApi(page, existingUser);

    await goToUsersPage(page);
    await openAddUserDialog(page);

    const newUser = uniqueUser();
    await fillCreateForm(page, {
      name: newUser.name,
      email: existingUser.email, // duplicate
      password: "Password123!",
    });

    // Live uniqueness check fires after 400 ms debounce + network
    await expect(page.getByText(/already taken/i)).toBeVisible({ timeout: 4000 });
  });

  test("duplicate name shows a live uniqueness error in the dialog", async ({ page }) => {
    const existingUser = uniqueUser();
    await createUserViaApi(page, existingUser);

    await goToUsersPage(page);
    await openAddUserDialog(page);

    const newUser = uniqueUser();
    await fillCreateForm(page, {
      name: existingUser.name, // duplicate
      email: newUser.email,
      password: "Password123!",
    });

    await expect(page.getByText(/already taken/i)).toBeVisible({ timeout: 4000 });
  });

  test("server 409 on submit shows an error message and dialog stays open", async ({ page }) => {
    // Intercept POST /api/users to return 409
    await page.route("**/api/users", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Email already in use." }),
        });
      } else {
        await route.continue();
      }
    });

    await goToUsersPage(page);
    await openAddUserDialog(page);

    await fillCreateForm(page, uniqueUser());
    await page.getByRole("button", { name: /^create$/i }).click();

    // Server error message appears; dialog stays open
    await expect(page.getByText(/email already in use/i)).toBeVisible({ timeout: 5000 });
    await expect(dialogTitle(page, /add user/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — cancel dialogs", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("Cancel on create dialog closes it without creating a user", async ({ page }) => {
    const user = uniqueUser();

    await openAddUserDialog(page);
    await fillCreateForm(page, user);
    await page.getByRole("button", { name: /cancel/i }).click();

    // Dialog closed
    await expect(dialogTitle(page, /add user/i)).not.toBeVisible();
    // User was not created
    await expect(rowByText(page, user.name)).not.toBeVisible();
  });

  test("Cancel on delete confirmation dialog keeps the user in the list", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);
    await page.reload();
    await expect(page).toHaveURL(USERS_URL);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: /delete/i }).click();
    await expect(dialogTitle(page, /delete user/i)).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(dialogTitle(page, /delete user/i)).not.toBeVisible();
    await expect(rowByText(page, user.email)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — edit user", () => {
  test("Edit dialog is pre-filled with the user's existing name and email", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /edit/i }).click();

    await expect(dialogTitle(page, /edit user/i)).toBeVisible();
    await expect(page.getByLabel(/^name$/i)).toHaveValue(user.name);
    await expect(page.getByLabel(/^email$/i)).toHaveValue(user.email);
    // No password field in edit form
    await expect(page.getByLabel(/^password$/i)).not.toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
  });

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

    // Dialog closes
    await expect(dialogTitle(page, /edit user/i)).not.toBeVisible({ timeout: 8000 });

    // Updated values appear in the table
    await expect(rowByText(page, updated.name)).toBeVisible({ timeout: 10000 });
    await expect(rowByText(page, updated.email)).toBeVisible();
  });

  test("Cancel in Edit dialog does not save changes", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /edit/i }).click();

    await expect(dialogTitle(page, /edit user/i)).toBeVisible();

    await page.getByLabel(/^name$/i).fill("This Should Not Be Saved");
    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(dialogTitle(page, /edit user/i)).not.toBeVisible();
    await expect(rowByText(page, user.name)).toBeVisible();
    await expect(rowByText(page, "This Should Not Be Saved")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — deactivate and reactivate", () => {
  test("Deactivate button changes user status badge from Active to Inactive", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    // Exact match avoids matching "Deactivate" button text
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

    // Deactivate first
    await row.getByRole("button", { name: /deactivate/i }).click();
    await expect(row.getByText("Inactive", { exact: true })).toBeVisible({ timeout: 8000 });

    // Then reactivate
    await row.getByRole("button", { name: /activate/i }).click();
    await expect(row.getByText("Active", { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(row.getByText("Inactive", { exact: true })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — delete user", () => {
  test("Delete button opens a confirmation dialog that shows the user's name", async ({
    page,
  }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /delete/i }).click();

    await expect(dialogTitle(page, /delete user/i)).toBeVisible();
    // The confirmation text shows the user's name
    await expect(
      page.locator('[data-slot="dialog-content"]').getByText(user.name)
    ).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
  });

  test("confirming delete removes the user from the table", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /delete/i }).click();

    await expect(dialogTitle(page, /delete user/i)).toBeVisible();

    // Click the destructive Delete button scoped to the dialog
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole("button", { name: /^delete$/i })
      .click();

    // Dialog closes and user disappears from table
    await expect(dialogTitle(page, /delete user/i)).not.toBeVisible({ timeout: 8000 });
    await expect(rowByText(page, user.email)).not.toBeVisible({ timeout: 10000 });
  });
});

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

    // Switch to Deleted view
    await page.getByRole("button", { name: /view deleted/i }).click();

    // User should appear here
    const deletedRow = rowByText(page, user.email);
    await expect(deletedRow).toBeVisible({ timeout: 10000 });
    
    // Restore the user
    await deletedRow.getByRole("button", { name: /restore/i }).click();
    await expect(deletedRow).not.toBeVisible({ timeout: 10000 });

    // Switch back to Active view
    await page.getByRole("button", { name: /view active/i }).click();

    // User should be back in the active list
    await expect(rowByText(page, user.email)).toBeVisible({ timeout: 10000 });
  });
});

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

    // Search using the unique uid suffix of userA's name
    const searchInput = page.getByPlaceholder(/search by name or email/i);
    const uniquePart = userA.name.split(" ").pop()!;
    await searchInput.fill(uniquePart);

    // After debounce (400 ms) + network: userA visible, userB gone
    await expect(rowByText(page, userA.name)).toBeVisible({ timeout: 4000 });
    await expect(rowByText(page, userB.name)).not.toBeVisible({ timeout: 4000 });
  });

  test("search by email filters the list to matching users only", async ({ page }) => {
    const userA = uniqueUser();
    const userB = uniqueUser();
    await createUserViaApi(page, userA);
    await createUserViaApi(page, userB);

    await goToUsersPage(page);

    await expect(rowByText(page, userA.email)).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    // Use the uid segment from userA's email (segment before @, after last dash)
    const uniquePart = userA.email.split("@")[0].split("-").pop()!;
    await searchInput.fill(uniquePart);

    await expect(rowByText(page, userA.email)).toBeVisible({ timeout: 4000 });
    await expect(rowByText(page, userB.email)).not.toBeVisible({ timeout: 4000 });
  });

  test("search with no matching results shows 'No users found.'", async ({ page }) => {
    await goToUsersPage(page);

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill("zzz-no-match-xyz-qwerty-unique");

    await expect(page.getByText(/no users found/i)).toBeVisible({ timeout: 4000 });
  });

  test("clearing the search restores the full list", async ({ page }) => {
    const user = uniqueUser();
    await createUserViaApi(page, user);

    await goToUsersPage(page);
    await expect(rowByText(page, user.name)).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill("zzz-no-match-xyz-unique");
    await expect(page.getByText(/no users found/i)).toBeVisible({ timeout: 4000 });

    await searchInput.fill("");
    await expect(rowByText(page, user.name)).toBeVisible({ timeout: 4000 });
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — Escape key closes dialogs", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("Escape closes the Add User dialog", async ({ page }) => {
    await openAddUserDialog(page);
    await expect(dialogTitle(page, /add user/i)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialogTitle(page, /add user/i)).not.toBeVisible();
  });

  test("Escape closes the Edit User dialog", async ({ page }) => {
    // Search for admin email first to ensure the row is on screen.
    // With many test users, admin may be on a later page (sorted by createdAt desc).
    await page.getByPlaceholder(/search by name or email/i).fill(ADMIN_EMAIL);
    const selfRow = page.locator("table tbody tr").filter({ hasText: "(you)" });
    await expect(selfRow).toBeVisible({ timeout: 10000 });
    await selfRow.getByRole("button", { name: /edit/i }).click();

    await expect(dialogTitle(page, /edit user/i)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialogTitle(page, /edit user/i)).not.toBeVisible();
  });

  test("Escape closes the Delete confirmation dialog", async ({ page }) => {
    // Create a non-self user to get an active Delete button
    const user = uniqueUser();
    await createUserViaApi(page, user);
    await page.reload();
    await expect(page).toHaveURL(USERS_URL);

    const row = rowByText(page, user.email);
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("button", { name: /delete/i }).click();

    await expect(dialogTitle(page, /delete user/i)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialogTitle(page, /delete user/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("User Management — seeded admin in table", () => {
  test.beforeEach(async ({ page }) => {
    await goToUsersPage(page);
  });

  test("seeded admin appears with correct name, role badge, and Active status", async ({ page }) => {
    // Use search to find admin directly, because with many test users the admin
    // row may be on a later page (sorted by createdAt desc, admin is created first).
    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill(ADMIN_EMAIL);

    // Wait for search results to load
    const adminRow = page.locator("table tbody tr").filter({ hasText: ADMIN_EMAIL });
    await expect(adminRow).toBeVisible({ timeout: 6000 });
    // Name cell: contains "Admin" followed by the "(you)" badge
    await expect(adminRow.locator("td").first()).toContainText("Admin");
    // Role badge: exactly "ADMIN"
    await expect(adminRow.getByText("ADMIN", { exact: true })).toBeVisible();
    // Status badge: exactly "Active"
    await expect(adminRow.getByText("Active", { exact: true })).toBeVisible();
  });
});
