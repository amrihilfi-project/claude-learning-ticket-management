import { z } from "zod";

export const inboundEmailSchema = z.object({
  from: z.string().email("Invalid sender email"),
  subject: z.string().min(1, "Subject is required"),
  textBody: z.string().default(""),
  messageId: z.string().min(1, "Message-ID is required"),
  inReplyTo: z.string().optional(),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional(),
    category: z
      .enum(["GENERAL_QUESTION", "TECHNICAL_ISSUE", "REFUND_REQUEST"])
      .nullable()
      .optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field is required",
  });

export const createMessageSchema = z.object({
  body: z.string().min(1, "Message body is required"),
});
