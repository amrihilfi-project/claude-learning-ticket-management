import NavBar from "../components/NavBar";

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
      </main>
    </div>
  );
}
