import { Router } from "express";
import { inboundEmailSchema } from "core";
import { requireWebhookSecret } from "../middleware/webhookSecret";
import prisma from "../lib/prisma";

const router = Router();

router.post("/inbound-email", requireWebhookSecret, async (req, res) => {
  const parsed = inboundEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { from, subject, textBody, messageId, inReplyTo } = parsed.data;

  try {
    let parentTicket = null;

    if (inReplyTo) {
      // Match via original ticket's emailMessageId
      parentTicket = await prisma.ticket.findFirst({
        where: { emailMessageId: inReplyTo },
      });

      // Match via a reply-to-reply chain (message's emailMessageId)
      if (!parentTicket) {
        const parentMessage = await prisma.ticketMessage.findFirst({
          where: { emailMessageId: inReplyTo },
          include: { ticket: true },
        });
        parentTicket = parentMessage?.ticket ?? null;
      }
    }

    // Fallback: match by normalised subject + sender email
    if (!parentTicket) {
      const normalised = subject.replace(/^(Re:|Fwd:)\s*/gi, "").trim();
      parentTicket = await prisma.ticket.findFirst({
        where: {
          studentEmail: from,
          subject: { equals: normalised, mode: "insensitive" },
          status: { in: ["OPEN", "PENDING", "RESOLVED"] },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!parentTicket) {
      // New ticket
      const ticket = await prisma.ticket.create({
        data: {
          subject,
          body: textBody,
          studentEmail: from,
          emailMessageId: messageId,
        },
      });
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          body: textBody,
          fromStudent: true,
          emailMessageId: messageId,
        },
      });
    } else if (parentTicket.status === "RESOLVED" || parentTicket.status === "CLOSED") {
      // Student replied to a resolved/closed ticket — reopen it
      await prisma.ticket.update({
        where: { id: parentTicket.id },
        data: { status: "OPEN", resolvedAt: null, updatedAt: new Date() },
      });
      await prisma.ticketMessage.create({
        data: {
          ticketId: parentTicket.id,
          body: textBody,
          fromStudent: true,
          emailMessageId: messageId,
        },
      });
    } else {
      // Reply to an active ticket
      await prisma.ticketMessage.create({
        data: {
          ticketId: parentTicket.id,
          body: textBody,
          fromStudent: true,
          emailMessageId: messageId,
        },
      });
      await prisma.ticket.update({
        where: { id: parentTicket.id },
        data: { status: "OPEN", updatedAt: new Date() },
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
