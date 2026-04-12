import { Platform } from "../generated/prisma";

/**
 * Shared shape returned by every platform's "drivers summary" endpoint.
 * Fields are optional because each platform surfaces a different subset;
 * the `extra` bag carries fields unique to one platform (e.g. Keeta's
 * validDayRate, Talabat's avgSessionsPerWeek) without polluting the base
 * type or forcing other adapters to compute them.
 */
export interface DriverSummary {
  totalDrivers?: number;
  activeDrivers?: number;
  inactiveDrivers?: number;
  suspendedDrivers?: number;
  avgDeliveriesPerDay?: number;
  extra?: Record<string, number | string>;
}

/**
 * Minimal adapter surface. Each platform implements the methods relevant
 * to it and returns `null` (or throws `NotSupportedError`) for the rest.
 * The point is to drive what's currently copy-pasted across four route
 * files from a single contract so tiers, averaging windows, and source
 * models live in one place per platform.
 */
export interface PlatformAdapter {
  readonly platform: Platform;
  getDriverSummary(tenantId: string, opts?: { companyId?: string }): Promise<DriverSummary>;
}

export class NotSupportedError extends Error {
  constructor(public platform: Platform, public operation: string) {
    super(`${platform} does not support ${operation}`);
  }
}
