import { Badge } from "./ui/badge";

type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-blue-100 text-blue-800 border-blue-200" },
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  RESOLVED: { label: "Resolved", className: "bg-green-100 text-green-800 border-green-200" },
  CLOSED: { label: "Closed", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function TicketStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as TicketStatus] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
