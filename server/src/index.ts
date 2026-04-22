import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireSession } from "./middleware/session";
import { requireRole } from "./middleware/requireRole";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Better Auth handler must be mounted before express.json()
if (process.env.NODE_ENV === "production") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again later." },
  });
  app.use("/api/auth/sign-in", authLimiter);
}
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireSession, (_req, res) => {
  const { user } = res.locals.session;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user as any).role,
  });
});

app.get("/api/users", requireSession, requireRole("ADMIN"), (_req, res) => {
  res.json([]);
});

// Example: admin only
app.get("/api/admin", requireSession, requireRole("ADMIN"), (_req, res) => {
  res.json({ message: "Admin access granted" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
