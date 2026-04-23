## Problem

We receive hundreds of support emails daily. Our agents manually read, classify and respond to each ticket - which is slow and leads to impersonal, canned response.

## Solution

Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets - delivering faster, more personalized responses to students while freeing up agents for complex issue.

## Features 

- Receive support emails and create tickets
- Auto-generate human-friendly responses using AI (knowledge base integration planned for later)
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User management (admin only)
- Dashboard to view and manage all tickets

---

## Clarifications & Decisions

### Ticket Categories
Tickets belong to exactly one category:
- **General Question**
- **Technical Issue**
- **Refund Request**

### Ticket Statuses
- **Open** — agent is working on it
- **Pending** — waiting on student reply
- **Resolved** — agent marked done; 24-hour auto-close timer starts
- **Closed** — auto-closed after 24h of no reply; reopens automatically if student replies

### AI Response Workflow
- AI drafts a suggested reply for **all** ticket categories
- An agent must review and approve before any reply is sent (no auto-send)
- For **Refund Requests**: AI suggestion is available but agent handles manually — never auto-routed or auto-responded

### Routing
- **General Question** and **Technical Issue**: same agent pool (for now)
- **Refund Request**: routed to a dedicated queue/team, always requires manual agent handling

### Reopening Rules
- If a student replies to a resolved or closed ticket, it automatically reopens and returns to **Open**
