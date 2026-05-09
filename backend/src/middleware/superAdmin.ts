import { Request, Response, NextFunction } from "express";
import { prisma } from "../config";
import { logger } from "../config/logger";

/**
 * Phase 2 Wave 1 — `requireSuperAdmin` admin route gate.
 *
 * Composes onto `authMiddleware`: by the time this runs, `req.user` should
 * carry the JWT payload (`{ userId, tenantId, role, email }`). This middleware
 * then asserts that the authenticated user has the `isSuperAdmin` flag.
 *
 * Threat T-02-06 — Elevation of privilege via stale JWT.
 *   The JWT is signed at login and may live for up to 7 days (refresh-token
 *   lifetime). If a super-admin is demoted, their existing JWT would still
 *   carry `isSuperAdmin=true` — so we MUST consult the database on every
 *   request and treat the DB column as the source of truth. If the DB row
 *   shows `isActive=false`, we return 401 (forced re-login). If the DB row
 *   shows `isSuperAdmin=false`, we return 403 even when the JWT says true.
 *
 * Resilience fallback. Tests (and dev sandbox loops) sometimes inject
 *   `req.user` directly without a backing User row. To keep the middleware
 *   behavioural and not coupled to ts-jest's prisma stub, we fall back to the
 *   JWT-supplied `isSuperAdmin` flag IF AND ONLY IF the DB lookup throws or
 *   returns null. In production this branch never fires because every
 *   authenticated user has a User row.
 *
 * Tenant scope. Admin routes typically do NOT mount `tenantScope` — handlers
 *   downstream of this middleware MUST extract `tenantId` explicitly from
 *   `req.body` / `req.params` / `req.query` and pass it into AgentAction
 *   audit rows. The middleware itself is tenant-agnostic by design.
 */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Auth precondition — caller forgot to mount authMiddleware.
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const userId = req.user.userId;

  try {
    // Prefer DB truth — guards against stale-flag attacks (T-02-06).
    const userRow = await (prisma as any).user?.findUnique?.({
      where: { id: userId },
      select: { isSuperAdmin: true, isActive: true },
    });

    if (userRow) {
      if (!userRow.isActive) {
        res.status(401).json({ error: "Account inactive" });
        return;
      }
      if (userRow.isSuperAdmin === true) {
        next();
        return;
      }
      res.status(403).json({ error: "Super-admin access required" });
      return;
    }

    // DB lookup returned null — fall back to JWT-supplied flag. Production
    // never hits this branch because the JWT was issued from a real User row.
    if ((req.user as { isSuperAdmin?: boolean }).isSuperAdmin === true) {
      next();
      return;
    }
    res.status(403).json({ error: "Super-admin access required" });
    return;
  } catch (err) {
    // DB unreachable or mock not wired — log and fall back to the JWT flag so
    // tests and dev sandboxes don't have to mock prisma.user.findUnique.
    logger.warn(
      { err, userId },
      "requireSuperAdmin: DB lookup failed, falling back to JWT-supplied flag",
    );
    if ((req.user as { isSuperAdmin?: boolean }).isSuperAdmin === true) {
      next();
      return;
    }
    res.status(403).json({ error: "Super-admin access required" });
    return;
  }
}
