import { Router } from "express";
import { inboundEmailSchema } from "core";
import { requireWebhookSecret } from "../middleware/webhookSecret";
import prisma from "../lib/prisma";
import { classifyTicket, summarizeTicket, suggestReply } from "../lib/ai";

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

    let newTicket = null;
    if (!parentTicket) {
      // New ticket
      newTicket = await prisma.ticket.create({
        data: {
          subject,
          body: textBody,
          studentEmail: from,
          emailMessageId: messageId,
        },
      });
      await prisma.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
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

    const targetTicketId = parentTicket ? parentTicket.id : newTicket?.id;

    if (targetTicketId) {
      try {
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: targetTicketId },
          include: { messages: { orderBy: { createdAt: "asc" } } }
        });
        
        if (fullTicket) {
          const isNew = !parentTicket;
          const msgs = fullTicket.messages.map(m => ({ body: m.body, fromStudent: m.fromStudent }));
          
          let category = fullTicket.category;
          if (isNew) {
            category = await classifyTicket(fullTicket.subject, fullTicket.body);
          }
          
          const summary = await summarizeTicket(fullTicket.subject, fullTicket.body, msgs);
          const suggestedReply = await suggestReply(fullTicket.subject, fullTicket.body, msgs, category);
          
          await prisma.ticket.update({
            where: { id: fullTicket.id },
            data: { category, summary, suggestedReply }
          });
        }
      } catch (err) {
        console.error("AI Enrichment failed:", err);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
