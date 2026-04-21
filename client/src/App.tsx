import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

function Home() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div>
      <h1>Ticket Management</h1>
      <p>API status: {status ?? "checking..."}</p>
    </div>
  );
}
