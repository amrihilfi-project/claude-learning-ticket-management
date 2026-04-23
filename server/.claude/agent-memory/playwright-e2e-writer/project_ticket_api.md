---
name: Ticket API surface and test data strategy
description: How tickets are created and manipulated in tests; key API details for the ticket lifecycle
type: project
---

Tickets are created exclusively via webhook — there is no "create ticket" button in the UI. Use `POST /api/webhooks/inbound-email?secret=changeme` (no session needed, query-param secret).

The WEBHOOK_SECRET must be present in `.env.test` as `WEBHOOK_SECRET=changeme` — it was missing initially and was added alongside the tickets.spec.ts tests.

The inboundEmailSchema requires: `from` (email), `subject` (non-empty), `messageId` (non-empty), and optional `textBody` (defaults to "") and `inReplyTo`.

Auto-reopen logic: if a student sends a webhook email whose `inReplyTo` matches a RESOLVED or CLOSED ticket's `emailMessageId`, the ticket status is set back to OPEN. Subject-based fallback matching also works (strips Re:/Fwd: prefix, matches by studentEmail + normalised subject).

Ticket statuses: OPEN → PENDING (after agent reply via POST /api/tickets/:id/messages) → RESOLVED (manual PATCH) → CLOSED (manual PATCH or auto-close after 24h). Replying to RESOLVED/CLOSED reopens to OPEN.

**Why:** Phase 4 backend is complete; UI pages (/tickets, /tickets/:id) do not exist yet as of 2026-04-23.
**How to apply:** All ticket test data setup uses the webhook endpoint, not a UI form. UI test stubs use test.skip until the pages are built.
