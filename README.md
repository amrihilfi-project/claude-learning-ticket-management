# Ticket Management System

An AI-powered support ticket management system that automatically classifies, summarizes, and suggests replies for incoming support emails — helping agents respond faster and more consistently.

## Features

- Email ingestion via webhook (SendGrid / Postmark)
- AI-powered ticket classification, summarization, and suggested replies
- Agent approval flow before any reply is sent
- Ticket lifecycle management (open → pending → resolved → closed)
- Auto-close after 24h of no reply; auto-reopen on student reply
- Refund request routing to dedicated queue
- Dashboard with filtering and sorting
- Admin user management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TailwindCSS, React Router v7 |
| Backend | Node.js, Express, Prisma |
| Database | PostgreSQL + pgvector |
| AI | Claude API (Sonnet 4.6) |
| Queue | Redis + BullMQ |
| Auth | Database sessions |
| Deployment | Docker + Docker Compose |

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+

### Run locally

```bash
# Clone the repo
git clone https://github.com/amrihilfi-project/claude-learning-ticket-management.git
cd claude-learning-ticket-management

# Copy environment variables
cp .env.example .env

# Start all services
docker compose up
```

## Project Structure

```
/
├── client/          # React app
├── server/          # Express API
├── docker-compose.yml
└── .env.example
```

## Documentation

- [Project Scope](./project-scope.md)
- [Tech Stack](./tech-stack.md)
- [Implementation Plan](./implementation-plan.md)
