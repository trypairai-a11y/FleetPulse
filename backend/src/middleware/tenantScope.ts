import { Request, Response, NextFunction } from "express";

export function tenantScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.tenantId) {
    res.status(401).json({ error: "Tenant context required" });
    return;
  }
  next();
}
