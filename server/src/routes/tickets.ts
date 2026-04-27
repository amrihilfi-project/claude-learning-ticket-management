import { Router } from "express";
import { updateTicketSchema } from "core";
import { requireSession } from "../middleware/session";
import prisma from "../lib/prisma";

const router = Router();

router.use(requireSession);

// ─── List tickets ─────────────────────────────────────────────────────────────

const TICKET_SORT_FIELDS = ["subject", "studentEmail", "status", "category", "createdAt", "assignee"] as const;
type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];

router.get("/", async (req, res) => {
  const session = res.locals.session;
  const { status, category, assigneeId } = req.query;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const sortByParam = req.query.sortBy as string;
  const sortBy: TicketSortField = TICKET_SORT_FIELDS.includes(sortByParam as TicketSortField)
    ? (sortByParam as TicketSortField)
    : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;

  if (session.user.role === "AGENT") {
    if (assigneeId === session.user.id) {
      where.assigneeId = session.user.id;
    } else if (assigneeId === "unassigned") {
      where.assigneeId = null;
    } else {
      where.OR = [{ assigneeId: session.user.id }, { assigneeId: null }];
    }
  } else {
    if (assigneeId === "unassigned") {
      where.assigneeId = null;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        subject: true,
        studentEmail: true,
        status: true,
        category: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        sortBy === "assignee"
          ? { assignee: { name: sortOrder } }
          : { [sortBy]: sortOrder },
        { id: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ]);

  // Ensure null fields are preserved in JSON (not stripped as undefined)
  const data = tickets.map((t) => ({
    ...t,
    category: t.category ?? null,
    assigneeId: t.assigneeId ?? null,
    assignee: t.assignee ?? null,
  }));

  res.json({ data, total, page, limit });
});

// ─── Ticket detail ────────────────────────────────────────────────────────────

router.get("/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignee: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

// ─── Update ticket ────────────────────────────────────────────────────────────

router.patch("/:id", async (req, res) => {
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const { status, category, assigneeId } = parsed.data;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (status !== undefined) {
    data.status = status;
    if (status === "RESOLVED") {
      data.resolvedAt = new Date();
    } else if (status === "OPEN" || status === "PENDING") {
      data.resolvedAt = null;
    }
  }
  if (category !== undefined) data.category = category;
  if (assigneeId !== undefined) data.assigneeId = assigneeId;

  const updated = await prisma.ticket.update({
    where: { id: req.params.id },
    data,
    include: {
      assignee: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  res.json(updated);
});


export default router;
