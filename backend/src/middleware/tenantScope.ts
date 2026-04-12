import { Request, Response, NextFunction } from "express";
import { runWithContext } from "../config/requestContext";

export function tenantScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.tenantId) {
    res.status(401).json({ error: "Tenant context required" });
    return;
  }
  runWithContext(
    {
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      requestId: (req as any).id,
      ipAddress: req.ip,
    },
    () => next()
  );
}
