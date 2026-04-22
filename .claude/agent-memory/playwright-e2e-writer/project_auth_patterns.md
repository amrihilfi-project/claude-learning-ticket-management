---
name: Auth UI & E2E patterns
description: Login page selectors, auth flow, session behaviour, and helper patterns confirmed by reading the actual source
type: project
---

## Login page locators (confirmed from LoginPage.tsx)

- Email field: `page.getByLabel(/email/i)` — `<Label htmlFor="email">Email</Label>` + `<Input id="email" />`
- Password field: `page.getByLabel(/password/i)` — `<Label htmlFor="password">Password</Label>` + `<Input id="password" />`
- Submit button: `page.getByRole("button", { name: /^sign in$/i })`
- In-flight state: button text changes to "Signing in…" and `disabled` is set
- Root-level error (wrong creds / server error): `page.getByRole("alert")` — uses shadcn `<Alert variant="destructive">`
- Email field error: `page.getByText(/invalid email address/i)` — Zod message
- Password field error: `page.getByText(/password is required/i)` — Zod message
- Password visibility toggle: `page.locator('button[tabindex="-1"]')` — no accessible name, tabIndex=-1

## Client-side validation behaviour (RHF + Zod, mode: "onTouched")

- Errors appear after a field is touched (blurred) or after the first submit attempt
- An empty email after touch shows "Invalid email address"
- An invalid email format (e.g. "not-an-email") shows "Invalid email address" WITHOUT hitting the server
- An empty password after touch shows "Password is required"
- After a server-side error is shown, editing the email field clears the root alert

## Auth flow details

- On success: `authClient.signIn.email(data)` → `navigate("/")` (Better Auth client)
- On failure: `setError("root", { message: error.message ?? "Invalid credentials" })`
- Already-authenticated visit to /login: `navigate('/', { replace: true })` (no flash)
- Sign-up is disabled server-side (`disableSignUp: true`)

## ProtectedRoute behaviour

- Shows `<span>Loading...</span>` while `isPending` is true
- Redirects to `/login` if no session
- Redirects to `/` if session exists but role is not in `roles[]`
- `/users` is ADMIN-only: `<ProtectedRoute roles={["ADMIN"]}>`

## NavBar sign-out

- Button: `page.getByRole("button", { name: /sign out/i })`
- After click: `authClient.signOut()` → `navigate("/login")`
- Users link (ADMIN only): `page.getByRole("link", { name: /^users$/i })`
- User name displayed: `page.getByText("Admin")` (seeded name is "Admin")

## Seeded admin credentials

- Email: `admin@test.com`
- Password: `test-admin-password-123`
- Role: ADMIN, isActive: true, name: "Admin"

## Reusable helpers (established in e2e/auth.spec.ts)

```ts
async function submitLoginForm(page, email, password) {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

async function loginAsAdmin(page) {
  await page.goto("/login");
  await submitLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Ticket Management")).toBeVisible();
}
```

## API endpoints exercised in tests

- `GET /api/me` — returns `{ id, name, email, role }` for authenticated user; 401 if not
- `POST /api/auth/sign-in/email` — Better Auth sign-in; interceptable via `page.route("**/api/auth/sign-in/**", ...)`

## Known patterns to avoid / watch for

- `page.waitForTimeout` is not used; prefer `toBeVisible()` or `toHaveURL()` assertions
- The `<Alert>` component renders with `role="alert"` (shadcn default), making it addressable with `getByRole("alert")`
- Network interception for "in-flight" state requires `page.route(...)` with a delayed `route.continue()`
- `fullyParallel: true` is set in playwright.config.ts — every test must be fully independent

**Why:** Captured to avoid re-reading source on every auth-related test task.
**How to apply:** Use these locators and helpers directly in new specs; copy loginAsAdmin into any spec that needs an authenticated session in beforeEach.
