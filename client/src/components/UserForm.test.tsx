import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { useState } from "react";
import { UserForm, type UserFormState } from "./UserForm";
import { renderWithProviders } from "../test/renderWithProviders";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const ax = vi.mocked(axios);

afterEach(() => vi.useRealTimers());

// ── Helpers ──────────────────────────────────────────────────────────────────

const blank: UserFormState = { name: "", email: "", password: "", role: "AGENT" };

function Setup({
  showPassword = true,
  showRole = false,
  error = null,
  fieldErrors,
}: {
  showPassword?: boolean;
  showRole?: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string>;
}) {
  const [form, setForm] = useState<UserFormState>(blank);
  return (
    <UserForm
      form={form}
      setForm={setForm}
      showPassword={showPassword}
      showRole={showRole}
      error={error}
      fieldErrors={fieldErrors}
    />
  );
}

function renderForm(props: Parameters<typeof Setup>[0] = {}) {
  return renderWithProviders(<Setup {...props} />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("UserForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ax.get.mockResolvedValue({ data: { name: false, email: false } });
  });

  // ── Field rendering ──────────────────────────────────────────────────────

  describe("field rendering", () => {
    it("renders name and email fields", () => {
      renderForm();
      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    });

    it("renders the password field when showPassword=true", () => {
      renderForm({ showPassword: true });
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it("hides the password field when showPassword=false", () => {
      renderForm({ showPassword: false });
      expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    });

    it("hides the role select by default", () => {
      renderForm();
      expect(screen.queryByLabelText(/^role$/i)).not.toBeInTheDocument();
    });

    it("renders the role select when showRole=true", () => {
      renderForm({ showRole: true });
      expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument();
    });
  });

  // ── Name validation ──────────────────────────────────────────────────────

  describe("name validation", () => {
    it("shows error when fewer than 3 characters are typed", async () => {
      renderForm();
      await userEvent.setup({ delay: null }).type(screen.getByLabelText(/^name$/i), "ab");
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });

    it("clears the error once 3 or more characters are present", async () => {
      renderForm();
      const ue = userEvent.setup({ delay: null });
      const input = screen.getByLabelText(/^name$/i);
      await ue.type(input, "ab");
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      await ue.type(input, "c");
      expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
    });

    it("shows required error when name is cleared after being touched", async () => {
      renderForm();
      const ue = userEvent.setup({ delay: null });
      const input = screen.getByLabelText(/^name$/i);
      await ue.type(input, "abc");
      await ue.clear(input);
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  // ── Email validation ─────────────────────────────────────────────────────

  describe("email validation", () => {
    it("shows error for an invalid email format", async () => {
      renderForm();
      await userEvent.setup({ delay: null }).type(screen.getByLabelText(/^email$/i), "notanemail");
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });

    it("clears the error once a valid format is entered", async () => {
      renderForm();
      const ue = userEvent.setup({ delay: null });
      const input = screen.getByLabelText(/^email$/i);
      await ue.type(input, "notanemail");
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      await ue.clear(input);
      await ue.type(input, "valid@example.com");
      expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
    });

    it("shows required error when email is cleared after being touched", async () => {
      renderForm();
      const ue = userEvent.setup({ delay: null });
      const input = screen.getByLabelText(/^email$/i);
      await ue.type(input, "a");
      await ue.clear(input);
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  // ── Password validation ──────────────────────────────────────────────────

  describe("password validation", () => {
    it("shows error when password is fewer than 8 characters", async () => {
      renderForm();
      await userEvent.setup({ delay: null }).type(screen.getByLabelText(/^password$/i), "short");
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });

    it("clears the error once 8 or more characters are entered", async () => {
      renderForm();
      const ue = userEvent.setup({ delay: null });
      const input = screen.getByLabelText(/^password$/i);
      await ue.type(input, "short");
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      await ue.type(input, "enough!");
      expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();
    });
  });

  // ── Password peek toggle ─────────────────────────────────────────────────

  describe("password peek", () => {
    it("password input is masked by default", () => {
      renderForm();
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "password");
    });

    it("clicking show password reveals the password as plain text", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /show password/i }));
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "text");
    });

    it("clicking again re-masks the password", () => {
      renderForm();
      fireEvent.click(screen.getByRole("button", { name: /show password/i }));
      fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "password");
    });
  });

  // ── Server error prop ────────────────────────────────────────────────────

  describe("server error", () => {
    it("displays the error message passed via the error prop", () => {
      renderForm({ error: "Email already in use" });
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
    });
  });

  // ── fieldErrors from parent ──────────────────────────────────────────────

  describe("fieldErrors from parent", () => {
    it("shows field errors injected by the parent on submit", () => {
      renderForm({
        fieldErrors: { name: "Name is required.", email: "Email is required." },
      });
      expect(screen.getByText("Name is required.")).toBeInTheDocument();
      expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });
  });

  // ── Uniqueness check ─────────────────────────────────────────────────────

  describe("uniqueness check", () => {
    it("calls the check endpoint after a valid name is entered", async () => {
      vi.useFakeTimers();
      renderForm();

      fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Admin" } });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(ax.get).toHaveBeenCalledWith("/api/users/check", { params: { name: "Admin" } });
    });

    it("shows taken error when the name is already in use", async () => {
      vi.useFakeTimers();
      ax.get.mockResolvedValue({ data: { name: true } });
      renderForm();

      fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Admin" } });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(screen.getByText(/name is already taken/i)).toBeInTheDocument();
    });

    it("calls the check endpoint after a valid email is entered", async () => {
      vi.useFakeTimers();
      renderForm();

      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: "admin@test.com" },
      });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(ax.get).toHaveBeenCalledWith("/api/users/check", {
        params: { email: "admin@test.com" },
      });
    });

    it("shows taken error when the email is already in use", async () => {
      vi.useFakeTimers();
      ax.get.mockResolvedValue({ data: { email: true } });
      renderForm();

      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: "admin@test.com" },
      });
      await act(async () => { vi.advanceTimersByTime(400); });
      expect(screen.getByText(/email is already taken/i)).toBeInTheDocument();
    });
  });
});
