## Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS
- React Router v7

### Backend
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
- Database sessions (session stored in PostgreSQL)

### Deployment
- Docker + Docker Compose
