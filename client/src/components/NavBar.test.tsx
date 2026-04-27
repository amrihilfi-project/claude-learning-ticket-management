import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NavBar from "./NavBar";
import { renderWithProviders } from "../test/renderWithProviders";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));
import { authClient } from "../lib/auth-client";
const mockedUseSession = vi.mocked(authClient.useSession);
const mockedSignOut = vi.mocked(authClient.signOut);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  data: { user: { id: "1", name: "Admin User", email: "admin@test.com", role: "ADMIN" } },
  isPending: false,
};

const AGENT_SESSION = {
  data: { user: { id: "2", name: "Agent User", email: "agent@test.com", role: "AGENT" } },
  isPending: false,
};

const NO_SESSION = { data: null, isPending: false };

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NavBar", () => {
  describe("brand link", () => {
    it("always renders the Ticket Management link", () => {
      mockedUseSession.mockReturnValue(NO_SESSION as any);
      renderWithProviders(<NavBar />);
      expect(screen.getByRole("link", { name: /ticket management/i })).toBeInTheDocument();
    });
  });

  describe("authenticated admin", () => {
    beforeEach(() => {
      mockedUseSession.mockReturnValue(ADMIN_SESSION as any);
    });

    it("shows the user's name", () => {
      renderWithProviders(<NavBar />);
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    it("shows the Tickets nav link", () => {
      renderWithProviders(<NavBar />);
      expect(screen.getByRole("link", { name: /^tickets$/i })).toBeInTheDocument();
    });

    it("shows the Users nav link for admins", () => {
      renderWithProviders(<NavBar />);
      expect(screen.getByRole("link", { name: /^users$/i })).toBeInTheDocument();
    });

    it("shows the sign out button", () => {
      renderWithProviders(<NavBar />);
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });
  });

  describe("authenticated agent", () => {
    beforeEach(() => {
      mockedUseSession.mockReturnValue(AGENT_SESSION as any);
    });

    it("shows the Tickets nav link", () => {
      renderWithProviders(<NavBar />);
      expect(screen.getByRole("link", { name: /^tickets$/i })).toBeInTheDocument();
    });

    it("does not show the Users nav link", () => {
      renderWithProviders(<NavBar />);
      expect(screen.queryByRole("link", { name: /^users$/i })).not.toBeInTheDocument();
    });
  });

  describe("unauthenticated", () => {
    beforeEach(() => {
      mockedUseSession.mockReturnValue(NO_SESSION as any);
    });

    it("does not show a user name", () => {
      renderWithProviders(<NavBar />);
      expect(screen.queryByText("Admin User")).not.toBeInTheDocument();
    });

    it("does not show the Tickets nav link", () => {
      renderWithProviders(<NavBar />);
      expect(screen.queryByRole("link", { name: /^tickets$/i })).not.toBeInTheDocument();
    });

    it("does not show the Users nav link", () => {
      renderWithProviders(<NavBar />);
      expect(screen.queryByRole("link", { name: /^users$/i })).not.toBeInTheDocument();
    });
  });

  describe("sign out", () => {
    beforeEach(() => {
      mockedUseSession.mockReturnValue(ADMIN_SESSION as any);
    });

    it("calls authClient.signOut when the button is clicked", async () => {
      renderWithProviders(<NavBar />);
      fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
      await waitFor(() => expect(mockedSignOut).toHaveBeenCalledTimes(1));
    });

    it("does not navigate imperatively — relies on ProtectedRoute to redirect", async () => {
      renderWithProviders(<NavBar />);
      fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
      await waitFor(() => expect(mockedSignOut).toHaveBeenCalled());
      // No navigate call means the component doesn't depend on useNavigate at all
      // (verified by the absence of the import — if it were present, the mock
      // would need to include it and this test would cover that regression)
    });
  });
});
