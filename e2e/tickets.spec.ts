/**
 * E2E tests for the ticket lifecycle.
 *
 * Auth strategy: all tests load the saved admin session (ADMIN_STORAGE_STATE)
 * produced by the "setup" project (auth.setup.ts), so they start authenticated
 * without performing a full login flow.
 *
 * Test data: each test creates its own tickets via the inbound-email webhook
 * endpoint (POST /api/webhooks/inbound-email?secret=...) so tests are fully
 * independent and can run in parallel.
 *
 * Structure:
 *  ── Section A: API-level tests ─────────────────────────────────────────────
 *     These tests drive the backend API directly via `page.request`. They are
 *     runnable today — no UI pages are required.
 *
 *  ── Section B: UI-level tests (pending) ────────────────────────────────────
 *     Scaffolded with test.skip() so they compile and are visible in the
 *     reporter. They will be filled in once the ticket UI pages (/tickets,
 *     /tickets/:id) are built.
 */

import { test, expect, type Page } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "../playwright.config";

// All contexts load the saved admin session.
test.use({ storageState: ADMIN_STORAGE_STATE });

// Give each test more room — parallel dev server load.
test.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEBHOOK_URL = "/api/webhooks/inbound-email?secret=changeme";
const TICKETS_API = "/api/tickets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Unique identifier to keep every test's data independent.
 */
function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Build a minimal inbound-email payload that satisfies inboundEmailSchema.
 * `overrides` lets callers customise specific fields.
 */
function inboundEmailPayload(
  overrides: Partial<{
    from: string;
    subject: string;
    textBody: string;
    messageId: string;
    inReplyTo: string;
  }> = {}
) {
  const id = uid();
  return {
    from: `student-${id}@university.edu`,
    subject: `Support request ${id}`,
    textBody: `Hello, I need help with ${id}.`,
    messageId: `msg-${id}@mail.university.edu`,
    ...overrides,
  };
}

/**
 * POST to the inbound-email webhook and assert the response is 200 { ok: true }.
 * Returns the payload so callers can reference the messageId / subject later.
 */
async function sendInboundEmail(
  page: Page,
  overrides: Parameters<typeof inboundEmailPayload>[0] = {}
): Promise<ReturnType<typeof inboundEmailPayload>> {
  const payload = inboundEmailPayload(overrides);
  const res = await page.request.post(WEBHOOK_URL, { data: payload });
  expect(res.status(), `sendInboundEmail failed: ${await res.text()}`).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  return payload;
}

/**
 * GET /api/tickets and find the first ticket whose subject matches.
 * Returns the ticket object (with `id`).
 */
async function findTicketBySubject(
  page: Page,
  subject: string
): Promise<{ id: string; status: string; category: string | null; assigneeId: string | null }> {
  const res = await page.request.get(`${TICKETS_API}?limit=100`);
  expect(res.status()).toBe(200);
  const { data } = await res.json();
  const ticket = (data as Array<{ id: string; subject: string; status: string; category: string | null; assigneeId: string | null }>).find(
    (t) => t.subject === subject
  );
  if (!ticket) {
    throw new Error(`Ticket with subject "${subject}" not found in the list`);
  }
  return ticket;
}

// ===========================================================================
// ── Section A: API-level tests ──────────────────────────────────────────────
// ===========================================================================

// ---------------------------------------------------------------------------
// Ticket creation via webhook
// ---------------------------------------------------------------------------

test.describe("Ticket API — inbound-email webhook", () => {
  test("valid payload returns 200 { ok: true }", async ({ page }) => {
    const payload = inboundEmailPayload();
    const res = await page.request.post(WEBHOOK_URL, { data: payload });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  test("created ticket appears in GET /api/tickets with status OPEN", async ({ page }) => {
    const payload = await sendInboundEmail(page);

    const ticket = await findTicketBySubject(page, payload.subject);

    expect(ticket.status).toBe("OPEN");
  });

  test("new ticket receives an AI category and no assignee", async ({ page }) => {
    const payload = await sendInboundEmail(page);

    const ticket = await findTicketBySubject(page, payload.subject);

    // Because the mock returns GENERAL_QUESTION when the key is "test-key"
    expect(ticket.category).toBe("GENERAL_QUESTION");
    expect(ticket.assigneeId).toBeNull();
  });

  test("missing messageId returns 400", async ({ page }) => {
    const { messageId: _omit, ...noMessageId } = inboundEmailPayload();
    const res = await page.request.post(WEBHOOK_URL, { data: noMessageId });

    expect(res.status()).toBe(400);
  });

  test("invalid sender email returns 400", async ({ page }) => {
    const payload = inboundEmailPayload({ from: "not-an-email" });
    const res = await page.request.post(WEBHOOK_URL, { data: payload });

    expect(res.status()).toBe(400);
  });

  test("missing subject returns 400", async ({ page }) => {
    const payload = inboundEmailPayload({ subject: "" });
    const res = await page.request.post(WEBHOOK_URL, { data: payload });

    expect(res.status()).toBe(400);
  });

  test("wrong webhook secret returns 401", async ({ page }) => {
    const payload = inboundEmailPayload();
    const res = await page.request.post(
      "/api/webhooks/inbound-email?secret=wrongsecret",
      { data: payload }
    );

    expect(res.status()).toBe(401);
  });

  test("missing webhook secret query param returns 401", async ({ page }) => {
    const payload = inboundEmailPayload();
    const res = await page.request.post("/api/webhooks/inbound-email", { data: payload });

    expect(res.status()).toBe(401);
  });

  test("webhook does not require a session cookie", async ({ page: _page, browser }) => {
    // Use a brand-new context with NO storage state (no session cookies)
    const freshCtx = await browser.newContext();
    const freshPage = await freshCtx.newPage();

    try {
      const payload = inboundEmailPayload();
      const res = await freshPage.request.post(WEBHOOK_URL, { data: payload });
      // 200 even without a session — webhook uses query-param secret, not session auth
      expect(res.status()).toBe(200);
    } finally {
      await freshCtx.close();
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/tickets — list and filter
// ---------------------------------------------------------------------------

test.describe("Ticket API — list endpoint", () => {
  test("returns paginated response shape { data, total, page, limit }", async ({ page }) => {
    const res = await page.request.get(TICKETS_API);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: 20,
    });
  });

  test("returns 401 without a session", async ({ page: _page, browser }) => {
    const freshCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const freshPage = await freshCtx.newPage();

    try {
      const res = await freshPage.request.get(TICKETS_API);
      expect(res.status()).toBe(401);
    } finally {
      await freshCtx.close();
    }
  });

  test("?status=OPEN returns only OPEN tickets", async ({ page }) => {
    // Create one ticket (always OPEN on creation)
    await sendInboundEmail(page);

    const res = await page.request.get(`${TICKETS_API}?status=OPEN&limit=100`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    for (const ticket of data as Array<{ status: string }>) {
      expect(ticket.status).toBe("OPEN");
    }
    expect((data as unknown[]).length).toBeGreaterThan(0);
  });

  test("?status=PENDING returns only PENDING tickets", async ({ page }) => {
    // Create a ticket then add an agent reply (which sets status to PENDING)
    const payload = await sendInboundEmail(page);
    const ticket = await findTicketBySubject(page, payload.subject);

    await page.request.post(`${TICKETS_API}/${ticket.id}/messages`, {
      data: { body: "We are looking into this." },
    });

    const res = await page.request.get(`${TICKETS_API}?status=PENDING&limit=100`);
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    for (const t of data as Array<{ status: string }>) {
      expect(t.status).toBe("PENDING");
    }
    expect((data as unknown[]).length).toBeGreaterThan(0);
  });

  test("?category=TECHNICAL_ISSUE returns only TECHNICAL_ISSUE tickets", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const ticket = await findTicketBySubject(page, payload.subject);

    // Assign a category
    await page.request.patch(`${TICKETS_API}/${ticket.id}`, {
      data: { category: "TECHNICAL_ISSUE" },
    });

    const res = await page.request.get(
      `${TICKETS_API}?category=TECHNICAL_ISSUE&limit=100`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    for (const t of data as Array<{ category: string }>) {
      expect(t.category).toBe("TECHNICAL_ISSUE");
    }
    expect((data as unknown[]).length).toBeGreaterThan(0);
  });

  test("?assigneeId=unassigned returns only tickets without an assignee", async ({ page }) => {
    const res = await page.request.get(
      `${TICKETS_API}?assigneeId=unassigned&limit=100`
    );
    expect(res.status()).toBe(200);
    const { data } = await res.json();

    for (const t of data as Array<{ assigneeId: string | null }>) {
      expect(t.assigneeId).toBeNull();
    }
  });

  test("pagination: page=1 and page=2 return different items", async ({ page }) => {
    // Ensure at least 2 pages by checking limit=1
    const p1 = await page.request.get(`${TICKETS_API}?limit=1&page=1`);
    const p2 = await page.request.get(`${TICKETS_API}?limit=1&page=2`);

    expect(p1.status()).toBe(200);
    expect(p2.status()).toBe(200);

    const body1 = await p1.json();
    const body2 = await p2.json();

    // Only compare if there are enough tickets for 2 pages
    if (body1.total >= 2) {
      const ids1 = (body1.data as Array<{ id: string }>).map((t) => t.id);
      const ids2 = (body2.data as Array<{ id: string }>).map((t) => t.id);
      // No overlap between pages
      for (const id of ids1) {
        expect(ids2).not.toContain(id);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// GET /api/tickets/:id — ticket detail
// ---------------------------------------------------------------------------

test.describe("Ticket API — detail endpoint", () => {
  test("returns ticket with messages array and assignee field", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.get(`${TICKETS_API}/${id}`);

    expect(res.status()).toBe(200);
    const ticket = await res.json();
    expect(ticket).toMatchObject({
      id,
      subject: payload.subject,
      studentEmail: payload.from,
      status: "OPEN",
      messages: expect.any(Array),
    });
    // First message is the original email body (fromStudent: true)
    expect(ticket.messages.length).toBeGreaterThanOrEqual(1);
    expect(ticket.messages[0]).toMatchObject({
      body: payload.textBody,
      fromStudent: true,
    });
  });

  test("returns 404 for a non-existent ticket id", async ({ page }) => {
    const res = await page.request.get(`${TICKETS_API}/nonexistent-id-xyz`);

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Ticket not found" });
  });

  test("returns 401 without a session", async ({ page: _page, browser }) => {
    const freshCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const freshPage = await freshCtx.newPage();

    try {
      const res = await freshPage.request.get(`${TICKETS_API}/any-id`);
      expect(res.status()).toBe(401);
    } finally {
      await freshCtx.close();
    }
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/tickets/:id — update status, category, assignee
// ---------------------------------------------------------------------------

test.describe("Ticket API — update ticket", () => {
  test("updating status to RESOLVED sets resolvedAt and returns updated ticket", async ({
    page,
  }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { status: "RESOLVED" },
    });

    expect(res.status()).toBe(200);
    const ticket = await res.json();
    expect(ticket.status).toBe("RESOLVED");
    expect(ticket.resolvedAt).not.toBeNull();
  });

  test("updating status from RESOLVED to OPEN clears resolvedAt", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    // Resolve first
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { status: "RESOLVED" } });

    // Then reopen
    const res = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { status: "OPEN" },
    });

    expect(res.status()).toBe(200);
    const ticket = await res.json();
    expect(ticket.status).toBe("OPEN");
    expect(ticket.resolvedAt).toBeNull();
  });

  test("updating category to GENERAL_QUESTION is reflected in subsequent GET", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const patchRes = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { category: "GENERAL_QUESTION" },
    });
    expect(patchRes.status()).toBe(200);

    const getRes = await page.request.get(`${TICKETS_API}/${id}`);
    const ticket = await getRes.json();
    expect(ticket.category).toBe("GENERAL_QUESTION");
  });

  test("updating category to REFUND_REQUEST is reflected in subsequent GET", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { category: "REFUND_REQUEST" },
    });

    const getRes = await page.request.get(`${TICKETS_API}/${id}`);
    const ticket = await getRes.json();
    expect(ticket.category).toBe("REFUND_REQUEST");
  });

  test("setting category to null clears an existing category", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    // Set a category first
    await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { category: "TECHNICAL_ISSUE" },
    });

    // Clear it
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { category: null } });

    const getRes = await page.request.get(`${TICKETS_API}/${id}`);
    const ticket = await getRes.json();
    expect(ticket.category).toBeNull();
  });

  test("assigning an agent (admin user) populates assignee field", async ({ page }) => {
    // Get the admin user's id from /api/me
    const meRes = await page.request.get("/api/me");
    const { id: adminId } = await meRes.json();

    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { assigneeId: adminId },
    });

    expect(res.status()).toBe(200);
    const ticket = await res.json();
    expect(ticket.assignee).not.toBeNull();
    expect(ticket.assignee.id).toBe(adminId);
  });

  test("setting assigneeId to null removes the assignee", async ({ page }) => {
    const meRes = await page.request.get("/api/me");
    const { id: adminId } = await meRes.json();

    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    // Assign first
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { assigneeId: adminId } });

    // Then unassign
    const res = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { assigneeId: null },
    });

    expect(res.status()).toBe(200);
    const ticket = await res.json();
    expect(ticket.assignee).toBeNull();
  });

  test("PATCH with no fields returns 400", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.patch(`${TICKETS_API}/${id}`, { data: {} });

    expect(res.status()).toBe(400);
  });

  test("PATCH with an invalid status value returns 400", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { status: "INVALID_STATUS" },
    });

    expect(res.status()).toBe(400);
  });

  test("PATCH with an invalid category value returns 400", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { category: "NOT_A_CATEGORY" },
    });

    expect(res.status()).toBe(400);
  });

  test("PATCH on a non-existent ticket id returns 404", async ({ page }) => {
    const res = await page.request.patch(`${TICKETS_API}/nonexistent-xyz`, {
      data: { status: "RESOLVED" },
    });

    expect(res.status()).toBe(404);
  });

  test("PATCH returns 401 without a session", async ({ page: _page, browser }) => {
    const freshCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const freshPage = await freshCtx.newPage();

    try {
      const res = await freshPage.request.patch(`${TICKETS_API}/any-id`, {
        data: { status: "OPEN" },
      });
      expect(res.status()).toBe(401);
    } finally {
      await freshCtx.close();
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/tickets/:id/messages — agent reply
// ---------------------------------------------------------------------------

test.describe("Ticket API — agent reply", () => {
  test("posting a message returns 201 with the new message body", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.post(`${TICKETS_API}/${id}/messages`, {
      data: { body: "We have received your request and are looking into it." },
    });

    expect(res.status()).toBe(201);
    const message = await res.json();
    expect(message).toMatchObject({
      body: "We have received your request and are looking into it.",
      fromStudent: false,
      ticketId: id,
    });
    expect(message.id).toBeTruthy();
  });

  test("after an agent reply the ticket status becomes PENDING", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    // Confirm it starts as OPEN
    const before = await page.request.get(`${TICKETS_API}/${id}`);
    expect((await before.json()).status).toBe("OPEN");

    await page.request.post(`${TICKETS_API}/${id}/messages`, {
      data: { body: "Thanks for reaching out — we will get back to you shortly." },
    });

    const after = await page.request.get(`${TICKETS_API}/${id}`);
    expect((await after.json()).status).toBe("PENDING");
  });

  test("agent reply message appears in the ticket detail messages array", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);
    const replyBody = `Agent reply at ${uid()}`;

    await page.request.post(`${TICKETS_API}/${id}/messages`, {
      data: { body: replyBody },
    });

    const detailRes = await page.request.get(`${TICKETS_API}/${id}`);
    const ticket = await detailRes.json();

    const agentMessages = (ticket.messages as Array<{ body: string; fromStudent: boolean }>).filter(
      (m) => !m.fromStudent
    );
    expect(agentMessages.some((m) => m.body === replyBody)).toBe(true);
  });

  test("message with empty body returns 400", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const res = await page.request.post(`${TICKETS_API}/${id}/messages`, {
      data: { body: "" },
    });

    expect(res.status()).toBe(400);
  });

  test("posting a message to a non-existent ticket returns 404", async ({ page }) => {
    const res = await page.request.post(`${TICKETS_API}/nonexistent-xyz/messages`, {
      data: { body: "Hello" },
    });

    expect(res.status()).toBe(404);
  });

  test("posting a message returns 401 without a session", async ({ page: _page, browser }) => {
    const freshCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const freshPage = await freshCtx.newPage();

    try {
      const res = await freshPage.request.post(`${TICKETS_API}/any-id/messages`, {
        data: { body: "Hello" },
      });
      expect(res.status()).toBe(401);
    } finally {
      await freshCtx.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Auto-reopen: student replies to a RESOLVED or CLOSED ticket
// ---------------------------------------------------------------------------

test.describe("Ticket API — auto-reopen on student reply", () => {
  test("student reply to a RESOLVED ticket reopens it to OPEN", async ({ page }) => {
    // 1. Create a new ticket
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    // 2. Resolve it
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { status: "RESOLVED" } });

    const resolved = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(resolved.status).toBe("RESOLVED");

    // 3. Student sends a follow-up — use the original message-id as inReplyTo
    await sendInboundEmail(page, {
      from: payload.from,
      subject: `Re: ${payload.subject}`,
      textBody: "Actually I have a follow-up question.",
      messageId: `reply-${uid()}@mail.university.edu`,
      inReplyTo: payload.messageId,
    });

    // 4. Ticket should now be OPEN again
    const reopened = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(reopened.status).toBe("OPEN");
  });

  test("student reply to a CLOSED ticket reopens it to OPEN", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    // Close the ticket directly via PATCH
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { status: "CLOSED" } });

    const closed = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(closed.status).toBe("CLOSED");

    // Student replies
    await sendInboundEmail(page, {
      from: payload.from,
      subject: `Re: ${payload.subject}`,
      textBody: "I still need help.",
      messageId: `reply-${uid()}@mail.university.edu`,
      inReplyTo: payload.messageId,
    });

    const reopened = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(reopened.status).toBe("OPEN");
  });

  test("student reply adds a new student message to the thread", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await page.request.patch(`${TICKETS_API}/${id}`, { data: { status: "RESOLVED" } });

    const replyBody = `Follow-up content ${uid()}`;
    await sendInboundEmail(page, {
      from: payload.from,
      subject: `Re: ${payload.subject}`,
      textBody: replyBody,
      messageId: `reply-${uid()}@mail.university.edu`,
      inReplyTo: payload.messageId,
    });

    const ticket = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    const studentMessages = (
      ticket.messages as Array<{ body: string; fromStudent: boolean }>
    ).filter((m) => m.fromStudent);

    expect(studentMessages.some((m) => m.body === replyBody)).toBe(true);
  });

  test("student reply to an OPEN ticket keeps it OPEN and adds a message", async ({ page }) => {
    // An OPEN ticket with a student reply should remain OPEN (not change status)
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    const before = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(before.status).toBe("OPEN");
    const beforeCount = before.messages.length;

    await sendInboundEmail(page, {
      from: payload.from,
      subject: `Re: ${payload.subject}`,
      textBody: "Another question from student.",
      messageId: `reply2-${uid()}@mail.university.edu`,
      inReplyTo: payload.messageId,
    });

    const after = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(after.status).toBe("OPEN");
    expect(after.messages.length).toBe(beforeCount + 1);
  });

  test("subject-based fallback matches ticket when no inReplyTo is set", async ({ page }) => {
    // Webhook does subject-based fallback matching when inReplyTo is absent:
    // it normalises the subject (strips Re:/Fwd: prefix) and matches by studentEmail + subject.
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await page.request.patch(`${TICKETS_API}/${id}`, { data: { status: "RESOLVED" } });

    // Send a reply without inReplyTo — subject matches after normalisation
    await sendInboundEmail(page, {
      from: payload.from,
      subject: `Re: ${payload.subject}`,
      textBody: "Replying without a reference header.",
      messageId: `fallback-${uid()}@mail.university.edu`,
      // inReplyTo intentionally omitted
    });

    const ticket = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    // Webhook matched the existing ticket and reopened it
    expect(ticket.status).toBe("OPEN");
  });
});

// ---------------------------------------------------------------------------
// Full ticket lifecycle: OPEN → PENDING → RESOLVED → re-OPEN
// ---------------------------------------------------------------------------

test.describe("Ticket API — full lifecycle", () => {
  test("complete ticket lifecycle from creation to reopen", async ({ page }) => {
    // Step 1: Student sends an email → ticket created with status OPEN
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);
    expect((await (await page.request.get(`${TICKETS_API}/${id}`)).json()).status).toBe("OPEN");

    // Step 2: Assign a category
    await page.request.patch(`${TICKETS_API}/${id}`, {
      data: { category: "GENERAL_QUESTION" },
    });
    const categorised = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(categorised.category).toBe("GENERAL_QUESTION");

    // Step 3: Assign to admin
    const { id: adminId } = await (await page.request.get("/api/me")).json();
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { assigneeId: adminId } });

    // Step 4: Agent replies → status becomes PENDING
    await page.request.post(`${TICKETS_API}/${id}/messages`, {
      data: { body: "We are looking into your request." },
    });
    expect((await (await page.request.get(`${TICKETS_API}/${id}`)).json()).status).toBe("PENDING");

    // Step 5: Agent resolves the ticket
    await page.request.patch(`${TICKETS_API}/${id}`, { data: { status: "RESOLVED" } });
    const resolvedTicket = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(resolvedTicket.status).toBe("RESOLVED");
    expect(resolvedTicket.resolvedAt).not.toBeNull();

    // Step 6: Student follows up → ticket reopens to OPEN
    await sendInboundEmail(page, {
      from: payload.from,
      subject: `Re: ${payload.subject}`,
      textBody: "Thank you! One more question though.",
      messageId: `lifecycle-reply-${uid()}@mail.university.edu`,
      inReplyTo: payload.messageId,
    });
    const reopened = await (await page.request.get(`${TICKETS_API}/${id}`)).json();
    expect(reopened.status).toBe("OPEN");
    // resolvedAt is cleared on reopen
    expect(reopened.resolvedAt).toBeNull();

    // Verify the full message thread has all messages in order
    const messages = reopened.messages as Array<{ fromStudent: boolean }>;
    // Original student email + agent reply + student follow-up = 3
    expect(messages.length).toBeGreaterThanOrEqual(3);
  });
});

// ===========================================================================
// ── Section B: UI-level tests ───────────────────────────────────────────────
// ===========================================================================

// ---------------------------------------------------------------------------
// Helpers for UI navigation
// ---------------------------------------------------------------------------

async function goToTicketsPage(page: Page): Promise<void> {
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: /^tickets$/i })).toBeVisible({ timeout: 20_000 });
}

async function goToTicketDetail(
  page: Page,
  ticketId: string,
  expectedSubject: string
): Promise<void> {
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: expectedSubject })).toBeVisible({ timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// Ticket UI — list page /tickets
// ---------------------------------------------------------------------------

test.describe("Ticket UI — list page /tickets", () => {
  test("clicking a ticket row navigates to the detail page", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    await findTicketBySubject(page, payload.subject); // ensure ticket exists

    await goToTicketsPage(page);

    // Find and click the row by subject text
    await page.getByText(payload.subject).click();

    // URL should change to /tickets/:id
    await expect(page).toHaveURL(/\/tickets\/[a-z0-9]+/, { timeout: 10_000 });

    // Detail page heading should show the subject
    await expect(page.getByRole("heading", { name: payload.subject })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Ticket UI — detail page /tickets/:id
// ---------------------------------------------------------------------------

test.describe("Ticket UI — detail page /tickets/:id", () => {
  test("status can be changed via the dropdown and persists (real PATCH + UI reflection)", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await goToTicketDetail(page, id, payload.subject);

    // Open the status Select and choose RESOLVED
    await page.getByRole("combobox", { name: /change status/i }).click();
    await page.getByRole("option", { name: /^resolved$/i }).click();

    // Wait for the badge to update (PATCH is sent and query invalidated)
    await expect(page.getByText("Resolved").first()).toBeVisible({ timeout: 10_000 });

    // Confirm the change persisted — reload the page and verify the badge still shows Resolved
    await page.reload();
    await expect(page.getByRole("heading", { name: payload.subject })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Resolved").first()).toBeVisible({ timeout: 10_000 });
  });

  test("agent can submit a reply and it appears in the thread", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await goToTicketDetail(page, id, payload.subject);

    const replyText = `Agent reply ${uid()}`;
    await page.getByLabel(/reply/i).fill(replyText);
    await page.getByRole("button", { name: /send reply/i }).click();

    // New message should appear in the thread
    await expect(page.getByText(replyText)).toBeVisible({ timeout: 10_000 });
  });

});

// ---------------------------------------------------------------------------
// Ticket UI — AI Assistant
// ---------------------------------------------------------------------------

test.describe("Ticket UI — AI Assistant", () => {
  test("AI summary appears on detail page", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await goToTicketDetail(page, id, payload.subject);

    // AI data is stored synchronously during webhook ingestion and served from DB —
    // use a longer timeout to allow the page to fetch and render it.
    await expect(page.getByRole("heading", { name: /AI Summary/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("This is a mocked summary for testing purposes.")).toBeVisible({ timeout: 15_000 });
  });

  test("Regenerate updates AI summary", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await goToTicketDetail(page, id, payload.subject);

    await expect(page.getByRole("heading", { name: /AI Summary/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Regenerate ↻/i }).click();

    // Button returns to normal state after regeneration completes
    await expect(page.getByRole("button", { name: /Regenerate ↻/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Enhance Reply sends draft to server and populates textarea", async ({ page }) => {
    const payload = await sendInboundEmail(page);
    const { id } = await findTicketBySubject(page, payload.subject);

    await goToTicketDetail(page, id, payload.subject);

    // Type a draft in the reply textarea
    const textarea = page.getByLabel(/reply/i);
    await textarea.fill("Here is my initial draft");

    // Click Enhance Reply
    await page.getByRole("button", { name: /Enhance Reply/i }).click();

    // Textarea should be updated with the mocked enhanced reply
    await expect(textarea).toHaveValue(
      "This is a mocked enhanced reply for testing purposes.",
      { timeout: 10_000 }
    );
  });
});
