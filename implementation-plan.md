## Implementation Plan

---

### Phase 1 — Project Setup
- [x] Initialize monorepo structure (frontend + backend)
- [x] Set up Express server with TypeScript
- [x] Set up React app with TypeScript, Tailwind CSS, and React Router
- [x] Set up PostgreSQL database
- [x] Configure ESLint, Prettier, TypeScript for both frontend and backend

---

### Phase 2 — Authentication
- [ ] Build login page (frontend)
- [ ] Implement login
- [ ] Implement session-based auth (login, logout, session validation)
- [ ] Protect backend routes with session middleware
- [ ] Implement role-based access (admin vs. agent)

---

### Phase 3 — Ticket Core
- [ ] Design `tickets` table (status, category, assignee, timestamps)
- [ ] Build email ingestion webhook endpoint (SendGrid or Postmark)
- [ ] Parse incoming email → create ticket in database
- [ ] Implement ticket status transitions (open → pending → resolved → closed)
- [ ] Implement 24h auto-close job (BullMQ scheduled job)
- [ ] Implement auto-reopen on student reply

---

### Phase 4 — Ticket UI
- [ ] Ticket list page with filtering (status, category) and sorting
- [ ] Ticket detail page (thread view, status controls, assignee)
- [ ] Dashboard with ticket counts by status and category
- [ ] Pagination for ticket list

---

### Phase 5 — AI Features
- [ ] Set up Claude API client
- [ ] Implement AI ticket classification (assign category on ingestion)
- [ ] Implement AI ticket summarization
- [ ] Set up knowledge base storage
- [ ] Implement AI suggested reply (uses knowledge base context)
- [ ] Queue all AI tasks via BullMQ (non-blocking)
- [ ] Display AI summary and suggested reply in ticket detail view
- [ ] Agent approve/edit/send reply flow

---

### Phase 6 — Routing & Refund Handling
- [ ] Implement routing logic (Refund → dedicated queue, others → general pool)
- [ ] Flag Refund Request tickets visually in the UI
- [ ] Suppress auto-actions on Refund tickets (no auto-assign, agent-only)

---

### Phase 7 — User Management (Admin)
- [ ] Admin-only user list page
- [ ] Create / deactivate agent accounts
- [ ] Assign roles (admin, agent)

---

### Phase 8 — Polish & Hardening
- [ ] Input validation and error handling across all endpoints
- [ ] Rate limiting on webhook endpoint
- [ ] PII awareness (review what gets sent to Claude API)
- [ ] Basic logging and error monitoring
- [ ] End-to-end test of full ticket lifecycle
- [ ] Production Docker Compose config (env vars, secrets)
