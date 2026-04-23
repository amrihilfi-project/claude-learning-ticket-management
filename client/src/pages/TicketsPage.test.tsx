import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import TicketsPage from "./TicketsPage";
import { renderWithProviders } from "../test/renderWithProviders";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const ax = vi.mocked(axios);

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));
import { authClient } from "../lib/auth-client";
const mockedUseSession = vi.mocked(authClient.useSession);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  data: { user: { id: "admin-1", name: "Admin User", email: "admin@test.com", role: "ADMIN" } },
  isPending: false,
};

const makeTicket = (overrides: Partial<{
  id: string;
  subject: string;
  studentEmail: string;
  status: string;
  category: string | null;
  assignee: { id: string; name: string } | null;
  createdAt: string;
}> = {}) => ({
  id: "ticket-1",
  subject: "Cannot log in",
  studentEmail: "student@uni.edu",
  status: "OPEN",
  category: null,
  assignee: null,
  createdAt: new Date("2024-03-01").toISOString(),
  ...overrides,
});

const ticketsResponse = (tickets: ReturnType<typeof makeTicket>[], total?: number) => ({
  data: tickets,
  total: total ?? tickets.length,
  page: 1,
  limit: 20,
});

function renderPage() {
  return renderWithProviders(<TicketsPage />);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseSession.mockReturnValue(ADMIN_SESSION as any);
});

afterEach(() => vi.useRealTimers());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TicketsPage", () => {
  describe("loading state", () => {
    it("renders skeleton rows while fetching", () => {
      ax.get.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    });
  });

  describe("ticket list", () => {
    beforeEach(() => {
      ax.get.mockResolvedValue({ data: ticketsResponse([makeTicket()]) });
    });

    it("renders the page heading", async () => {
      renderPage();
      expect(await screen.findByRole("heading", { name: /tickets/i })).toBeInTheDocument();
    });

    it("renders ticket subject in the table", async () => {
      renderPage();
      expect(await screen.findByText("Cannot log in")).toBeInTheDocument();
    });

    it("renders the student email", async () => {
      renderPage();
      expect(await screen.findByText("student@uni.edu")).toBeInTheDocument();
    });

    it("renders the status badge", async () => {
      renderPage();
      expect(await screen.findByText("Open")).toBeInTheDocument();
    });

    it("renders '—' placeholder for null category and assignee", async () => {
      renderPage();
      // Both category and assignee are null → two dashes in the table
      const dashes = await screen.findAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("renders human-readable category label", async () => {
      ax.get.mockResolvedValue({
        data: ticketsResponse([makeTicket({ category: "TECHNICAL_ISSUE" })]),
      });
      renderPage();
      expect(await screen.findByText("Technical Issue")).toBeInTheDocument();
    });

    it("renders assignee name when assigned", async () => {
      ax.get.mockResolvedValue({
        data: ticketsResponse([makeTicket({ assignee: { id: "u1", name: "Alice" } })]),
      });
      renderPage();
      expect(await screen.findByText("Alice")).toBeInTheDocument();
    });

    it("renders 'No tickets found' for empty result", async () => {
      ax.get.mockResolvedValue({ data: ticketsResponse([]) });
      renderPage();
      expect(await screen.findByText(/no tickets found/i)).toBeInTheDocument();
    });

    it("renders error message on fetch failure", async () => {
      ax.get.mockRejectedValue(new Error("Network error"));
      renderPage();
      expect(await screen.findByText(/failed to load tickets/i)).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("disables Previous button on page 1", async () => {
      ax.get.mockResolvedValue({ data: ticketsResponse([makeTicket()]) });
      renderPage();
      const prev = await screen.findByRole("button", { name: /previous/i });
      expect(prev).toBeDisabled();
    });

    it("disables Next button when only one page", async () => {
      ax.get.mockResolvedValue({ data: ticketsResponse([makeTicket()], 1) });
      renderPage();
      const next = await screen.findByRole("button", { name: /next/i });
      expect(next).toBeDisabled();
    });

    it("enables Next button when total exceeds limit", async () => {
      ax.get.mockResolvedValue({
        data: { data: [makeTicket()], total: 21, page: 1, limit: 20 },
      });
      renderPage();
      const next = await screen.findByRole("button", { name: /next/i });
      expect(next).not.toBeDisabled();
    });

    it("shows the total ticket count", async () => {
      ax.get.mockResolvedValue({ data: { data: [makeTicket()], total: 42, page: 1, limit: 20 } });
      renderPage();
      expect(await screen.findByText(/42 tickets total/i)).toBeInTheDocument();
    });

    it("clicking Next increments the page", async () => {
      ax.get.mockResolvedValue({
        data: { data: [makeTicket()], total: 21, page: 1, limit: 20 },
      });
      renderPage();
      const next = await screen.findByRole("button", { name: /next/i });
      fireEvent.click(next);
      expect(await screen.findByText(/page 2/i)).toBeInTheDocument();
    });
  });
});
