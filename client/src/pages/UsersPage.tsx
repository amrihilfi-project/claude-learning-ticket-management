import { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
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

const LIMIT = 10;

export default function UsersPage() {
  const { data: session } = authClient.useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<UserFormState>({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json();
      setUsers(json.data);
      setTotal(json.total);
    } catch {
      setError("Could not load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  function openCreate() {
    setForm({ name: "", email: "", password: "", role: "AGENT" });
    setFormError(null);
    setCreateOpen(true);
  }

  function openEdit(user: User) {
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setFormError(null);
    setEditUser(user);
  }

  async function handleCreate() {
    setFormError(null);
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError("All fields are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to create user.");
        return;
      }
      setCreateOpen(false);
      fetchUsers();
    } catch {
      setFormError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editUser) return;
    setFormError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, role: form.role }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Failed to update user.");
        return;
      }
      setEditUser(null);
      fetchUsers();
    } catch {
      setFormError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const res = await fetch(`/api/users/${user.id}/toggle-active`, { method: "PATCH" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to update user status.");
        return;
      }
      fetchUsers();
    } catch {
      setError("Something went wrong.");
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error || "Failed to delete user.");
        return;
      }
      setDeleteUser(null);
      if (users.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchUsers();
    } catch {
      setFormError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
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

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
            {error}
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
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
                        className={
                          user.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : ""
                        }
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf(user.id)}
                          title={isSelf(user.id) ? "Cannot deactivate your own account" : undefined}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isSelf(user.id)}
                          title={isSelf(user.id) ? "Cannot delete your own account" : undefined}
                          onClick={() => setDeleteUser(user)}
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

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} users
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <UserForm form={form} setForm={setForm} showPassword error={formError} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
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
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
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
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete"}
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
  error,
  disableRole = false,
}: {
  form: UserFormState;
  setForm: React.Dispatch<React.SetStateAction<UserFormState>>;
  showPassword: boolean;
  error: string | null;
  disableRole?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Full name"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="user@example.com"
        />
      </div>
      {showPassword && (
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 8 characters"
          />
        </div>
      )}
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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
