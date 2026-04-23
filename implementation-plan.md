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
- [x] Build login page (frontend) — React Hook Form + Zod validation, error UI
- [x] Implement login — Better Auth email/password (sign-up disabled; admin seeds users)
- [x] Implement session-based auth (login, logout, session validation)
- [x] Protect backend routes with session middleware
- [x] Implement role-based access (admin vs. agent)
- [x] ProtectedRoute component on client
- [x] NavBar with session-aware sign-out

---

### Phase 3 — User Management (Admin)
- [x] Admin-only user list page
- [x] Create / deactivate agent accounts
- [x] Assign roles (admin, agent)

---

### Phase 4 — Ticket Core & UI
- [x] Design `tickets` table (status, category, assignee, timestamps, emailMessageId for threading)
- [x] Build email ingestion webhook endpoint (SendGrid / Mailgun compatible — secret via query param)
- [x] Parse incoming email → create ticket in database (synchronous, no queue)
- [x] Implement ticket status transitions (open → pending → resolved → closed)
- [x] Implement 24h auto-close (setInterval poller — no external queue needed)
- [x] Implement auto-reopen on student reply
- [x] Ticket list page with filtering (status, category) and sorting
- [x] Ticket detail page (thread view, status controls, assignee)
- [x] Dashboard with ticket counts by status and category
- [x] Pagination for ticket list

---

### Phase 5 — AI Features
- [x] Set up Gemini API client
- [x] Implement AI ticket classification (assign category on ingestion)
- [x] Implement AI ticket summarization
- [x] Display AI summary and suggested reply in ticket detail view
- [x] Agent approve/edit/send reply flow

---

### Phase 6 — Routing & Refund Handling
- [ ] Implement routing logic (Refund → dedicated queue, others → general pool)
- [ ] Flag Refund Request tickets visually in the UI
- [ ] Suppress auto-actions on Refund tickets (no auto-assign, agent-only)

---

### Phase 7 — Polish & Hardening
- [ ] Input validation and error handling across all endpoints
- [ ] Rate limiting on webhook endpoint
- [ ] PII awareness (review what gets sent to Gemini API)
- [ ] Basic logging and error monitoring
- [ ] End-to-end test of full ticket lifecycle
- [ ] Production Docker Compose config (env vars, secrets)

### Phase 8 - Evaluation
- [x] Create an extremely detailed list on what was done to reach this built so that I can reference it to build it again.
 