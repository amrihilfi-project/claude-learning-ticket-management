# Ticket Management System

## Project Overview
An AI-powered support ticket management system for handling student support emails.

## Tech Stack
- **Runtime**: Bun
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Router v7 (`client/`)
- **Backend**: Node.js, Express, TypeScript, Prisma (`server/`)
- **Database**: PostgreSQL
### AI Integration & External Services
- **AI Provider**: Gemini API (`gemini-2.5-flash`) via `@google/genai` SDK.
- **Workflow**: Synchronous processing during webhook ingestion (no queueing for now).
- **Error Handling**: AI failures are caught and logged. They never prevent a ticket from being created or updated. AI features are always best-effort.
- **Testing AI**: For automated tests, the `GEMINI_API_KEY` is set to `test-key` in `.env.test`. The `server/src/lib/ai.ts` module checks for this dummy key and returns deterministic mocked strings instead of hitting the actual API. This ensures E2E tests are fast, reliable, and don't incur API costs.
- **Auth**: Better Auth — email/password, sessions in PostgreSQL via Prisma adapter, RBAC (ADMIN / AGENT roles), sign-up disabled (users seeded by admin script)
- **Deployment**: Docker + Docker Compose

## Project Structure
```
/
├── client/          # React frontend (Vite dev server on :5173)
├── server/          # Express backend (:3000)
├── e2e/             # Playwright E2E tests
├── playwright.config.ts
├── package.json     # Bun workspace root
└── docker-compose.yml
```

## Common Commands
| Command | Purpose |
|---------|---------|
| `bun install` | Install all workspace dependencies |
| `bun run --filter '*' dev` | Start both client and server |
| `bun run --filter server dev` | Start server only |
| `bun run --filter client dev` | Start client only |
| `bun test:e2e` | Run Playwright E2E tests |

## Component Testing

Use **Vitest** + **React Testing Library** for component tests in the `client/` package.

### Commands
| Command | Purpose |
|---------|---------|
| `bun run --filter client test` | Run all component tests once |
| `bun run --filter client test:watch` | Watch mode — re-runs on file change |
| `bun run --filter client test:ui` | Browser UI — interactive dashboard for writing tests |

### Setup
- Test environment: `jsdom` (configured in `client/vite.config.ts`)
- Global matchers: `@testing-library/jest-dom` (loaded via `client/src/test/setup.ts`)
- Test files: co-located with the component, named `*.test.tsx`

### Writing tests
- Use `renderWithProviders` from `client/src/test/renderWithProviders.tsx` — it wraps the component in `QueryClientProvider` + `MemoryRouter`
- Mock `axios` with a factory so all methods are `vi.fn()`:
  ```ts
  vi.mock("axios", () => ({
    default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  }));
  const ax = vi.mocked(axios);
  ```
- Mock `authClient.useSession` from `../lib/auth-client` to control session state
- Always call `afterEach(() => vi.useRealTimers())` when any test uses `vi.useFakeTimers()` — fake timers bleed into later tests and break `@base-ui/react` portals (they use `requestAnimationFrame`)
- Use `fireEvent.click()` for buttons that open `@base-ui/react` dialogs — `userEvent.click()` hangs due to focus-trap internals
- Use `userEvent.setup({ delay: null })` for typing into inputs
- Find dialog content by heading (`findByRole("heading", { name: /.../ })`) rather than `role="dialog"` — the popup role may not be set until after animation

### After writing tests, always run them
Run `bun run --filter client test` and fix any failures before reporting the task as done.

## E2E Testing

Always use the **`playwright-e2e-writer`** agent when writing or expanding E2E tests. Invoke it whenever:
- A new feature or page has been implemented and needs test coverage
- An existing flow needs additional or updated test cases
- New test utilities, fixtures, or helpers are required

The agent owns all Playwright configuration, test setup details, and best-practice patterns for this project.

## Documentation
Always use Context7 MCP to fetch current documentation for any library or framework used in this project — including Bun, Express, React, React Router, Vite, Prisma, TailwindCSS, and the Gemini API.

Steps:
1. Call `resolve-library-id` with the library name and your question
2. Call `query-docs` with the resolved library ID and your question
3. Use the fetched docs to answer accurately

Do not rely on training data alone for library-specific syntax, configuration, or APIs.

## UI Components
Use **shadcn/ui** when creating new UI components. Add components via:
```bash
bunx --bun shadcn@latest add <component-name>
```
Components are added to `client/src/components/ui/`. Already installed: button, card, input, label, alert, badge, dialog, select.

## Validation
Use **Zod** for all input validation — both client and server.
- **Define schemas in `core/src/schemas/`** and export them from `core/src/index.ts`
- Import schemas in both client and server via `import { mySchema } from "core"`
- On the client: use `schema.shape[field].safeParse(value)` for per-field live validation; use `schema.safeParse(formData)` on submit
- On the server: validate `req.body` at the top of each route handler; return the first issue message on failure (`parsed.error.issues[0].message`)
- Zod is installed in `core/`, `client/`, and `server/` packages
- `core` is a Bun workspace package (`core/package.json`) — add `"core": "workspace:*"` to any package that needs shared schemas

## Data Fetching
- Use **axios** for all HTTP requests in the client (`import axios from "axios"`)
- Use **TanStack Query** (`@tanstack/react-query`) for all server state:
  - `useQuery` for fetching — include relevant variables in the query key so refetches are automatic
  - `useMutation` with `onSuccess: () => qc.invalidateQueries(...)` for writes
  - `placeholderData: (prev) => prev` on paginated queries to avoid loading flashes
- `QueryClientProvider` is already set up in `client/src/main.tsx`

## Auth Patterns
- Client session: `authClient.useSession()` from `better-auth/react`
- Role check: `(session?.user as any)?.role` — role is an `additionalFields` field, not typed in the SDK
- Route protection: `<ProtectedRoute roles={["ADMIN"]}>` — non-matching roles redirect to `/`
- New users: seeded via scripts in `server/prisma/` using `hashPassword` from `better-auth/crypto` + Prisma `user` + `account` records
- Sign-in is blocked for soft-deleted users (`deletedAt !== null`) — enforced in the Better Auth server config

## Key Decisions
- API calls from client to `/api/*` are proxied to the server via Vite config
- AI responses are always agent-approved before sending (no auto-send)
- Refund Request tickets route to a dedicated queue, never auto-responded
- Ticket statuses: open → pending → resolved → closed (auto-close after 24h)
- Tickets reopen automatically if student replies to a resolved/closed ticket
- For users there are no hard deletes, only soft deletes (`deletedAt` timestamp). Deactivate (`isActive: false`) and Delete are separate actions. Deleted users can be viewed in the "Deleted" view and restored via the Restore action (admin only).

## Default Credentials

| User | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `password123` |
| Agent | `agent@example.com` | *(unknown — reset if needed)* |

If sign-in returns "invalid credentials", the password hash in the DB may be stale. Reset it:
```bash
cd server && bun -e "
import { hashPassword } from 'better-auth/crypto';
import prisma from './src/lib/prisma.ts';
const user = await prisma.user.findUnique({ where: { email: 'admin@example.com' }, select: { id: true } });
const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' }, select: { id: true } });
await prisma.account.update({ where: { id: account.id }, data: { password: await hashPassword('password123') } });
console.log('done'); await prisma.\$disconnect();
"
```

The seed script (`server/prisma/seed.ts`) requires `SEED_ADMIN_PASSWORD` to be **at least 16 characters**, but the `.env` default is `password123` (11 chars) — so the seed will skip creation if the user already exists, and will error if run fresh without updating the password length check.

## Related Docs
- [Project Scope](./project-scope.md)
- [Tech Stack](./tech-stack.md)
- [Implementation Plan](./implementation-plan.md)

---

## Karpathy Coding Principles

Behavioral guidelines to reduce common LLM coding mistakes. Bias toward caution over speed — use judgment for trivial tasks.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
