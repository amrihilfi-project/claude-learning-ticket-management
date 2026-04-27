import { Router, Request, Response } from "express";
import { createMessageSchema, updateMessageSchema } from "core";
import { requireSession } from "../middleware/session";
import prisma from "../lib/prisma";
import { summarizeTicket, suggestReply } from "../lib/ai";

const router = Router({ mergeParams: true });

router.use(requireSession);

// ─── Add agent reply ──────────────────────────────────────────────────────────

router.post("/messages", async (req: Request<{ id: string }>, res: Response) => {
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const session = res.locals.session;

  const [message] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        body: parsed.data.body,
        fromStudent: false,
        authorId: session.user.id,
      },
    }),
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "PENDING", updatedAt: new Date() },
    }),
  ]);

  res.status(201).json(message);
});

// ─── AI Regeneration ──────────────────────────────────────────────────────────

router.post("/ai-suggest", async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      assignee: { select: { id: true, name: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const msgs = ticket.messages.map((m) => ({ body: m.body, fromStudent: m.fromStudent }));

  try {
    const summary = await summarizeTicket(ticket.subject, ticket.body, msgs);
    const suggestedReply = await suggestReply(ticket.subject, ticket.body, msgs, ticket.category);

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { summary, suggestedReply },
      include: {
        assignee: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("AI Regeneration Error:", err);
    res.status(500).json({ error: "Failed to regenerate AI content" });
  }
});

// ─── AI Enhance Reply (transient — does not write to DB) ──────────────────────

router.post("/ai-enhance-reply", async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const draft: string | undefined =
    typeof req.body?.draft === "string" ? req.body.draft : undefined;
  const msgs = ticket.messages.map((m) => ({ body: m.body, fromStudent: m.fromStudent }));

  try {
    const enhancedReply = await suggestReply(
      ticket.subject,
      ticket.body,
      msgs,
      ticket.category,
      draft
    );
    if (!enhancedReply) {
      res.status(500).json({ error: "Failed to enhance reply" });
      return;
    }
    res.json({ enhancedReply });
  } catch (err) {
    console.error("AI Enhance Reply Error:", err);
    res.status(500).json({ error: "Failed to enhance reply" });
  }
});

// ─── Edit own reply ───────────────────────────────────────────────────────────

router.patch("/messages/:messageId", async (req: Request<{ id: string; messageId: string }>, res: Response) => {
  const parsed = updateMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const message = await prisma.ticketMessage.findUnique({
    where: { id: req.params.messageId },
  });

  if (!message || message.ticketId !== req.params.id) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const session = res.locals.session;
  if (message.fromStudent || message.authorId !== session.user.id) {
    res.status(403).json({ error: "You can only edit your own replies" });
    return;
  }

  const updated = await prisma.ticketMessage.update({
    where: { id: message.id },
    data: { body: parsed.data.body },
  });

  res.json(updated);
});

// ─── Delete own reply ─────────────────────────────────────────────────────────

router.delete("/messages/:messageId", async (req: Request<{ id: string; messageId: string }>, res: Response) => {
  const message = await prisma.ticketMessage.findUnique({
    where: { id: req.params.messageId },
  });

  if (!message || message.ticketId !== req.params.id) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const session = res.locals.session;
  if (message.fromStudent || message.authorId !== session.user.id) {
    res.status(403).json({ error: "You can only delete your own replies" });
    return;
  }

  await prisma.ticketMessage.delete({ where: { id: message.id } });

  res.status(204).send();
});

export default router;
