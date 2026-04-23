import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createUserSchema } from "core";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import { Skeleton } from "../components/ui/skeleton";
import { authClient } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  isActive: boolean;
  createdAt: string;
};

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "AGENT";
};

type UsersResponse = {
  data: User[];
  total: number;
  page: number;
  limit: number;
};

const LIMIT = 10;


function validateField(field: "name" | "email" | "password", value: string): string {
  const result = createUserSchema.shape[field].safeParse(value);
  if (!result.success) return result.error.issues[0].message;
  return "";
}

async function fetchUsers(page: number, search: string): Promise<UsersResponse> {
  const { data } = await axios.get("/api/users", {
    params: { page, limit: LIMIT, ...(search ? { search } : {}) },
  });
  return data;
}

export default function UsersPage() {
  const { data: session } = authClient.useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<UserFormState>({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, debouncedSearch],
    queryFn: () => fetchUsers(page, debouncedSearch),
    placeholderData: (prev) => prev,
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["users"] });
  }

  const createMutation = useMutation({
    mutationFn: (payload: UserFormState) => axios.post("/api/users", payload),
    onSuccess: () => { setCreateOpen(false); invalidate(); },
    onError: (err: any) => setFormError(err.response?.data?.error || "Failed to create user."),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UserFormState> }) =>
      axios.patch(`/api/users/${id}`, payload),
    onSuccess: () => { setEditUser(null); invalidate(); },
    onError: (err: any) => setFormError(err.response?.data?.error || "Failed to update user."),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/users/${id}/toggle-active`),
    onSuccess: () => invalidate(),
    onError: (err: any) => setFormError(err.response?.data?.error || "Failed to update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/users/${id}`),
    onSuccess: () => {
      setDeleteUser(null);
      if (users.length === 1 && page > 1) setPage((p) => p - 1);
      else invalidate();
    },
    onError: (err: any) => setFormError(err.response?.data?.error || "Failed to delete user."),
  });

  function openCreate() {
    setForm({ name: "", email: "", password: "", role: "AGENT" });
    setFormError(null);
    setFieldErrors({});
    setCreateOpen(true);
  }

  function openEdit(user: User) {
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setFormError(null);
    setEditUser(user);
  }

  function handleCreate() {
    const result = createUserSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    createMutation.mutate(form);
  }

  function handleEdit() {
    if (!editUser) return;
    setFormError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    editMutation.mutate({
      id: editUser.id,
      payload: { name: form.name, email: form.email, role: form.role },
    });
  }

  function isSelf(userId: string) {
    return userId === currentUserId;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <Button onClick={openCreate}>Add User</Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {isError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
            Could not load users. Please try again.
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Skeleton className="h-7 w-12 rounded-md" />
                        <Skeleton className="h-7 w-20 rounded-md" />
                        <Skeleton className="h-7 w-14 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {user.name}
                      {isSelf(user.id) && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.isActive ? "default" : "destructive"}
                        className={user.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf(user.id) || toggleMutation.isPending}
                          title={isSelf(user.id) ? "Cannot deactivate your own account" : undefined}
                          onClick={() => toggleMutation.mutate(user.id)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isSelf(user.id)}
                          title={isSelf(user.id) ? "Cannot delete your own account" : undefined}
                          onClick={() => { setFormError(null); setDeleteUser(user); }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(isLoading || total > 0) && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            {isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <span>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} users
            </span>
          )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={isLoading || page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              {isLoading ? <Skeleton className="h-4 w-24" /> : <span>Page {page} of {totalPages}</span>}
              <Button variant="outline" size="sm" disabled={isLoading || page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setFieldErrors({}); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} showPassword showRole={false} error={formError} fieldErrors={fieldErrors} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <UserForm
            form={form}
            setForm={setForm}
            showPassword={false}
            error={formError}
            disableRole={!!editUser && isSelf(editUser.id)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={editMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-medium text-gray-900">{deleteUser?.name}</span>? This action
            cannot be undone.
          </p>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({
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
