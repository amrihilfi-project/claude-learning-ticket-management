---
name: Users page UI patterns
description: Locator patterns, dialog detection, and data setup used in users.spec.ts
type: project
---

Dialog title detection: `page.locator('[data-slot="dialog-title"]').filter({ hasText: /pattern/ })` — shadcn/ui dialogs use `data-slot="dialog-title"`, not `role="dialog"`.

Dialog content scoping: `page.locator('[data-slot="dialog-content"]')` for buttons inside a dialog (avoids matching same-named buttons outside).

Skeleton loading wait pattern:
```ts
await page.locator("table tbody .animate-pulse").first()
  .waitFor({ state: "hidden", timeout: 15000 })
  .catch(() => {}); // already loaded — fine
```

Test data creation: use `page.request.post("/api/users", { data: {...} })` — faster than UI, keeps tests independent.

`uid()` helper: `Math.random().toString(36).slice(2, 8)` — used to generate unique name/email suffixes for parallel-safe test data.

Search debounce: the search input has a 400 ms debounce. Use `toBeVisible({ timeout: 4000 })` after filling the input.

Role select in edit dialog: `page.getByRole("combobox")` — it's a shadcn Select, not a native select element.

**Why:** Established by users.spec.ts; consistent with the shadcn/ui component library used in the client.
**How to apply:** Use these patterns whenever writing tests for pages that use shadcn/ui dialogs or the users table.
