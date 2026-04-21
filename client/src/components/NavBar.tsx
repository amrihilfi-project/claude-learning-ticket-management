import { useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

export default function NavBar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <span className="font-semibold text-gray-900">Ticket Management</span>
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
