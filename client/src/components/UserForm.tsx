import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createUserSchema } from "core";
import axios from "axios";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "AGENT";
};

function validateField(field: "name" | "email" | "password", value: string): string {
  const result = createUserSchema.shape[field].safeParse(value);
  if (!result.success) return result.error.issues[0].message;
  return "";
}

export function UserForm({
  form,
  setForm,
  showPassword,
  showRole = true,
  error,
  fieldErrors = {},
  disableRole = false,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  showPassword: boolean;
  showRole?: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
  disableRole?: boolean;
}) {
  const [peekPassword, setPeekPassword] = useState(false);
  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return;
    setLiveErrors((prev) => ({ ...prev, ...fieldErrors }));
    setTouched((prev) => {
      const next = new Set(prev);
      Object.keys(fieldErrors).forEach((k) => next.add(k));
      return next;
    });
  }, [fieldErrors]);

  function handleChange(field: "name" | "email" | "password", value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setTouched((prev) => new Set(prev).add(field));

    const formatErr = validateField(field, value);
    if (formatErr) {
      setLiveErrors((e) => ({ ...e, [field]: formatErr }));
      clearTimeout(debounceRefs.current[field]);
      setChecking((s) => { const next = new Set(s); next.delete(field); return next; });
      return;
    }
    setLiveErrors((e) => ({ ...e, [field]: "" }));

    if (field === "name" || field === "email") {
      clearTimeout(debounceRefs.current[field]);
      setChecking((s) => new Set(s).add(field));
      debounceRefs.current[field] = setTimeout(async () => {
        try {
          const param = field === "name"
            ? { name: value.trim() }
            : { email: value.trim().toLowerCase() };
          const { data } = await axios.get("/api/users/check", { params: param });
          setLiveErrors((e) => ({
            ...e,
            [field]: data[field] ? `${field === "name" ? "Name" : "Email"} is already taken.` : "",
          }));
        } catch { /* ignore */ }
        setChecking((s) => { const next = new Set(s); next.delete(field); return next; });
      }, 400);
    }
  }

  function fieldClass(field: string, extra = "") {
    const err = touched.has(field) && liveErrors[field];
    const ok = touched.has(field) && !liveErrors[field] && !checking.has(field);
    const state = err ? "border-red-500 focus-visible:ring-red-500" : ok ? "border-green-500 focus-visible:ring-green-500" : "";
    return `${extra} ${state}`.trim();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="Full name"
          className={fieldClass("name")}
        />
        {touched.has("name") && liveErrors.name && <p className="text-xs text-red-600">{liveErrors.name}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="user@example.com"
          className={fieldClass("email")}
        />
        {touched.has("email") && liveErrors.email && <p className="text-xs text-red-600">{liveErrors.email}</p>}
      </div>
      {showPassword && (
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={peekPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Min. 8 characters"
              className={fieldClass("password", "pr-9")}
            />
            <button
              type="button"
              onClick={() => setPeekPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {peekPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {touched.has("password") && liveErrors.password && <p className="text-xs text-red-600">{liveErrors.password}</p>}
        </div>
      )}
      {showRole && (
        <div className="space-y-1">
          <Label htmlFor="role">Role</Label>
          <Select
            value={form.role}
            onValueChange={(value) => setForm((f) => ({ ...f, role: value as "ADMIN" | "AGENT" }))}
            disabled={disableRole}
          >
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AGENT">Agent</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
          {disableRole && (
            <p className="text-xs text-gray-400">You cannot change your own role.</p>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
