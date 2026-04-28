import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "test-admin-password-123";
const LOGIN_URL = "/login";
const HOME_URL = "/";

async function submitLoginForm(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(LOGIN_URL);
  await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(HOME_URL);
  await expect(page.locator("nav").getByText("Ticket Management")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Login happy path and server-side errors (require real auth)
// ---------------------------------------------------------------------------

test.describe("Authentication — login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  test("valid admin credentials redirect to the dashboard", async ({ page }) => {
    await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });

  test("after login the navbar shows the user name and sign-out button", async ({ page }) => {
    await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Admin")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("wrong password shows a root-level error alert", async ({ page }) => {
    await submitLoginForm(page, ADMIN_EMAIL, "wrong-password-xyz");
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("non-existent email shows a root-level error alert", async ({ page }) => {
    await submitLoginForm(page, "nobody@example.com", ADMIN_PASSWORD);
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

// ---------------------------------------------------------------------------
// Session-based routing (requires real browser session)
// ---------------------------------------------------------------------------

test.describe("Authentication — already-authenticated user visiting /login", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("redirects to the dashboard when an authenticated user visits /login", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });
});

test.describe("Authentication — protected routes redirect unauthenticated users", () => {
  test("visiting / without a session redirects to /login", async ({ page }) => {
    await page.goto(HOME_URL);
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("visiting /users without a session redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("an unknown route redirects an unauthenticated user to /login", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

test.describe("Authentication — role-gated route /users", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("admin can access /users and sees the Users page", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
  });
});

// ---------------------------------------------------------------------------
// Session persistence (requires real cookie/storage state)
// ---------------------------------------------------------------------------

test.describe("Authentication — session persistence across page reloads", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("session survives a full page reload", async ({ page }) => {
    await page.reload();
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });

  test("authenticated state is preserved after navigating back and forward", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await page.goBack();
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Sign-out flow (requires real session destruction)
// ---------------------------------------------------------------------------

test.describe("Authentication — sign-out flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("clicking sign out redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("after sign out, visiting a protected route redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);
    await page.goto(HOME_URL);
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("after sign out, page reload keeps the user on /login", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);
    await page.reload();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("re-login after sign out works correctly", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);
    await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// API session endpoint (tests real server auth behaviour)
// ---------------------------------------------------------------------------

test.describe("Authentication — API session endpoint", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("/api/me returns the current user when authenticated", async ({ page }) => {
    const response = await page.request.get("/api/me");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ email: ADMIN_EMAIL, role: "ADMIN" });
    expect(body.name).toBeTruthy();
    expect(body.id).toBeTruthy();
  });
});

test.describe("Authentication — API session endpoint (unauthenticated)", () => {
  test("/api/me returns 401 without a session", async ({ page }) => {
    await page.goto(LOGIN_URL);
    const response = await page.request.get("/api/me");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });
});
