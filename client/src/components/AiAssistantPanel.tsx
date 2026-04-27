import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";

type Ticket = {
  id: string;
  summary?: string | null;
};

type AiAssistantPanelProps = {
  ticket: Ticket;
};

export function AiAssistantPanel({ ticket }: AiAssistantPanelProps) {
  const qc = useQueryClient();

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/tickets/${ticket.id}/ai-suggest`);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["ticket", ticket.id], data);
    },
  });

  return (
    <div className="bg-white rounded-xl ring-1 ring-indigo-200 p-4 shadow-sm relative overflow-hidden mb-4">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-indigo-900 flex items-center gap-1.5">
          <span>✨</span> AI Summary
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? "Regenerating..." : "Regenerate ↻"}
        </Button>
      </div>
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
  );
}
