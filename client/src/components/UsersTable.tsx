import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  isActive: boolean;
  createdAt: string;
};

type Props = {
  users: User[];
  isLoading: boolean;
  currentUserId: string | undefined;
  page: number;
  total: number;
  totalPages: number;
  limit: number;
  togglePending: boolean;
  onEdit: (user: User) => void;
  onToggle: (id: string) => void;
  onDelete: (user: User) => void;
  onPageChange: (page: number) => void;
};

export function UsersTable({
  users,
  isLoading,
  currentUserId,
  page,
  total,
  totalPages,
  limit,
  togglePending,
  onEdit,
  onToggle,
  onDelete,
  onPageChange,
}: Props) {
  function isSelf(id: string) {
    return id === currentUserId;
  }

  return (
    <>
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
                      <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSelf(user.id) || togglePending}
                        title={isSelf(user.id) ? "Cannot deactivate your own account" : undefined}
                        onClick={() => onToggle(user.id)}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSelf(user.id)}
                        title={isSelf(user.id) ? "Cannot delete your own account" : undefined}
                        onClick={() => onDelete(user)}
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
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={isLoading || page === 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            {isLoading ? <Skeleton className="h-4 w-24" /> : <span>Page {page} of {totalPages}</span>}
            <Button variant="outline" size="sm" disabled={isLoading || page === totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
