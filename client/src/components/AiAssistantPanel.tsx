import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";

type Ticket = {
  id: string;
  summary?: string | null;
  suggestedReply?: string | null;
};

type AiAssistantPanelProps = {
  ticket: Ticket;
  onUseReply: (text: string) => void;
};

export function AiAssistantPanel({ ticket, onUseReply }: AiAssistantPanelProps) {
  const qc = useQueryClient();

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/tickets/${ticket.id}/ai-suggest`);
      return data;
    },
    onSuccess: (data) => {
      // Update the ticket cache with the fresh AI content
      qc.setQueryData(["ticket", ticket.id], data);
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* AI Summary Card */}
      <div className="bg-white rounded-xl ring-1 ring-indigo-200 p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
        <h2 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-1.5">
          <span>✨</span> AI Summary
        </h2>
        {regenerate.isPending ? (
          <div className="animate-pulse flex flex-col gap-2 mt-3">
            <div className="h-4 bg-indigo-100 rounded w-3/4"></div>
            <div className="h-4 bg-indigo-100 rounded w-full"></div>
            <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
          </div>
        ) : ticket.summary ? (
          <p className="text-sm text-gray-700 leading-relaxed">{ticket.summary}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No AI summary available.</p>
        )}
      </div>

      {/* AI Suggested Reply Card */}
      <div className="bg-white rounded-xl ring-1 ring-purple-200 p-4 shadow-sm relative overflow-hidden flex flex-col">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-purple-900 flex items-center gap-1.5">
            <span>💡</span> Suggested Reply
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
          >
            {regenerate.isPending ? "Regenerating..." : "Regenerate ↻"}
          </Button>
        </div>

        {regenerate.isPending ? (
          <div className="animate-pulse flex flex-col gap-2 mt-2 flex-grow">
            <div className="h-4 bg-purple-100 rounded w-full"></div>
            <div className="h-4 bg-purple-100 rounded w-full"></div>
            <div className="h-4 bg-purple-100 rounded w-2/3"></div>
          </div>
        ) : ticket.suggestedReply ? (
          <div className="flex flex-col flex-grow">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-purple-50/50 p-3 rounded-lg border border-purple-100 flex-grow">
              {ticket.suggestedReply}
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => onUseReply(ticket.suggestedReply!)}
              >
                Use as Reply
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic mt-2">No AI suggestion available.</p>
        )}
      </div>
    </div>
  );
}
