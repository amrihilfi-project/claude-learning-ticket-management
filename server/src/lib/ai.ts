import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-for-tests" });
const MODEL = "gemini-2.5-flash";

type Message = {
  body: string;
  fromStudent: boolean;
};

export type TicketCategory = "GENERAL_QUESTION" | "TECHNICAL_ISSUE" | "REFUND_REQUEST";

/**
 * Classifies a new ticket based on its subject and body.
 */
export async function classifyTicket(subject: string, body: string): Promise<TicketCategory | null> {
  if (!apiKey || apiKey.includes("test-key") || apiKey.includes("your-gemini-api-key")) return "GENERAL_QUESTION"; // Mock for tests

  try {
    const prompt = `Subject: ${subject}\n\nBody: ${body}`;
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: `You are an expert customer support classifier. 
Classify the given support ticket into exactly one of the following categories:
- GENERAL_QUESTION: For questions about the product, pricing, how-tos, or general inquiries.
- TECHNICAL_ISSUE: For bugs, errors, login problems, or unexpected system behavior.
- REFUND_REQUEST: For users explicitly asking for their money back, canceling for a refund, etc.

You must reply with ONLY the category name. No other text.`,
        temperature: 0.1,
      },
    });

    const result = response.text?.trim();
    if (result === "GENERAL_QUESTION" || result === "TECHNICAL_ISSUE" || result === "REFUND_REQUEST") {
      return result;
    }
    return "GENERAL_QUESTION"; // Fallback
  } catch (error) {
    console.error("AI Classification Error:", error);
    return null;
  }
}

/**
 * Summarizes the ticket context based on the subject, initial body, and thread history.
 */
export async function summarizeTicket(subject: string, body: string, messages: Message[] = []): Promise<string | null> {
  if (!apiKey || apiKey.includes("test-key") || apiKey.includes("your-gemini-api-key")) return "This is a mocked summary for testing purposes."; // Mock for tests

  try {
    let thread = `Original Ticket:\nSubject: ${subject}\nBody: ${body}\n\n`;
    if (messages.length > 0) {
      thread += "Conversation History:\n";
      messages.forEach((msg, idx) => {
        const sender = msg.fromStudent ? "Student" : "Agent";
        thread += `${idx + 1}. [${sender}]: ${msg.body}\n`;
      });
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: thread,
      config: {
        systemInstruction: `You are a helpful customer support assistant. 
Read the support ticket and any conversation history.
Write a concise, 2-3 sentence summary of the current state of the issue.
Focus on what the user needs and what has been done so far.
Do not use conversational filler, just provide the summary.`,
        temperature: 0.3,
      },
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("AI Summarization Error:", error);
    return null;
  }
}

/**
 * Suggests a draft reply for the agent to send to the student.
 */
export async function suggestReply(
  subject: string,
  body: string,
  messages: Message[] = [],
  category?: TicketCategory | null
): Promise<string | null> {
  if (!apiKey || apiKey.includes("test-key") || apiKey.includes("your-gemini-api-key")) return "This is a mocked suggested reply for testing purposes."; // Mock for tests

  try {
    let thread = `Category: ${category || "Uncategorized"}\n\nOriginal Ticket:\nSubject: ${subject}\nBody: ${body}\n\n`;
    if (messages.length > 0) {
      thread += "Conversation History:\n";
      messages.forEach((msg, idx) => {
        const sender = msg.fromStudent ? "Student" : "Agent";
        thread += `${idx + 1}. [${sender}]: ${msg.body}\n`;
      });
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: thread,
      config: {
        systemInstruction: `You are a professional customer support agent.
Draft a helpful, friendly, and concise reply to the student.
Use the conversation history and category to contextually inform your reply.
- If it's a REFUND_REQUEST, be empathetic and state that the refund team is reviewing it.
- If it's a TECHNICAL_ISSUE, suggest common troubleshooting steps or mention that the tech team is looking into it.
- If it's a GENERAL_QUESTION, answer to the best of your ability in a helpful manner.
Do not include subject lines or placeholder brackets like [Your Name]. Just write the body of the message.`,
        temperature: 0.7,
      },
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("AI Reply Suggestion Error:", error);
    return null;
  }
}
