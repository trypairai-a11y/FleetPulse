// Mock auth middleware — injects a test user on every request
export function authMiddleware(req: any, _res: any, next: any) {
  req.user = {
    userId: "test-user-id",
    tenantId: "test-tenant-id",
    role: "ADMIN",
    email: "test@darb.com",
  };
  next();
}
