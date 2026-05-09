// Mock auth middleware — injects a test user when none has been set yet.
//
// Phase 2 Wave 2: route tests for /api/decisions/* compose their own
// pre-router middleware to set req.user (so they can assert tenantId
// scoping with custom values). The mock used to unconditionally
// overwrite that req.user, defeating the tests' intent. Now it only
// fills in defaults when req.user is missing — same default identity
// as before for the route tests that depend on it.
export function authMiddleware(req: any, _res: any, next: any) {
  if (!req.user) {
    req.user = {
      userId: "test-user-id",
      tenantId: "test-tenant-id",
      role: "ADMIN",
      email: "test@darb.com",
    };
  }
  next();
}
