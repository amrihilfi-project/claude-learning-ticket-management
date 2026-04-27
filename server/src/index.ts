import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { hashPassword } from "better-auth/crypto";
import { createUserSchema } from "core";
import { auth } from "./lib/auth";
import prisma from "./lib/prisma";
import { requireSession } from "./middleware/session";
import { requireRole } from "./middleware/requireRole";
import webhooksRouter from "./routes/webhooks";
import ticketsRouter from "./routes/tickets";
import { startAutoClosePoller } from "./lib/auto-close";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL?.split(",") || ["http://localhost:5173", "http://localhost:5174"], credentials: true }));

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

// ─── User management (Admin only) ────────────────────────────────────────────

const USER_SORT_FIELDS = ["name", "email", "role", "createdAt"] as const;
type UserSortField = (typeof USER_SORT_FIELDS)[number];

app.get("/api/users", requireSession, requireRole("ADMIN"), async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const showDeleted = req.query.deleted === "true";

  const sortByParam = req.query.sortBy as string;
  const sortBy: UserSortField = USER_SORT_FIELDS.includes(sortByParam as UserSortField)
    ? (sortByParam as UserSortField)
    : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  // Main list: non-deleted users (deletedAt IS NULL), both active and inactive
  // Deleted view: soft-deleted users (deletedAt IS NOT NULL)
  const deletedFilter = showDeleted ? { not: null } : null;

  const where = search
    ? {
        deletedAt: deletedFilter,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : { deletedAt: deletedFilter };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, total, page, limit });
});


app.get("/api/users/check", requireSession, requireRole("ADMIN"), async (req, res) => {
  const result: { name?: boolean; email?: boolean } = {};
  if (typeof req.query.name === "string" && req.query.name.trim()) {
    const found = await prisma.user.findFirst({
      where: { name: { equals: req.query.name.trim(), mode: "insensitive" } },
    });
    result.name = !!found;
  }
  if (typeof req.query.email === "string" && req.query.email.trim()) {
    const found = await prisma.user.findUnique({
      where: { email: req.query.email.trim().toLowerCase() },
    });
    result.email = !!found;
  }
  res.json(result);
});

app.post("/api/users", requireSession, requireRole("ADMIN"), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const existingName = await prisma.user.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
  });
  if (existingName) {
    res.status(409).json({ error: "Name already in use" });
    return;
  }

  const now = new Date();
  const userId = crypto.randomUUID();
  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      emailVerified: false,
      role: role as "ADMIN" | "AGENT",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    },
  });

  res.status(201).json(user);
});

app.patch("/api/users/:id", requireSession, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const currentUserId = res.locals.session.user.id;
  const { name, email, role, isActive } = req.body as { name?: string; email?: string; role?: string; isActive?: boolean };

  if (role && id === currentUserId) {
    res.status(403).json({ error: "Cannot change your own role" });
    return;
  }
  if (role && !["ADMIN", "AGENT"].includes(role)) {
    res.status(400).json({ error: "role must be ADMIN or AGENT" });
    return;
  }
  if (isActive === false && id === currentUserId) {
    res.status(403).json({ error: "Cannot deactivate your own account" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (email && email.toLowerCase() !== target.email) {
    const conflict = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (conflict) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(email ? { email: email.toLowerCase().trim() } : {}),
      ...(role ? { role: role as "ADMIN" | "AGENT" } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      updatedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.json(updated);
});

app.delete("/api/users/:id", requireSession, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;
  const currentUserId = res.locals.session.user.id;

  if (id === currentUserId) {
    res.status(403).json({ error: "Cannot delete your own account" });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.deletedAt !== null) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
  res.status(204).send();
});

app.patch("/api/users/:id/restore", requireSession, requireRole("ADMIN"), async (req, res) => {
  const { id } = req.params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.deletedAt === null) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const restored = await prisma.user.update({
    where: { id },
    data: { deletedAt: null, isActive: true, updatedAt: new Date() },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  res.json(restored);
});

// ─── Example admin route ──────────────────────────────────────────────────────

app.get("/api/admin", requireSession, requireRole("ADMIN"), (_req, res) => {
  res.json({ message: "Admin access granted" });
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────

app.use("/api/webhooks", webhooksRouter);

// ─── Tickets ──────────────────────────────────────────────────────────────────

app.use("/api/tickets", ticketsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startAutoClosePoller();
});
