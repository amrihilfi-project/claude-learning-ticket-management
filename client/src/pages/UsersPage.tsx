import { useRef, useState } from "react";
import { createUserSchema } from "core";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NavBar from "../components/NavBar";
import { authClient } from "../lib/auth-client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { UserForm, type UserFormState } from "../components/UserForm";
import { UsersTable, type User } from "../components/UsersTable";

type UsersResponse = {
  data: User[];
  total: number;
  page: number;
  limit: number;
};

const LIMIT = 10;

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

        <UsersTable
          users={users}
          isLoading={isLoading}
          currentUserId={currentUserId}
          page={page}
          total={total}
          totalPages={totalPages}
          limit={LIMIT}
          onEdit={openEdit}
          onDelete={(user) => { setFormError(null); setDeleteUser(user); }}
          onPageChange={setPage}
        />
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
            disableRole={!!editUser && editUser.id === currentUserId}
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

