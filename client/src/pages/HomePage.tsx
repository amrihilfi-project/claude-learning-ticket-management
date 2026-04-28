import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router";
import NavBar from "../components/NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { authClient } from "../lib/auth-client";

async function fetchCount(params: Record<string, string>): Promise<number> {
  const { data } = await axios.get("/api/tickets", { params: { ...params, limit: "1" } });
  return (data.total as number) ?? 0;
}

export default function HomePage() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const userId = session?.user?.id;
  const isAgent = role === "AGENT";
  const agentFilter = isAgent && userId ? { assigneeId: userId } : {};
  const sessionReady = !!session;

  const openQ = useQuery({ queryKey: ["tickets-count", "OPEN", userId ?? null], queryFn: () => fetchCount({ status: "OPEN", ...agentFilter }), enabled: sessionReady });
  const pendingQ = useQuery({ queryKey: ["tickets-count", "PENDING", userId ?? null], queryFn: () => fetchCount({ status: "PENDING", ...agentFilter }), enabled: sessionReady });
  const resolvedQ = useQuery({ queryKey: ["tickets-count", "RESOLVED", userId ?? null], queryFn: () => fetchCount({ status: "RESOLVED", ...agentFilter }), enabled: sessionReady });
  const closedQ = useQuery({ queryKey: ["tickets-count", "CLOSED", userId ?? null], queryFn: () => fetchCount({ status: "CLOSED", ...agentFilter }), enabled: sessionReady });

  const generalQ = useQuery({ queryKey: ["tickets-count-cat", "GENERAL_QUESTION", userId ?? null], queryFn: () => fetchCount({ category: "GENERAL_QUESTION", ...agentFilter }), enabled: sessionReady });
  const technicalQ = useQuery({ queryKey: ["tickets-count-cat", "TECHNICAL_ISSUE", userId ?? null], queryFn: () => fetchCount({ category: "TECHNICAL_ISSUE", ...agentFilter }), enabled: sessionReady });
  const refundQ = useQuery({ queryKey: ["tickets-count-cat", "REFUND_REQUEST", userId ?? null], queryFn: () => fetchCount({ category: "REFUND_REQUEST", ...agentFilter }), enabled: sessionReady });

  const statusCards = [
    { label: "Open",     count: openQ.data,     color: "text-blue-600",   status: "OPEN"     },
    { label: "Pending",  count: pendingQ.data,  color: "text-yellow-600", status: "PENDING"  },
    { label: "Resolved", count: resolvedQ.data, color: "text-green-600",  status: "RESOLVED" },
    { label: "Closed",   count: closedQ.data,   color: "text-gray-500",   status: "CLOSED"   },
  ];

  const totalByStatus =
    (openQ.data ?? 0) + (pendingQ.data ?? 0) + (resolvedQ.data ?? 0) + (closedQ.data ?? 0);
  const allStatusLoaded = [openQ, pendingQ, resolvedQ, closedQ].every((q) => q.data !== undefined);
  const uncategorizedCount = allStatusLoaded
    ? totalByStatus - (generalQ.data ?? 0) - (technicalQ.data ?? 0) - (refundQ.data ?? 0)
    : undefined;

  const categoryCards = [
    { label: "General Question", count: generalQ.data,      category: "GENERAL_QUESTION" as string | null },
    { label: "Technical Issue",  count: technicalQ.data,    category: "TECHNICAL_ISSUE"  as string | null },
    { label: "Refund Request",   count: refundQ.data,       category: "REFUND_REQUEST"   as string | null },
    { label: "Uncategorized",    count: uncategorizedCount, category: null               },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome to Ticket Management</h1>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-500">
              {isAgent ? "Your assigned tickets" : "Dashboard overview"}
            </p>
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
            {statusCards.map(({ label, count, color, status }) => (
              <Link key={label} to={`/tickets?status=${status}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${color}`}>{count ?? "—"}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="tickets by category" className="mt-8">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            By Category
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categoryCards.map(({ label, count, category }) => {
              const card = (
                <Card className={category ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
                  <CardHeader>
                    <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-gray-900">{count ?? "—"}</p>
                  </CardContent>
                </Card>
              );
              return category ? (
                <Link key={label} to={`/tickets?category=${category}`}>{card}</Link>
              ) : (
                <div key={label}>{card}</div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
