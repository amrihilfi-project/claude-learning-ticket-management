import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import axios from "axios";
import NavBar from "../components/NavBar";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { TicketStatusBadge } from "../components/TicketStatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

type Ticket = {
  id: string;
  subject: string;
  studentEmail: string;
  status: string;
  category: string | null;
  assignee: { id: string; name: string } | null;
  createdAt: string;
};

type TicketsResponse = {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
};

const LIMIT = 20;

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL_QUESTION: "General Question",
  TECHNICAL_ISSUE: "Technical Issue",
  REFUND_REQUEST: "Refund Request",
};

async function fetchTickets(
  page: number,
  status: string,
  category: string,
  sortBy: string,
  sortOrder: string
): Promise<TicketsResponse> {
  const params: Record<string, unknown> = { page, limit: LIMIT, sortBy, sortOrder };
  if (status !== "ALL") params.status = status;
  if (category !== "ALL") params.category = category;
  const { data } = await axios.get("/api/tickets", { params });
  return data;
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ChevronUp size={14} />;
  if (sorted === "desc") return <ChevronDown size={14} />;
  return <ChevronsUpDown size={14} className="text-gray-400" />;
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="font-medium text-gray-900 max-w-xs truncate block">
        {row.original.subject}
      </span>
    ),
  },
  {
    accessorKey: "studentEmail",
    header: "Student",
    cell: ({ row }) => <span className="text-gray-600">{row.original.studentEmail}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-gray-600">
        {row.original.category
          ? (CATEGORY_LABELS[row.original.category] ?? row.original.category)
          : "—"}
      </span>
    ),
  },
  {
    id: "assignee",
    header: "Assignee",
    cell: ({ row }) => (
      <span className="text-gray-600">{row.original.assignee?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-gray-500">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

export default function TicketsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sorting, setSorting] = useState<SortingState>([]);

  const sortBy = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc === false ? "asc" : "desc";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", page, statusFilter, categoryFilter, sortBy, sortOrder],
    queryFn: () => fetchTickets(page, statusFilter, categoryFilter, sortBy, sortOrder),
    placeholderData: (prev) => prev,
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setPage(1);
        return next;
      });
    },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleStatusFilter(value: string | null) {
    if (value) setStatusFilter(value);
    setPage(1);
  }

  function handleCategoryFilter(value: string | null) {
    if (value) setCategoryFilter(value);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tickets</h1>

        <div className="flex gap-3 mb-4">
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</span>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">Category</span>
            <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-48" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="GENERAL_QUESTION">General Question</SelectItem>
                <SelectItem value="TECHNICAL_ISSUE">Technical Issue</SelectItem>
                <SelectItem value="REFUND_REQUEST">Refund Request</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide select-none"
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
              {isLoading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-red-600">
                    Failed to load tickets.
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/tickets/${row.original.id}`)}
                  >
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

        {data && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              {data.total} ticket{data.total !== 1 ? "s" : ""} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
