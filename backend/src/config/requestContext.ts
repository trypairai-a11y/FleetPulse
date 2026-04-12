import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  ipAddress?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}
