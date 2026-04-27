---
name: AI mock env passthrough and test isolation for AI features
description: playwright.config.ts must forward GEMINI_API_KEY to the server webServer env, or AI mocks won't activate and tests see real API responses or nulls
type: feedback
---

`playwright.config.ts` defines a `testEnv` object that is passed to the server's `webServer.env`. If `GEMINI_API_KEY` is omitted from `testEnv`, the running server inherits the shell's real Gemini key (if set), bypassing the mock path in `server/src/lib/ai.ts`.

The mock activates when `GEMINI_API_KEY` includes `"test-key"` (the value set in `.env.test`). If the server starts without the var, or with a real key from the shell environment, AI calls hit the real API and return unpredictable or null results.

Fix: add `GEMINI_API_KEY: process.env.GEMINI_API_KEY!` to `testEnv` in `playwright.config.ts`.

Mock return values (as of current `server/src/lib/ai.ts`):
- `classifyTicket` → `"GENERAL_QUESTION"`
- `summarizeTicket` → `"This is a mocked summary for testing purposes."`
- `suggestReply` → `"This is a mocked suggested reply for testing purposes."`

**Why:** Without passing the key, existing servers reuse their process env; new servers inherit shell env. Both paths bypass `.env.test`.
**How to apply:** Any time AI-related UI assertions fail with "element not found" while the heading IS visible, check whether `GEMINI_API_KEY` is in `testEnv` and whether servers need to be restarted (kill ports 3001 and 5174 before re-running).
