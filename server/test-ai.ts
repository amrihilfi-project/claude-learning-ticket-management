import { config } from "dotenv";
config(); // Load .env file

import { classifyTicket, summarizeTicket, suggestReply } from "./src/lib/ai";

async function main() {
  const subject = "Help! I can't log into the portal";
  const body = "Every time I try to log in, it says 'invalid credentials' but I am sure my password is correct. I have tried resetting it but I never get the email. I really need to submit my assignment by tonight!";
  
  console.log("========================================");
  console.log("🎫 TEST TICKET");
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("========================================\n");

  console.log("⏳ Classifying ticket...");
  const category = await classifyTicket(subject, body);
  console.log(`✅ Category: ${category}\n`);

  console.log("⏳ Summarizing ticket...");
  const summary = await summarizeTicket(subject, body, []);
  console.log(`✅ Summary:\n${summary}\n`);

  console.log("⏳ Generating suggested reply...");
  const suggestedReply = await suggestReply(subject, body, [], category);
  console.log(`✅ Suggested Reply:\n${suggestedReply}\n`);
}

main().catch(console.error);
