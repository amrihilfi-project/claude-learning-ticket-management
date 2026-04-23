---
name: Users page E2E patterns
description: Locator strategies, auth setup project, dialog patterns, and pagination gotchas for the /users page tests
type: project
---

## Auth strategy — setup project + storageState

The playwright.config.ts has a "setup" project that runs `e2e/auth.setup.ts` before the "chromium" project. `auth.setup.ts` logs in via the UI and saves cookies to `e2e/.auth/admin.json`. All tests in `users.spec.ts` use:

```ts
import { ADMIN_STORAGE_STATE } from "../playwright.config";
test.use({ storageState: ADMIN_STORAGE_STATE });
```

This avoids N parallel logins that overload the dev server.

## API login does work but causes session-not-found failures under load

`page.request.post("/api/auth/sign-in/email", { data: { email, password } })` returns 200 and sets `better-auth.session_token` cookie on domain `localhost`. This DOES work in isolation but under parallel test load, some tests time out waiting for the React session to hydrate after the direct API call. Always prefer `storageState` over API login when possible.

## createUserViaApi — must include `role` field

The `createUserSchema` requires `role: "ADMIN" | "AGENT"`. Always default to `"AGENT"`:

```ts
await page.request.post("/api/users", { data: { role: "AGENT", ...payload } });
```

Returns 201 on success.

## Dialog title detection

`@base-ui/react` dialogs: use `data-slot="dialog-title"` attribute rather than `getByRole("heading")`:

```ts
function dialogTitle(page: Page, titleText: RegExp | string) {
  return page.locator('[data-slot="dialog-title"]').filter({ hasText: titleText });
}
```

Dialogs open/close when `open` prop changes. Escape key works natively.

## Pagination issue — admin row may not be on page 1

The API sorts users by `createdAt: "desc"`, so newly created test users appear first. The seeded admin (created earliest) ends up on the LAST page when many tests have created users. Always search before asserting on the admin row:

```ts
await page.getByPlaceholder(/search by name or email/i).fill(ADMIN_EMAIL);
const adminRow = page.locator("table tbody tr").filter({ hasText: ADMIN_EMAIL });
await expect(adminRow).toBeVisible({ timeout: 6000 });
```

Same applies to the `(you)` label — the admin's own row.

## Active/Inactive badge — use `{ exact: true }` to avoid matching button text

`row.getByText("Active")` can match inside "Deactivate" button or "Activate" button text. Always use:

```ts
await expect(row.getByText("Active", { exact: true })).toBeVisible();
await expect(row.getByText("Inactive", { exact: true })).toBeVisible();
```

## Table loading wait

After `goToUsersPage`, wait for skeletons to disappear before asserting row content:

```ts
await page.locator("table tbody .animate-pulse").first()
  .waitFor({ state: "hidden", timeout: 15000 })
  .catch(() => {}); // already loaded — fine
```

## Delete button in dialog — scope to dialog content

The page has many Delete buttons (one per row). Scope to the dialog to avoid strict mode violations:

```ts
await page
  .locator('[data-slot="dialog-content"]')
  .getByRole("button", { name: /^delete$/i })
  .click();
```

## Zod validation messages (from createUserSchema)

- Name too short: "Name must be at least 3 characters."
- Invalid email: "Enter a valid email address."
- Password too short: "Password must be at least 8 characters."
- Matchers: `/at least 3 characters/i`, `/valid email address/i`, `/at least 8 characters/i`

## Live uniqueness error message

The `UserForm` component shows: `"Name is already taken."` / `"Email is already taken."`. Match with `/already taken/i`.

## Role select in Edit dialog

The edit form shows a `<Select>` with `role="combobox"`. When editing own account, it is disabled:

```ts
await expect(page.getByRole("combobox")).toBeDisabled();
await expect(page.getByText(/you cannot change your own role/i)).toBeVisible();
```

## Unique test user factory

```ts
function uid() { return Math.random().toString(36).slice(2, 8); }
function uniqueUser() {
  const id = uid();
  return { name: `Test User ${id}`, email: `testuser-${id}@example.com`, password: "Password123!" };
}
```

**Why:** Each test creates its own users via API so tests are independent in parallel. The uid suffix is used as the search term for filtering.

**How to apply:** Use `uniqueUser()` for test data and extract the uid suffix (last word of name, or last dash-segment of email prefix) as the search term.
