import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil } from "lucide-react";
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
  sorting: SortingState;
  onSortingChange: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onDeactivate?: (user: User) => void;
  onActivate?: (user: User) => void;
  onRestore?: (user: User) => void;
  onPageChange: (page: number) => void;
};

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ChevronUp size={14} />;
  if (sorted === "desc") return <ChevronDown size={14} />;
  return <ChevronsUpDown size={14} className="text-gray-400" />;
}

export function UsersTable({
  users,
  isLoading,
  currentUserId,
  page,
  total,
  totalPages,
  limit,
  sorting,
  onSortingChange,
  onEdit,
  onDelete,
  onDeactivate,
  onActivate,
  onRestore,
  onPageChange,
}: Props) {
  function isSelf(id: string) {
    return id === currentUserId;
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <>
          {row.original.name}
          {isSelf(row.original.id) && (
            <span className="ml-2 text-xs text-gray-400">(you)</span>
          )}
        </>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-gray-600">{row.original.email}</span>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "ADMIN" ? "default" : "secondary"}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => (
        <span className="text-gray-500">
          {new Date(row.original.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          {onRestore ? (
            <Button variant="outline" size="sm" onClick={() => onRestore(row.original)}>
              Restore
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                <Pencil size={14} />
                Edit
              </Button>
              {row.original.isActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSelf(row.original.id)}
                  title={isSelf(row.original.id) ? "Cannot deactivate your own account" : undefined}
                  onClick={() => onDeactivate?.(row.original)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onActivate?.(row.original)}
                >
                  Activate
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={isSelf(row.original.id)}
                title={isSelf(row.original.id) ? "Cannot delete your own account" : undefined}
                onClick={() => onDelete(row.original)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-3 font-medium text-gray-600 select-none"
                    style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Skeleton className="h-7 w-12 rounded-md" />
                      <Skeleton className="h-7 w-14 rounded-md" />
                    </div>
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
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
