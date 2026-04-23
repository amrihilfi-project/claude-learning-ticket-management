import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import UsersPage from "./UsersPage";
import { renderWithProviders } from "../test/renderWithProviders";

// ── Mocks ────────────────────────────────────────────────────────────────────

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

const makeUser = (overrides: Partial<{
  id: string; name: string; email: string;
  role: "ADMIN" | "AGENT"; isActive: boolean; createdAt: string;
}> = {}) => ({
  id: "user-1",
  name: "Jane Agent",
  email: "jane@test.com",
  role: "AGENT" as const,
  isActive: true,
  createdAt: new Date("2024-01-15").toISOString(),
  ...overrides,
});

const usersResponse = (users: ReturnType<typeof makeUser>[]) => ({
  data: users,
  total: users.length,
  page: 1,
  limit: 10,
});

function renderPage() {
  return renderWithProviders(<UsersPage />);
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseSession.mockReturnValue(ADMIN_SESSION as any);
});

// Always restore real timers so fake-timer tests don't bleed into later ones
afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("UsersPage", () => {
  describe("loading state", () => {
    it("renders skeleton rows while fetching", () => {
      ax.get.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    });
  });

  describe("user list", () => {
    beforeEach(() => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser()]) });
    });

    it("renders the page heading", async () => {
      renderPage();
      await screen.findByRole("heading", { name: /users/i });
    });

    it("renders a row for each user with name and email", async () => {
      renderPage();
      await screen.findByText("Jane Agent");
      expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    });

    it("shows role badge", async () => {
      renderPage();
      await screen.findByText("AGENT");
    });

    it("shows Active status badge", async () => {
      renderPage();
      await screen.findByText("Active");
    });

    it("shows Inactive status badge for deactivated user", async () => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser({ isActive: false })]) });
      renderPage();
      await screen.findByText("Inactive");
    });

    it("labels the current user row with (you)", async () => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser({ id: "admin-1" })]) });
      renderPage();
      await screen.findByText("(you)");
    });

    it("disables Deactivate and Delete for the current user's row", async () => {
      ax.get.mockResolvedValue({
        data: usersResponse([makeUser({ id: "admin-1", name: "Self User" })]),
      });
      renderPage();
      await screen.findByText("Self User");
      const row = screen.getByText("Self User").closest("tr")!;
      expect(within(row).getByRole("button", { name: /deactivate/i })).toBeDisabled();
      expect(within(row).getByRole("button", { name: /delete/i })).toBeDisabled();
    });

    it("shows pagination info", async () => {
      renderPage();
      await screen.findByText(/showing 1/i);
    });
  });

  describe("error state", () => {
    it("shows error banner when fetch fails", async () => {
      ax.get.mockRejectedValue(new Error("Network error"));
      renderPage();
      await screen.findByText(/could not load users/i);
    });
  });

  describe("search", () => {
    it("renders the search input", () => {
      ax.get.mockResolvedValue({ data: usersResponse([]) });
      renderPage();
      expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument();
    });

    it("passes search param to API after debounce", async () => {
      ax.get.mockResolvedValue({ data: usersResponse([]) });
      renderPage();

      const input = screen.getByPlaceholderText(/search by name or email/i);
      // Type instantly (delay:null) — the 400ms debounce will fire with real timers
      await userEvent.setup({ delay: null }).type(input, "Jane");

      await waitFor(
        () => {
          const calls = ax.get.mock.calls as Array<[string, { params: Record<string, unknown> }]>;
          const hit = calls.find((c) => c[1]?.params?.search === "Jane");
          expect(hit).toBeDefined();
        },
        { timeout: 2000 }
      );
    }, 10000);
  });

  describe("Add User dialog", () => {
    beforeEach(() => {
      ax.get.mockResolvedValue({ data: usersResponse([]) });
    });

    it("opens the Add User dialog", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /add user/i }));
      await screen.findByRole("heading", { name: /add user/i });
    });

    it("shows validation error when fields are empty", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /add user/i }));
      await screen.findByRole("heading", { name: /add user/i });
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it("submits and closes dialog on success", async () => {
      ax.post.mockResolvedValue({ data: makeUser() });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /add user/i }));
      await screen.findByRole("heading", { name: /add user/i });

      const user = userEvent.setup({ delay: null });
      await user.type(screen.getByLabelText(/^name$/i), "New User");
      await user.type(screen.getByLabelText(/^email$/i), "new@test.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /add user/i })).not.toBeInTheDocument()
      );
    });

    it("shows server error message on failure", async () => {
      ax.post.mockRejectedValue({ response: { data: { error: "Email already in use" } } });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /add user/i }));
      await screen.findByRole("heading", { name: /add user/i });

      const user = userEvent.setup({ delay: null });
      await user.type(screen.getByLabelText(/^name$/i), "New User");
      await user.type(screen.getByLabelText(/^email$/i), "existing@test.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

      await screen.findByText(/email already in use/i);
    });

    it("closes when Escape is pressed", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /add user/i }));
      await screen.findByRole("heading", { name: /add user/i });
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /add user/i })).not.toBeInTheDocument()
      );
    });

    it("closes when clicking outside the dialog", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /add user/i }));
      await screen.findByRole("heading", { name: /add user/i });
      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      fireEvent.click(overlay!);
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /add user/i })).not.toBeInTheDocument()
      );
    });
  });

  describe("Edit User dialog", () => {
    beforeEach(() => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser()]) });
    });

    it("opens with the user's current data pre-filled", async () => {
      renderPage();
      await screen.findByText("Jane Agent");
      const row = screen.getByText("Jane Agent").closest("tr")!;
      fireEvent.click(within(row).getByRole("button", { name: /edit/i }));
      await screen.findByRole("heading", { name: /edit user/i });

      expect(screen.getByDisplayValue("Jane Agent")).toBeInTheDocument();
      expect(screen.getByDisplayValue("jane@test.com")).toBeInTheDocument();
    });

    it("submits PATCH with updated name and closes", async () => {
      ax.patch.mockResolvedValue({ data: makeUser({ name: "Jane Updated" }) });
      renderPage();
      await screen.findByText("Jane Agent");
      const row = screen.getByText("Jane Agent").closest("tr")!;
      fireEvent.click(within(row).getByRole("button", { name: /edit/i }));
      await screen.findByRole("heading", { name: /edit user/i });

      const user = userEvent.setup({ delay: null });
      const nameInput = screen.getByDisplayValue("Jane Agent");
      await user.clear(nameInput);
      await user.type(nameInput, "Jane Updated");
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /edit user/i })).not.toBeInTheDocument()
      );
      expect(ax.patch).toHaveBeenCalledWith(
        "/api/users/user-1",
        expect.objectContaining({ name: "Jane Updated" })
      );
    });

    it("closes when Escape is pressed", async () => {
      renderPage();
      await screen.findByText("Jane Agent");
      fireEvent.click(within(screen.getByText("Jane Agent").closest("tr")!).getByRole("button", { name: /edit/i }));
      await screen.findByRole("heading", { name: /edit user/i });
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /edit user/i })).not.toBeInTheDocument()
      );
    });

    it("closes when clicking outside the dialog", async () => {
      renderPage();
      await screen.findByText("Jane Agent");
      fireEvent.click(within(screen.getByText("Jane Agent").closest("tr")!).getByRole("button", { name: /edit/i }));
      await screen.findByRole("heading", { name: /edit user/i });
      fireEvent.click(document.querySelector('[data-slot="dialog-overlay"]')!);
      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /edit user/i })).not.toBeInTheDocument()
      );
    });

    it("shows error when name and email are cleared", async () => {
      renderPage();
      await screen.findByText("Jane Agent");
      fireEvent.click(within(screen.getByText("Jane Agent").closest("tr")!).getByRole("button", { name: /edit/i }));
      await screen.findByRole("heading", { name: /edit user/i });

      const user = userEvent.setup({ delay: null });
      await user.clear(screen.getByDisplayValue("Jane Agent"));
      await user.clear(screen.getByDisplayValue("jane@test.com"));
      fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
      expect(screen.getByText(/name and email are required/i)).toBeInTheDocument();
    });

    it("disables the role select when editing yourself", async () => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser({ id: "admin-1" })]) });
      renderPage();
      await screen.findByText("(you)");
      fireEvent.click(within(screen.getByText("(you)").closest("tr")!).getByRole("button", { name: /edit/i }));
      await screen.findByRole("heading", { name: /edit user/i });
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });

  describe("Delete User dialog", () => {
    beforeEach(() => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser()]) });
    });

    it("opens confirmation dialog with user name", async () => {
      renderPage();
      await screen.findByText("Jane Agent");
      const row = screen.getByText("Jane Agent").closest("tr")!;
      fireEvent.click(within(row).getByRole("button", { name: /delete/i }));
      await screen.findByRole("heading", { name: /delete user/i });

      // The name appears in a <span> inside the confirmation message
      expect(screen.getByText(/jane agent/i, { selector: "span" })).toBeInTheDocument();
    });

    it("calls DELETE endpoint and closes on confirm", async () => {
      ax.delete.mockResolvedValue({});
      renderPage();
      await screen.findByText("Jane Agent");
      const row = screen.getByText("Jane Agent").closest("tr")!;
      fireEvent.click(within(row).getByRole("button", { name: /delete/i }));
      await screen.findByRole("heading", { name: /delete user/i });
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() =>
        expect(screen.queryByRole("heading", { name: /delete user/i })).not.toBeInTheDocument()
      );
      expect(ax.delete).toHaveBeenCalledWith("/api/users/user-1");
    });
  });

  describe("Toggle active", () => {
    it("calls toggle-active endpoint when Deactivate is clicked", async () => {
      ax.get.mockResolvedValue({ data: usersResponse([makeUser()]) });
      ax.patch.mockResolvedValue({ data: makeUser({ isActive: false }) });

      renderPage();
      await screen.findByText("Jane Agent");
      const row = screen.getByText("Jane Agent").closest("tr")!;
      fireEvent.click(within(row).getByRole("button", { name: /deactivate/i }));

      await waitFor(() =>
        expect(ax.patch).toHaveBeenCalledWith("/api/users/user-1/toggle-active")
      );
    });
  });
});
