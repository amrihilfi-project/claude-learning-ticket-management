import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router";
import NavBar from "../components/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

async function fetchCount(params: Record<string, string>): Promise<number> {
  const { data } = await axios.get("/api/tickets", { params: { ...params, limit: "1" } });
  return (data.total as number) ?? 0;
}

export default function HomePage() {
  const openQ = useQuery({ queryKey: ["tickets-count", "OPEN"], queryFn: () => fetchCount({ status: "OPEN" }) });
  const pendingQ = useQuery({ queryKey: ["tickets-count", "PENDING"], queryFn: () => fetchCount({ status: "PENDING" }) });
  const resolvedQ = useQuery({ queryKey: ["tickets-count", "RESOLVED"], queryFn: () => fetchCount({ status: "RESOLVED" }) });
  const closedQ = useQuery({ queryKey: ["tickets-count", "CLOSED"], queryFn: () => fetchCount({ status: "CLOSED" }) });

  const generalQ = useQuery({ queryKey: ["tickets-count-cat", "GENERAL_QUESTION"], queryFn: () => fetchCount({ category: "GENERAL_QUESTION" }) });
  const technicalQ = useQuery({ queryKey: ["tickets-count-cat", "TECHNICAL_ISSUE"], queryFn: () => fetchCount({ category: "TECHNICAL_ISSUE" }) });
  const refundQ = useQuery({ queryKey: ["tickets-count-cat", "REFUND_REQUEST"], queryFn: () => fetchCount({ category: "REFUND_REQUEST" }) });

  const statusCards = [
    { label: "Open", count: openQ.data, color: "text-blue-600" },
    { label: "Pending", count: pendingQ.data, color: "text-yellow-600" },
    { label: "Resolved", count: resolvedQ.data, color: "text-green-600" },
    { label: "Closed", count: closedQ.data, color: "text-gray-500" },
  ];

  const categoryCards = [
    { label: "General Question", count: generalQ.data },
    { label: "Technical Issue", count: technicalQ.data },
    { label: "Refund Request", count: refundQ.data },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome to Ticket Management</h1>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-500">Dashboard overview</p>
            <Link to="/tickets" className="text-sm text-blue-600 hover:underline">
              View all tickets →
            </Link>
          </div>
        </div>

        <section aria-label="tickets by status">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            By Status
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statusCards.map(({ label, count, color }) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${color}`}>{count ?? "—"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-label="tickets by category" className="mt-8">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            By Category
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {categoryCards.map(({ label, count }) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-gray-900">{count ?? "—"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
