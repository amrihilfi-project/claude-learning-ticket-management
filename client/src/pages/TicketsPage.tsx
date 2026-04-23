import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
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
  category: string
): Promise<TicketsResponse> {
  const params: Record<string, unknown> = { page, limit: LIMIT };
  if (status !== "ALL") params.status = status;
  if (category !== "ALL") params.category = category;
  const { data } = await axios.get("/api/tickets", { params });
  return data;
}

export default function TicketsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", page, statusFilter, categoryFilter],
    queryFn: () => fetchTickets(page, statusFilter, categoryFilter),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleCategoryFilter(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tickets</h1>

        <div className="flex gap-3 mb-4">
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
        </div>

        <div className="bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Created
                </th>
              </tr>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-red-600">
                    Failed to load tickets.
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                data?.data.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ticket.studentEmail}</td>
                    <td className="px-4 py-3">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ticket.category ? (CATEGORY_LABELS[ticket.category] ?? ticket.category) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ticket.assignee?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
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
