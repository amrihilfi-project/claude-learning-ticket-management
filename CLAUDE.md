# Ticket Management System

## Project Overview
An AI-powered support ticket management system for handling student support emails.

## Tech Stack
- **Runtime**: Bun
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Router v7 (`client/`)
- **Backend**: Node.js, Express, TypeScript, Prisma (`server/`)
- **Database**: PostgreSQL
- **AI**: Claude API (Sonnet 4.6)
- **Queue**: Redis + BullMQ
- **Auth**: Better Auth — email/password, sessions in PostgreSQL via Prisma adapter, RBAC (ADMIN / AGENT roles), sign-up disabled (users seeded by admin script)
- **Deployment**: Docker + Docker Compose

## Project Structure
```
/
├── client/          # React frontend (Vite dev server on :5173)
├── server/          # Express backend (:3000)
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

## Documentation
Always use Context7 MCP to fetch current documentation for any library or framework used in this project — including Bun, Express, React, React Router, Vite, Prisma, TailwindCSS, and the Claude API.

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
Components are added to `client/src/components/ui/`. Already installed: button, card, input, label, alert.

## Key Decisions
- API calls from client to `/api/*` are proxied to the server via Vite config
- AI responses are always agent-approved before sending (no auto-send)
- Refund Request tickets route to a dedicated queue, never auto-responded
- Ticket statuses: open → pending → resolved → closed (auto-close after 24h)
- Tickets reopen automatically if student replies to a resolved/closed ticket

## Related Docs
- [Project Scope](./project-scope.md)
- [Tech Stack](./tech-stack.md)
- [Implementation Plan](./implementation-plan.md)
