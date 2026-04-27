import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = new Anthropic({ apiKey: apiKey || "test-key" });

const MODEL = "claude-haiku-4-5";

type Message = {
  body: string;
  fromStudent: boolean;
};

export type TicketCategory = "GENERAL_QUESTION" | "TECHNICAL_ISSUE" | "REFUND_REQUEST";

export async function classifyTicket(subject: string, body: string): Promise<TicketCategory | null> {
  if (!apiKey || apiKey.includes("test-key")) return "GENERAL_QUESTION";

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 20,
      system: `You are an expert customer support classifier.
Classify the given support ticket into exactly one of the following categories:
- GENERAL_QUESTION: For questions about the product, pricing, how-tos, or general inquiries.
- TECHNICAL_ISSUE: For bugs, errors, login problems, or unexpected system behavior.
- REFUND_REQUEST: For users explicitly asking for their money back, canceling for a refund, etc.

You must reply with ONLY the category name. No other text.`,
      messages: [{ role: "user", content: `Subject: ${subject}\n\nBody: ${body}` }],
    });

    const result = (response.content[0] as { type: string; text: string }).text.trim();
    if (result === "GENERAL_QUESTION" || result === "TECHNICAL_ISSUE" || result === "REFUND_REQUEST") {
      return result;
    }
    return "GENERAL_QUESTION";
  } catch (error) {
    console.error("AI Classification Error:", error);
    return null;
  }
}

export async function summarizeTicket(subject: string, body: string, messages: Message[] = []): Promise<string | null> {
  if (!apiKey || apiKey.includes("test-key")) return "This is a mocked summary for testing purposes.";

  try {
    let thread = `Original Ticket:\nSubject: ${subject}\nBody: ${body}\n\n`;
    if (messages.length > 0) {
      thread += "Conversation History:\n";
      messages.forEach((msg, idx) => {
        const sender = msg.fromStudent ? "Student" : "Agent";
        thread += `${idx + 1}. [${sender}]: ${msg.body}\n`;
      });
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: `You are a helpful customer support assistant.
Read the support ticket and any conversation history.
Write a concise, 2-3 sentence summary of the current state of the issue.
Focus on what the user needs and what has been done so far.
Do not use conversational filler, just provide the summary.`,
      messages: [{ role: "user", content: thread }],
    });

    return (response.content[0] as { type: string; text: string }).text.trim() || null;
  } catch (error) {
    console.error("AI Summarization Error:", error);
    return null;
  }
}

export async function suggestReply(
  subject: string,
  body: string,
  messages: Message[] = [],
  category?: TicketCategory | null,
  draft?: string
): Promise<string | null> {
  if (!apiKey || apiKey.includes("test-key")) {
    return draft
      ? "This is a mocked enhanced reply for testing purposes."
      : "This is a mocked suggested reply for testing purposes.";
  }

  try {
    let thread = `Category: ${category || "Uncategorized"}\n\nOriginal Ticket:\nSubject: ${subject}\nBody: ${body}\n\n`;
    if (messages.length > 0) {
      thread += "Conversation History:\n";
      messages.forEach((msg, idx) => {
        const sender = msg.fromStudent ? "Student" : "Agent";
        thread += `${idx + 1}. [${sender}]: ${msg.body}\n`;
      });
    }
    if (draft) {
      thread += `\nAgent's draft reply:\n${draft}`;
    }

    const system = draft
      ? `You are a professional customer support agent.
The agent has started drafting a reply. Improve and polish it while addressing the student's issue.
Keep the agent's intent but make it clearer, more professional, and more helpful.
- If it's a REFUND_REQUEST, be empathetic and state that the refund team is reviewing it.
- If it's a TECHNICAL_ISSUE, suggest common troubleshooting steps or mention that the tech team is looking into it.
- If it's a GENERAL_QUESTION, answer to the best of your ability in a helpful manner.
Do not include subject lines or placeholder brackets like [Your Name]. Just write the body of the message.`
      : `You are a professional customer support agent.
Draft a helpful, friendly, and concise reply to the student.
Use the conversation history and category to contextually inform your reply.
- If it's a REFUND_REQUEST, be empathetic and state that the refund team is reviewing it.
- If it's a TECHNICAL_ISSUE, suggest common troubleshooting steps or mention that the tech team is looking into it.
- If it's a GENERAL_QUESTION, answer to the best of your ability in a helpful manner.
Do not include subject lines or placeholder brackets like [Your Name]. Just write the body of the message.`;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system,
      messages: [{ role: "user", content: thread }],
    });

    return (response.content[0] as { type: string; text: string }).text.trim() || null;
  } catch (error) {
    console.error("AI Reply Suggestion Error:", error);
    return null;
  }
}
