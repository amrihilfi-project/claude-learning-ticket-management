import "dotenv/config";
import prisma from "../src/lib/prisma";
import { TicketStatus, TicketCategory } from "../src/generated/prisma/enums";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): Date {
  const ms = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function weightedStatus(): TicketStatus {
  const r = Math.random();
  if (r < 0.25) return TicketStatus.OPEN;
  if (r < 0.45) return TicketStatus.PENDING;
  if (r < 0.75) return TicketStatus.RESOLVED;
  return TicketStatus.CLOSED;
}

const studentEmails = [
  "alex.johnson@gmail.com", "priya.sharma@outlook.com", "carlos.mendez@yahoo.com",
  "emily.chen@gmail.com", "noah.williams@hotmail.com", "fatima.al-hassan@gmail.com",
  "liam.nguyen@outlook.com", "sofia.garcia@gmail.com", "james.okafor@yahoo.com",
  "mia.patel@gmail.com", "ethan.kim@outlook.com", "olivia.brown@gmail.com",
  "lucas.silva@hotmail.com", "ava.thompson@gmail.com", "mason.wright@outlook.com",
  "isabella.lee@gmail.com", "aiden.jones@yahoo.com", "chloe.martin@gmail.com",
  "elijah.davis@outlook.com", "zoe.wilson@gmail.com", "student.123@university.edu",
  "j.smith@college.edu", "k.patel@myuni.edu", "r.torres@campus.edu",
  "m.johnson@student.edu", "d.nguyen@univ.edu", "s.ahmed@myschool.edu",
  "t.walker@institute.edu", "b.clark@academy.edu", "h.lewis@edu.com",
  "nadia.kowalski@gmail.com", "yusuf.ibrahim@gmail.com", "anna.petrov@outlook.com",
  "marco.rossi@gmail.com", "sarah.o.brien@hotmail.com", "takeshi.yamamoto@yahoo.com",
  "amara.diallo@gmail.com", "felix.bauer@outlook.com", "mei.zhang@gmail.com",
  "raj.krishnan@gmail.com",
];

const tickets: { subject: string; body: string; category: TicketCategory }[] = [
  // GENERAL_QUESTION
  {
    subject: "How do I reset my password?",
    body: "Hi, I forgot my password and the reset email is not arriving in my inbox. I've checked my spam folder as well. Could you please help me regain access to my account?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "When does enrollment for the next semester open?",
    body: "I'm interested in enrolling in the Advanced Data Science course for the next semester. Could you let me know when registration opens and if there are any prerequisites I should be aware of?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Can I access course materials after course completion?",
    body: "I've just completed the Web Development Bootcamp. Will I still have access to the course materials and recordings after my enrollment period ends? I'd like to review the content for future reference.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I download my certificate of completion?",
    body: "I finished the Python for Beginners course last week and the system says I've completed it, but I can't find the option to download my certificate. Could you guide me on how to get it?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Is there a mobile app available?",
    body: "I prefer studying on my tablet. Is there an official mobile app I can use to access course content? If so, where can I download it and does it support offline viewing?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I contact my instructor directly?",
    body: "I have a specific question about the project assignment in Module 4 of Machine Learning Fundamentals. Is there a way to message the instructor directly, or should I post in the discussion forum?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Can I take multiple courses simultaneously?",
    body: "I'm currently enrolled in UX Design Basics. I'd like to also start the Graphic Design course. Is there a limit on how many courses I can be enrolled in at the same time?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "What are the prerequisites for Advanced Machine Learning?",
    body: "I'm interested in taking the Advanced Machine Learning course. The course page mentions some prerequisites but doesn't list them clearly. Could you tell me exactly what knowledge is required before enrolling?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I update my billing address?",
    body: "I recently moved and need to update the billing address on my account. I can see my profile settings but don't see an option for billing information. How can I update this?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Are course completion certificates recognized by employers?",
    body: "I'm considering the Full Stack Development course and want to know if the completion certificate holds any industry recognition. Will employers accept this certification for job applications?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I join a study group for my course?",
    body: "I noticed on the course page that there are study groups available. I'd like to join one for the Data Structures course, but I can't figure out how to find or join an existing group.",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Is the course self-paced or scheduled?",
    body: "Before enrolling in Cloud Architecture Fundamentals, I want to understand the format. Is there a fixed weekly schedule with live sessions, or can I go through the material at my own pace?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I change my enrolled course?",
    body: "I accidentally enrolled in the Beginner JavaScript course instead of the Intermediate one. I already paid. Is it possible to switch to the correct course without paying again?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "What is the late submission policy for assignments?",
    body: "Due to a family emergency, I wasn't able to submit my Week 3 assignment on time for the Digital Marketing course. What is the policy for late submissions? Will I be penalized?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I get a group discount for my team?",
    body: "I manage a team of 8 developers and we're all interested in enrolling in the DevOps Engineering course. Is there a group or corporate discount available for multiple enrollments?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Can I get a course extension due to illness?",
    body: "I've been ill for the past two weeks and haven't been able to keep up with the course material for Cybersecurity Fundamentals. My enrollment is ending in 10 days. Is it possible to get an extension?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I refer a friend and get a discount?",
    body: "I saw on your website that there's a referral program where I can get a discount for referring friends. Could you explain how this works and how I can get my referral link?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "Are subtitles available for video lectures?",
    body: "I'm a non-native English speaker enrolled in the Business Analytics course. I find it hard to follow some lectures. Are subtitles or closed captions available for the video content?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "How do I pause my subscription?",
    body: "I'm going on vacation for a month and won't be able to study. Is there a way to pause my subscription so I don't lose time from my enrollment period while I'm away?",
    category: TicketCategory.GENERAL_QUESTION,
  },
  {
    subject: "What happens if I fail a quiz?",
    body: "I just failed the Module 2 quiz in the Statistics for Data Science course. Can I retake it? Is there a limit on retake attempts and does it affect my final grade or certificate eligibility?",
    category: TicketCategory.GENERAL_QUESTION,
  },

  // TECHNICAL_ISSUE
  {
    subject: "Video lectures not loading in Chrome",
    body: "The video player shows a spinning loader indefinitely when I try to watch lectures in Module 3 of the React Development course. I've tried refreshing and clearing cache. Using Chrome 124 on Windows 11.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Cannot submit final project — getting 500 error",
    body: "Every time I click 'Submit' on my final project for the iOS Development course, I get an internal server error (500). I've tried from both Chrome and Firefox. The deadline is tomorrow and I'm panicking.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Payment page stuck in loading loop",
    body: "I'm trying to enroll in the Cloud Computing course but the payment page keeps refreshing without processing. My card has been charged twice already according to my bank. Please help urgently.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Password reset link is expired",
    body: "I requested a password reset and received the email, but by the time I clicked the link it said it had expired. I've requested it three times now with the same result. The link expires almost immediately.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Quiz timer freezing mid-exam",
    body: "While taking the certification exam for Network Security, the countdown timer froze at 28 minutes remaining but the exam still submitted with zero score when time ran out. I lost my exam attempt unfairly.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Course progress not saving between sessions",
    body: "Every time I log out and log back in, my progress in the SQL Masterclass resets to the beginning. I've completed the first 4 modules multiple times but they keep showing as incomplete.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Discussion forum posts not displaying",
    body: "I can see that there are 12 posts in the Week 2 discussion forum for my AI Ethics course, but the page shows empty content. Other students can see and respond to these posts. Something seems broken on my account.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Unable to download course PDF materials",
    body: "The download button for PDF resources in the Agile Project Management course doesn't work. Clicking it opens a blank tab that immediately closes. I need these materials to study offline.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Certificate not generated after 100% completion",
    body: "I completed all modules, passed all quizzes, and submitted all assignments for the Blockchain Fundamentals course. My progress shows 100% but no certificate has been generated. It's been 5 days.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Audio out of sync on all lecture videos",
    body: "All video lectures in the Digital Photography course have audio that's about 3 seconds behind the video. It makes them very difficult to follow. This started two days ago — it was fine before.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Mobile app crashes when opening Module 5",
    body: "The iOS app crashes immediately when I try to open Module 5 of the Data Visualization course. All other modules work fine. I've reinstalled the app twice. Running iOS 17.4 on iPhone 14.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Two-factor authentication code not arriving",
    body: "I enabled two-factor authentication on my account but the SMS codes are no longer arriving. I've verified my phone number is correct. Without the code I'm completely locked out of my account.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Course completion stuck at 98%",
    body: "My UI/UX Prototyping course shows 98% completion and won't reach 100% even though I've gone through every lesson, quiz, and assignment. This is preventing me from getting my certificate.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Login page returns blank white screen",
    body: "When I try to log in, I enter my credentials and the page goes completely white. No error message, just a blank page. I've tried three different browsers and an incognito window with the same result.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Live session link not working",
    body: "The Zoom link for today's live Q&A session in the Entrepreneurship course just shows 'meeting does not exist.' I registered for the session last week. Other students seem to be attending fine.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Code editor in browser not saving changes",
    body: "The embedded code editor in the JavaScript Algorithms course doesn't save my work. Every time I navigate away and come back, all my code is gone. I've lost hours of work this week.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Email notifications stopped working",
    body: "I used to receive email reminders for upcoming assignment deadlines. Two weeks ago they suddenly stopped. I've checked my notification settings and everything is still enabled. My spam folder is empty.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Cannot upload assignment — file size error",
    body: "I'm trying to upload my video presentation for the Marketing Strategy course. It's 45MB which is under the 50MB limit shown on the upload page, but I keep getting a 'file too large' error.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Google SSO login broken",
    body: "I've always logged in using my Google account. Since yesterday, after clicking 'Sign in with Google' I get redirected back to the login page with no error message. My Google account is working fine.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },
  {
    subject: "Subtitles displaying in wrong language",
    body: "The auto-generated subtitles in my Deep Learning course are showing in Spanish even though my account language is set to English. I've tried toggling them off and on but they stay in Spanish.",
    category: TicketCategory.TECHNICAL_ISSUE,
  },

  // REFUND_REQUEST
  {
    subject: "Refund request — accidentally enrolled in wrong course",
    body: "I enrolled in 'Python for Beginners' when I meant to enroll in 'Python for Data Science'. I realized the mistake within 10 minutes of purchase and haven't accessed any content. Please process a full refund.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — duplicate charge on my account",
    body: "I was charged twice for the Machine Learning course enrollment. My bank statement shows two identical charges of $199 on the same day. I only intended to enroll once. Please refund the duplicate charge.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — course content not as advertised",
    body: "The Advanced React course advertised 40 hours of content and hands-on projects. The actual course has only 12 hours and no real projects, just quizzes. This is significantly less than what was advertised.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — medical emergency",
    body: "I was hospitalized two days after enrolling in the Full Stack Bootcamp and have been unable to attend any sessions. I have a doctor's note confirming my hospitalization. I would like a full refund given the circumstances.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — course was cancelled",
    body: "The live cohort of the Product Management course I enrolled in was cancelled by the platform with only 2 days notice. I was moved to a self-paced version without my consent. Please issue a full refund.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — unable to access course content",
    body: "I purchased the Cybersecurity Professional course 3 days ago but have been completely unable to access any content due to technical issues. Despite multiple support requests the problem is unresolved. I'd like a refund.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — enrolled during free trial period",
    body: "I enrolled in a course believing I was still on the free trial, but was charged immediately. The trial end date was not clearly communicated. I haven't used any paid features yet. Please refund the charge.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Partial refund request — course no longer relevant",
    body: "The DevOps Tools course I enrolled in 2 months ago has outdated content. Half the tools covered are no longer used in the industry and some are discontinued. I would like at least a partial refund.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — unauthorized charge",
    body: "I found a charge from your platform on my credit card but I did not make any purchase. I believe my account may have been compromised. Please refund the charge and help secure my account.",
    category: TicketCategory.REFUND_REQUEST,
  },
  {
    subject: "Refund request — instructor left mid-course",
    body: "The instructor for the Advanced SQL course left mid-way through and was replaced with pre-recorded content. The live sessions I paid a premium for were discontinued. Please refund the premium I paid.",
    category: TicketCategory.REFUND_REQUEST,
  },
];

const agentReplies: Record<TicketCategory, string[]> = {
  [TicketCategory.GENERAL_QUESTION]: [
    "Thank you for reaching out to us! I've reviewed your query and I'm happy to help. I've gone ahead and looked into this for you — please check your account settings under the relevant section, and you should find the option you need. If anything is unclear, don't hesitate to reply and I'll walk you through it step by step.",
    "Thanks for getting in touch. Great question! I've checked on this and can confirm that the feature you're asking about is available. You can find it by navigating to your account dashboard and selecting the relevant option from the menu. Let me know if you need any further guidance.",
    "Hello! Thank you for your message. I completely understand your concern and I'm here to help. I've reviewed your account and the information you're looking for is available in your profile settings. If you still can't find it, please reply and I'll send you a direct link.",
    "Thanks for contacting support! I appreciate your patience. I've looked into your question and I'm pleased to let you know that this is definitely something we can help with. Please follow the steps outlined in our help centre, or reply here and I'll guide you through the process personally.",
    "Hi there! Thank you for reaching out. I've reviewed your account and your query, and I'd be happy to assist. This is a common question and we're always glad to help students get the most out of their learning experience. I've escalated this to the relevant team and you should receive an update shortly.",
  ],
  [TicketCategory.TECHNICAL_ISSUE]: [
    "Thank you for reporting this issue — I'm sorry for the inconvenience. I've logged a bug report with our technical team and they are currently investigating. In the meantime, please try clearing your browser cache and cookies, or switching to a different browser. I'll follow up as soon as we have an update.",
    "I apologize for the trouble you're experiencing. I've reproduced the issue on our end and escalated it to our engineering team as a high-priority item. You should see a fix deployed within 24–48 hours. If the issue is urgent, please let me know and I'll explore additional workarounds for you.",
    "I'm sorry to hear you're running into this. Our team is aware of this class of issue and is actively working on a resolution. While the fix is being prepared, could you please try using an incognito/private browsing window? This sometimes resolves caching-related problems. I'll keep you updated on progress.",
    "Thank you for the detailed report — it's very helpful for our team. I've filed this with our development team and flagged it as high priority given the impact on your studies. Please stand by and I'll reach out as soon as I have more information for you.",
    "I understand how frustrating this must be, especially with deadlines involved. I've escalated your case to our senior technical team and they are looking into it right now. Could you also try accessing the platform from a different device or network? That will help us narrow down whether this is account-specific or environment-specific.",
  ],
  [TicketCategory.REFUND_REQUEST]: [
    "Thank you for reaching out regarding your refund request. I've reviewed your account details and can confirm that your request is eligible under our refund policy. I've initiated the refund process and you should see the amount credited back to your original payment method within 5–7 business days. You'll receive an email confirmation shortly.",
    "Thank you for contacting us. I've carefully reviewed your case and I'm happy to confirm that we'll be processing a refund for you. Please allow 5–7 business days for the amount to appear on your statement. If you don't see it after that period, please reply and we'll follow up with your bank.",
    "I'm sorry to hear about your experience and I appreciate you bringing this to our attention. I've reviewed your account and your refund request has been approved. The amount will be returned to your original payment method within 5–7 business days. A confirmation email will be sent to you once it's processed.",
    "Thank you for reaching out about this. I've reviewed the details of your case and have escalated it to our billing team for priority processing. They will review it within 24 hours and you'll receive a confirmation email once the refund is approved. Please don't hesitate to reply if you have any questions in the meantime.",
    "I appreciate you contacting us about this matter. I've reviewed your account and can see the details of your request. I want to ensure we handle this correctly, so I've flagged it to our billing team for review. You can expect to hear back within 1–2 business days with a resolution.",
  ],
};

const studentFollowUps = [
  "Thank you for the quick response! I appreciate your help. I'll give that a try and let you know if I run into any issues.",
  "That's really helpful, thank you! I tried what you suggested and it seems to be working now. I'll keep an eye on it.",
  "Thanks for looking into this. I have one follow-up question — is there an estimated timeline for when this will be fully resolved? I have an assignment deadline coming up.",
  "I appreciate the prompt reply. I tried the workaround you mentioned but unfortunately I'm still seeing the same problem. Could you please escalate this further?",
  "Thank you for the update. I'll wait for the fix to be deployed. In the meantime, is there anything else I can try on my end to speed things along?",
];

const agentResolutions = [
  "I'm glad we could resolve this for you! I'm marking this ticket as resolved. If you ever run into any other issues, don't hesitate to reach out — we're always happy to help. Have a great day!",
  "Wonderful! I'm happy to hear that worked out. I'll go ahead and mark this ticket as resolved. Feel free to open a new ticket if you need any further assistance in the future.",
  "Great to hear — thank you for your patience while we worked through this. I'm marking this as resolved. It was a pleasure assisting you and I hope your studies continue to go well!",
  "I'm delighted to hear everything is sorted out now. I'll mark this ticket as resolved on our end. Thank you for choosing our platform and don't hesitate to contact us if anything else comes up.",
  "Perfect, thank you for confirming! I've noted the resolution and this ticket will be marked as resolved. Our team appreciates your patience throughout this process. All the best with your course!",
];

const studentClosings = [
  "Thank you so much for all your help! Everything is working perfectly now. I really appreciate the support.",
  "That's great, thank you! I'm satisfied with the resolution. You've been very helpful.",
  "Perfect, thank you! I'll make sure to reach out if I have any other questions.",
];

function buildMessages(
  status: TicketStatus,
  category: TicketCategory,
  body: string,
  createdAt: Date,
): { body: string; fromStudent: boolean; createdAt: Date }[] {
  const msgs: { body: string; fromStudent: boolean; createdAt: Date }[] = [];

  // Message 1: student's initial message
  msgs.push({ body, fromStudent: true, createdAt });

  if (status === TicketStatus.OPEN) return msgs;

  // Message 2: agent reply (2–5 hours later)
  const agentReplyAt = addHours(createdAt, 2 + Math.random() * 3);
  msgs.push({ body: pick(agentReplies[category]), fromStudent: false, createdAt: agentReplyAt });

  if (status === TicketStatus.PENDING) return msgs;

  // Message 3: student follow-up (1–2 days after agent reply)
  const studentFollowUpAt = addDays(agentReplyAt, 1 + Math.random());
  msgs.push({ body: pick(studentFollowUps), fromStudent: true, createdAt: studentFollowUpAt });

  // Message 4: agent resolution (1–3 hours after student follow-up)
  const agentResolutionAt = addHours(studentFollowUpAt, 1 + Math.random() * 2);
  msgs.push({ body: pick(agentResolutions), fromStudent: false, createdAt: agentResolutionAt });

  if (status === TicketStatus.CLOSED && Math.random() > 0.4) {
    // Message 5: student closing acknowledgment (30–90 min after resolution)
    const studentClosingAt = addHours(agentResolutionAt, 0.5 + Math.random() * 1);
    msgs.push({ body: pick(studentClosings), fromStudent: true, createdAt: studentClosingAt });
  }

  return msgs;
}

async function seedTickets() {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  const agentIds = agents.map((a) => a.id);

  const creates = Array.from({ length: 100 }, (_, i) => {
    const template = tickets[i % tickets.length];
    const email = pick(studentEmails);
    const status = weightedStatus();
    const createdAt = randomDate(180);
    const assigneeId =
      agentIds.length > 0 && Math.random() > 0.4 ? pick(agentIds) : null;
    const resolvedAt =
      status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED
        ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
        : null;

    const messages = buildMessages(status, template.category, template.body, createdAt);

    return prisma.ticket.create({
      data: {
        subject: template.subject,
        body: template.body,
        studentEmail: email,
        status,
        category: template.category,
        assigneeId,
        createdAt,
        updatedAt: createdAt,
        resolvedAt,
        messages: {
          create: messages,
        },
      },
    });
  });

  await prisma.$transaction(creates);
  console.log(`Created 100 tickets with messages.`);
  await prisma.$disconnect();
}

seedTickets().catch((err) => {
  console.error(err);
  process.exit(1);
});
