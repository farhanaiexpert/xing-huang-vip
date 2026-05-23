import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: Super Admin access required" });
    return;
  }
  next();
}
