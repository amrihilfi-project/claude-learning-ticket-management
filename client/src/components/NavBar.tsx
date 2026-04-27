import { Link } from "react-router";
import { authClient } from "../lib/auth-client";

export default function NavBar() {
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-semibold text-gray-900 hover:text-gray-700 transition-colors">Ticket Management</Link>
        {session?.user && (
          <Link to="/tickets" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Tickets
          </Link>
        )}
        {session?.user?.role === "ADMIN" && (
          <Link to="/users" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <span className="text-sm text-gray-600">{session.user.name}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
