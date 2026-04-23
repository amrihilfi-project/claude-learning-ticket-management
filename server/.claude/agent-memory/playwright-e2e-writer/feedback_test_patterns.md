---
name: E2E test patterns and conventions
description: Established patterns from auth.spec.ts and users.spec.ts that all new specs must follow
type: feedback
---

Use `test.use({ storageState: ADMIN_STORAGE_STATE })` at the file top for authenticated specs — never perform a full login flow inside individual tests.

Set `test.setTimeout(60_000)` on all authenticated spec files to give the dev servers room under parallel load.

Use `page.request.*` directly for API-level tests — no need to navigate the browser to hit backend endpoints.

For unauthenticated API tests, create a fresh browser context via `browser.newContext()` without storageState rather than clearing cookies.

Use `test.skip(true, "reason")` (not `test.todo`) for pending UI tests that scaffold a feature not yet built. This keeps them visible in the reporter with a clear explanation.

**Why:** Established by the existing auth.spec.ts and users.spec.ts files already in the repo.
**How to apply:** Every new spec file should open with the storageState line and setTimeout; every API negative test (unauthenticated) should use a fresh context.
