import { Request, Response, NextFunction } from "express";

type Role = "ADMIN" | "AGENT";

export function requireRole(...roles: Role[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const session = res.locals.session;
    if (!session || !roles.includes(session.user.role as Role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
