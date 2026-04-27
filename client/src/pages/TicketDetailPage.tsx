import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import NavBar from "../components/NavBar";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { AiAssistantPanel } from "../components/AiAssistantPanel";

const statusStyles: Record<string, { dot: string; label: string; color: string }> = {
  OPEN:     { dot: "bg-blue-500",  label: "Open",     color: "text-blue-700"  },
  PENDING:  { dot: "bg-amber-500", label: "Pending",   color: "text-amber-700" },
  RESOLVED: { dot: "bg-green-500", label: "Resolved",  color: "text-green-700" },
  CLOSED:   { dot: "bg-gray-400",  label: "Closed",    color: "text-gray-500"  },
};

const categoryLabels: Record<string, string> = {
  __none__:         "No Category",
  GENERAL_QUESTION: "General Question",
  TECHNICAL_ISSUE:  "Technical Issue",
  REFUND_REQUEST:   "Refund Request",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type TicketMessage = {
  id: string;
  body: string;
  fromStudent: boolean;
  createdAt: string;
};

type Ticket = {
  id: string;
  subject: string;
  studentEmail: string;
  status: string;
  category: string | null;
  summary?: string | null;
  suggestedReply?: string | null;
  assignee: { id: string; name: string } | null;
  messages: TicketMessage[];
  createdAt: string;
};

type User = {
  id: string;
  name: string;
  isActive: boolean;
};

async function fetchTicket(id: string): Promise<Ticket> {
  const { data } = await axios.get(`/api/tickets/${id}`);
  return data;
}

async function fetchUsers(): Promise<User[]> {
  const { data } = await axios.get("/api/users", { params: { limit: 100 } });
  return data.data;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [replyBody, setReplyBody] = useState("");

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const updateTicket = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.patch(`/api/tickets/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", id] }),
  });

  const addReply = useMutation({
    mutationFn: (body: string) =>
      axios.post(`/api/tickets/${id}/messages`, { body }),
    onSuccess: () => {
      setReplyBody("");
      qc.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  const enhanceReply = useMutation({
    mutationFn: async (draft: string) => {
      const { data } = await axios.post(`/api/tickets/${id}/ai-enhance-reply`, { draft });
      return data as { enhancedReply: string };
    },
    onSuccess: (data) => {
      setReplyBody(data.enhancedReply);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-red-600 text-sm">Ticket not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/tickets")}>
            Back to tickets
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate("/tickets")}
          className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1 transition-colors"
        >
          ← Back to tickets
        </button>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">{ticket.subject}</h1>
        <p className="text-sm text-gray-500 mb-6">{ticket.studentEmail}</p>

        <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-white rounded-xl ring-1 ring-gray-200">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
            <Select
              value={ticket.status}
              onValueChange={(value) => updateTicket.mutate({ status: value })}
            >
              <SelectTrigger className="w-36" aria-label="Change status">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusStyles[ticket.status]?.dot ?? "bg-gray-400"}`} />
                    <span className={`font-medium ${statusStyles[ticket.status]?.color ?? "text-gray-700"}`}>
                      {statusStyles[ticket.status]?.label ?? ticket.status}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
            <Select
              value={ticket.category ?? "__none__"}
              onValueChange={(value) =>
                updateTicket.mutate({ category: value === "__none__" ? null : value })
              }
            >
              <SelectTrigger className="w-48" aria-label="Change category">
                <SelectValue>
                  <span className="font-medium text-gray-800">
                    {categoryLabels[ticket.category ?? "__none__"] ?? "No Category"}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Category</SelectItem>
                <SelectItem value="GENERAL_QUESTION">General Question</SelectItem>
                <SelectItem value="TECHNICAL_ISSUE">Technical Issue</SelectItem>
                <SelectItem value="REFUND_REQUEST">Refund Request</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assignee</span>
            <Select
              value={ticket.assignee?.id ?? "__none__"}
              onValueChange={(value) =>
                updateTicket.mutate({ assigneeId: value === "__none__" ? null : value })
              }
            >
              <SelectTrigger className="w-44" aria-label="Change assignee">
                <SelectValue>
                  {ticket.assignee ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0">
                        {initials(ticket.assignee.name)}
                      </span>
                      <span className="font-medium text-gray-800">{ticket.assignee.name}</span>
                    </span>
                  ) : (
                    <span className="italic text-gray-400">Unassigned</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg ${
                msg.fromStudent
                  ? "bg-blue-50 border-l-4 border-blue-400"
                  : "bg-gray-50 border-l-4 border-gray-300 ml-8"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {msg.fromStudent ? ticket.studentEmail : "Agent"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>

        <AiAssistantPanel ticket={ticket} />

        <div className="bg-white rounded-xl ring-1 ring-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Reply</h2>
          <textarea
            aria-label="Reply"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex items-center justify-between mt-3">
            <Button
              variant="outline"
              onClick={() => enhanceReply.mutate(replyBody)}
              disabled={enhanceReply.isPending}
              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              {enhanceReply.isPending ? "Enhancing..." : "✨ Enhance Reply"}
            </Button>
            <Button
              onClick={() => {
                if (replyBody.trim()) addReply.mutate(replyBody.trim());
              }}
              disabled={!replyBody.trim() || addReply.isPending}
            >
              {addReply.isPending ? "Sending..." : "Send Reply"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
