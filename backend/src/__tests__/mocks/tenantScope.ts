// Mock tenantScope — passes through since the mock auth already sets tenantId
export function tenantScope(_req: any, _res: any, next: any) {
  next();
}
