import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import HomePage from "./HomePage";
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

function mockCountResponses({
  OPEN = 0,
  PENDING = 0,
  RESOLVED = 0,
  CLOSED = 0,
  GENERAL_QUESTION = 0,
  TECHNICAL_ISSUE = 0,
  REFUND_REQUEST = 0,
}: Partial<Record<string, number>> = {}) {
  const counts: Record<string, number> = {
    OPEN, PENDING, RESOLVED, CLOSED,
    GENERAL_QUESTION, TECHNICAL_ISSUE, REFUND_REQUEST,
  };
  ax.get.mockImplementation((_url: string, config?: { params?: Record<string, string> }) => {
    const status = config?.params?.status;
    const category = config?.params?.category;
    const key = status ?? category ?? "";
    const total = counts[key] ?? 0;
    return Promise.resolve({ data: { data: [], total, page: 1, limit: 1 } });
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseSession.mockReturnValue(ADMIN_SESSION as any);
});

afterEach(() => vi.useRealTimers());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HomePage (Dashboard)", () => {
  it("renders the page heading", async () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("heading", { name: /welcome to ticket management/i })).toBeInTheDocument();
  });

  it("renders a 'View all tickets' link to /tickets", async () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    const link = screen.getByRole("link", { name: /view all tickets/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/tickets");
  });

  it("shows status card counts from the API", async () => {
    mockCountResponses({ OPEN: 7, PENDING: 3, RESOLVED: 12, CLOSED: 1 });
    renderWithProviders(<HomePage />);
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("shows category card counts from the API", async () => {
    mockCountResponses({ GENERAL_QUESTION: 4, TECHNICAL_ISSUE: 9, REFUND_REQUEST: 2 });
    renderWithProviders(<HomePage />);
    expect(await screen.findByText("4")).toBeInTheDocument();
    expect(await screen.findByText("9")).toBeInTheDocument();
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("renders status labels for each card", async () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("renders category labels for each card", async () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    expect(screen.getByText("General Question")).toBeInTheDocument();
    expect(screen.getByText("Technical Issue")).toBeInTheDocument();
    expect(screen.getByText("Refund Request")).toBeInTheDocument();
  });

  it("shows placeholder dash while counts are loading", () => {
    ax.get.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomePage />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(7);
  });

  it("status cards link to /tickets?status=X", () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("link", { name: /open/i })).toHaveAttribute("href", "/tickets?status=OPEN");
    expect(screen.getByRole("link", { name: /pending/i })).toHaveAttribute("href", "/tickets?status=PENDING");
    expect(screen.getByRole("link", { name: /resolved/i })).toHaveAttribute("href", "/tickets?status=RESOLVED");
    expect(screen.getByRole("link", { name: /closed/i })).toHaveAttribute("href", "/tickets?status=CLOSED");
  });

  it("category cards link to /tickets?category=X", () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    expect(screen.getByRole("link", { name: /general question/i })).toHaveAttribute("href", "/tickets?category=GENERAL_QUESTION");
    expect(screen.getByRole("link", { name: /technical issue/i })).toHaveAttribute("href", "/tickets?category=TECHNICAL_ISSUE");
    expect(screen.getByRole("link", { name: /refund request/i })).toHaveAttribute("href", "/tickets?category=REFUND_REQUEST");
  });

  it("uncategorized card is not a link", () => {
    mockCountResponses();
    renderWithProviders(<HomePage />);
    const allLinks = screen.getAllByRole("link");
    const hrefs = allLinks.map((l) => l.getAttribute("href") ?? "");
    expect(hrefs.every((h) => !h.includes("UNCATEGORIZED"))).toBe(true);
  });
});
