import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireSession } from "./middleware/session";
import { requireRole } from "./middleware/requireRole";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Better Auth handler must be mounted before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Example: any authenticated user
app.get("/api/me", requireSession, (_req, res) => {
  res.json(res.locals.session);
});

// Example: admin only
app.get("/api/admin", requireSession, requireRole("ADMIN"), (_req, res) => {
  res.json({ message: "Admin access granted" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
