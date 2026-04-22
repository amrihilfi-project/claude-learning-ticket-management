import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "test-admin-password-123";
const LOGIN_URL = "/login";
const HOME_URL = "/";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fills and submits the login form with the provided credentials.
 * Does NOT assert anything — callers decide what to expect next.
 */
async function submitLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

/**
 * Logs in as admin and waits until the dashboard is fully visible.
 * Use in beforeEach blocks that require an authenticated session.
 */
async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(LOGIN_URL);
  await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(HOME_URL);
  // Wait for the NavBar to confirm the shell rendered
  await expect(page.locator('nav').getByText("Ticket Management")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

test.describe("Authentication — login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  // -------------------------------------------------------------------------
  // Page structure
  // -------------------------------------------------------------------------

  test("renders the sign-in form with all expected elements", async ({ page }) => {
    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Sign in");
    await expect(page.getByText("Ticket Management System")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  test("valid admin credentials redirect to the dashboard", async ({ page }) => {
    await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });

  test("after login the navbar shows the user name and sign-out button", async ({ page }) => {
    await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page).toHaveURL(HOME_URL);
    // The seeded admin name is "Admin"
    await expect(page.getByText("Admin")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Client-side validation (Zod + RHF, no network request)
  // -------------------------------------------------------------------------

  test("submitting an empty form shows validation errors for both fields", async ({
    page,
  }) => {
    // Touch both fields then submit
    await page.getByLabel(/email/i).focus();
    await page.getByLabel(/password/i).focus();
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/invalid email address/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
    // Should stay on login
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("an invalid email format shows a client-side error without a server call", async ({
    page,
  }) => {
    // Intercept to verify no sign-in network call is made
    let signInCallMade = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/sign-in")) {
        signInCallMade = true;
      }
    });

    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByLabel(/password/i).fill("somepassword");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/invalid email address/i)).toBeVisible();
    expect(signInCallMade).toBe(false);
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("empty email alone shows email validation error", async ({ page }) => {
    await page.getByLabel(/email/i).focus();
    await page.getByLabel(/email/i).blur();
    await expect(page.getByText(/invalid email address/i)).toBeVisible();
  });

  test("empty password alone shows password validation error", async ({ page }) => {
    await page.getByLabel(/password/i).focus();
    await page.getByLabel(/password/i).blur();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Server-side error states
  // -------------------------------------------------------------------------

  test("wrong password shows a root-level error alert", async ({ page }) => {
    await submitLoginForm(page, ADMIN_EMAIL, "wrong-password-xyz");

    // The Alert component renders inside a destructive variant alert
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    // Stay on login — no redirect
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("non-existent email shows a root-level error alert", async ({ page }) => {
    await submitLoginForm(page, "nobody@example.com", ADMIN_PASSWORD);

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("error alert disappears after the user edits the email field", async ({
    page,
  }) => {
    // Trigger a server-side error first
    await submitLoginForm(page, ADMIN_EMAIL, "wrong-password-xyz");
    await expect(page.getByRole("alert")).toBeVisible();

    // Typing in the email field re-validates and clears the root error because
    // react-hook-form re-evaluates on change after the first submit attempt
    await page.getByLabel(/email/i).fill("new@example.com");
    // The alert should no longer be visible now that the field changed
    await expect(page.getByRole("alert")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Password visibility toggle
  // -------------------------------------------------------------------------

  test("password field defaults to masked input", async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("clicking the eye icon reveals the password as plain text", async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill("mysecretpassword");

    // The toggle button has no accessible name — locate it by its position
    // inside the password wrapper (tabIndex=-1 button)
    const toggleButton = page.locator('button[tabindex="-1"]');
    await toggleButton.click();

    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("clicking the eye icon a second time re-masks the password", async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill("mysecretpassword");

    const toggleButton = page.locator('button[tabindex="-1"]');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  // -------------------------------------------------------------------------
  // Submit button state during submission
  // -------------------------------------------------------------------------

  test("sign-in button is disabled and shows loading text while submitting", async ({
    page,
  }) => {
    // Delay the network response so we can observe the in-flight state
    await page.route("**/api/auth/sign-in/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);

    const button = page.getByRole("button", { name: /sign in/i });
    await button.click();

    // While the request is in flight the button should be disabled and show "Signing in…"
    await expect(page.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------

test.describe("Authentication — already-authenticated user visiting /login", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("redirects to the dashboard when an authenticated user visits /login", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    // The LoginPage checks `session` and calls navigate('/', { replace: true })
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Authentication — protected routes redirect unauthenticated users", () => {
  test("visiting / without a session redirects to /login", async ({ page }) => {
    await page.goto(HOME_URL);
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("visiting /users without a session redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("an unknown route redirects an unauthenticated user to /login", async ({
    page,
  }) => {
    await page.goto("/does-not-exist");
    // App catches * → Navigate to / → ProtectedRoute → Navigate to /login
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

// ---------------------------------------------------------------------------

test.describe("Authentication — role-gated route /users", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("admin can access /users and sees the Users page", async ({ page }) => {
    await page.goto("/users");
    // The UsersPage is rendered — just confirm we did NOT get bounced away
    await expect(page).toHaveURL("/users");
  });

  test("admin navbar shows the Users link", async ({ page }) => {
    await expect(page.getByRole("link", { name: /^users$/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------

test.describe("Authentication — session persistence across page reloads", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("session survives a full page reload", async ({ page }) => {
    await page.reload();
    // Should remain on the dashboard, not get sent to /login
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByText("Welcome to Ticket Management")).toBeVisible();
  });

  test("authenticated state is preserved after navigating back and forward", async ({
    page,
  }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");

    await page.goBack();
    await expect(page).toHaveURL(HOME_URL);

    await page.goForward();
    await page.waitForURL("/users");
    await expect(page).toHaveURL("/users");
  });
});

// ---------------------------------------------------------------------------

test.describe("Authentication — sign-out flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("clicking sign out redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("after sign out, visiting a protected route redirects to /login", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);

    await page.goto(HOME_URL);
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("after sign out, visiting /users redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);

    await page.goto("/users");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("after sign out the login form is displayed fresh with no error state", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(LOGIN_URL);

    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Sign in");
    await expect(page.getByRole("alert")).not.toBeVisible();
    await expect(page.getByLabel(/email/i)).toHaveValue("");
    await expect(page.getByLabel(/password/i)).toHaveValue("");
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

test.describe("Authentication — API session endpoint", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("/api/me returns the current user when authenticated", async ({
    page,
  }) => {
    const response = await page.request.get("/api/me");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      email: ADMIN_EMAIL,
      role: "ADMIN",
    });
    expect(body.name).toBeTruthy();
    expect(body.id).toBeTruthy();
  });
});

test.describe("Authentication — API session endpoint (unauthenticated)", () => {
  test("/api/me returns 401 without a session", async ({ page }) => {
    await page.goto(LOGIN_URL); // ensure page context is initialised
    const response = await page.request.get("/api/me");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });
});
