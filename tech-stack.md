## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (dev server + bundler)
- TailwindCSS
- React Router v7
- shadcn/ui (component library — button, card, input, label, alert)
- React Hook Form + Zod (form validation)

### Backend
- Bun runtime
- Node.js + Express
- Prisma (ORM + migrations)
- PostgreSQL

### AI
- Claude API (Sonnet 4.6) — classification, summarization, suggested replies

### Email Ingestion
- SendGrid Inbound Parse or Postmark — webhook on incoming email creates a ticket

### Queue
- Redis + BullMQ — async AI processing so email ingestion is non-blocking

### Authentication
- Better Auth — session-based auth stored in PostgreSQL via Prisma adapter
- Email/password only; sign-up disabled (admin seeds users via script)
- RBAC: `ADMIN` and `AGENT` roles on the User model

### Deployment
- Docker + Docker Compose
