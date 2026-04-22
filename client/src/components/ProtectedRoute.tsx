import { Navigate } from "react-router";
import { authClient } from "../lib/auth-client";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const role = (session.user as any).role as string | undefined;

  if (roles && role == null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (roles && !roles.includes(role ?? "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
