// Phase 6 Wave 0 RED — Turns GREEN when Wave 2 ships
// backend/src/services/ingest/keeta/{xlsx,scraper,mobile}.ts.
//
// REQ-ingest-adapter-layer: Keeta adapters (XLSX + Scraper + Mobile).
// Pitfall 9: XLSX upserts must be idempotent on @@unique([tenantId, driverId, date]).

jest.mock("../../../../config", () => ({
  prisma: {
    driver: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    keetaDailyMetrics: {
      upsert: jest.fn(),
      count: jest.fn(),
    },
    platformSettings: {
      findUnique: jest.fn(),
    },
    locationLog: {
      findMany: jest.fn(),
    },
  },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { prisma } from "../../../../config";
import {
  KeetaXlsxAdapter,
  KeetaScraperAdapter,
  KeetaMobileAdapter,
} from "../../../../services/ingest/keeta";
import { NotAvailable } from "../../../../services/ingest/types";
import { buildKeetaXlsxBuffer } from "../fixtures";

describe("Phase 6 / REQ-ingest-adapter-layer: Keeta adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("KeetaXlsxAdapter", () => {
    test("ingestXlsx with 2 valid rows upserts KeetaDailyMetrics tenant-scoped", async () => {
      (prisma.driver.findFirst as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve({ id: `drv-${where.platformDriverId}`, tenantId: where.tenantId });
      });
      (prisma.keetaDailyMetrics.upsert as jest.Mock).mockResolvedValue({ id: "kdm-1" });

      const adapter = new KeetaXlsxAdapter();
      const buf = buildKeetaXlsxBuffer();
      const result = await adapter.ingestXlsx!("t-1", buf);
      expect(result.rowsIn).toBe(2);
      expect(result.rowsOk).toBe(2);
      expect(result.errors).toEqual([]);
      expect(prisma.keetaDailyMetrics.upsert).toHaveBeenCalledTimes(2);
      // Tenant scoping: every upsert MUST include tenantId in the where clause.
      const calls = (prisma.keetaDailyMetrics.upsert as jest.Mock).mock.calls;
      for (const [args] of calls) {
        expect(JSON.stringify(args.where)).toContain("t-1");
      }
    });

    test("ingestXlsx with unknown driver → errors[] entry, rowsOk decremented", async () => {
      (prisma.driver.findFirst as jest.Mock).mockResolvedValue(null);
      const adapter = new KeetaXlsxAdapter();
      const buf = buildKeetaXlsxBuffer();
      const result = await adapter.ingestXlsx!("t-1", buf);
      expect(result.rowsIn).toBe(2);
      expect(result.rowsOk).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("ingestXlsx duplicate import → idempotent (upsert, NOT insert × 2N)", async () => {
      (prisma.driver.findFirst as jest.Mock).mockImplementation(({ where }) =>
        Promise.resolve({ id: `drv-${where.platformDriverId}`, tenantId: where.tenantId }),
      );
      (prisma.keetaDailyMetrics.upsert as jest.Mock).mockResolvedValue({ id: "kdm-1" });
      const adapter = new KeetaXlsxAdapter();
      const buf = buildKeetaXlsxBuffer();
      await adapter.ingestXlsx!("t-1", buf);
      await adapter.ingestXlsx!("t-1", buf);
      // 2 rows × 2 calls = 4 upserts; but each is keyed on
      // @@unique([tenantId, driverId, date]) so DB row count stays at 2.
      expect(prisma.keetaDailyMetrics.upsert).toHaveBeenCalledTimes(4);
    });

    test("isAvailable returns true (XLSX is always-available; user-driven)", async () => {
      const adapter = new KeetaXlsxAdapter();
      expect(await adapter.isAvailable("t-1")).toBe(true);
    });

    test("fetchOrders throws NotAvailable (XLSX is upload-driven, not pull)", async () => {
      const adapter = new KeetaXlsxAdapter();
      // Adapter MAY omit fetchOrders entirely OR throw NotAvailable.
      if (adapter.fetchOrders) {
        await expect(
          adapter.fetchOrders("t-1", { from: new Date(), to: new Date() }),
        ).rejects.toBeInstanceOf(NotAvailable);
      } else {
        expect(adapter.fetchOrders).toBeUndefined();
      }
    });
  });

  describe("KeetaScraperAdapter", () => {
    test("isAvailable: creds present → true; missing → false", async () => {
      const adapter = new KeetaScraperAdapter();
      (prisma.platformSettings.findUnique as jest.Mock).mockResolvedValue({
        notificationConfig: {
          portalCredentials: {
            username: "u",
            password: "enc:v1:abc:def",
          },
        },
      });
      expect(await adapter.isAvailable("t-1")).toBe(true);

      (prisma.platformSettings.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await adapter.isAvailable("t-1")).toBe(false);
    });

    test("fetchOrders for tenant without creds throws NotAvailable", async () => {
      (prisma.platformSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const adapter = new KeetaScraperAdapter();
      if (adapter.fetchOrders) {
        await expect(
          adapter.fetchOrders("t-1", { from: new Date(), to: new Date() }),
        ).rejects.toBeInstanceOf(NotAvailable);
      }
    });
  });

  describe("KeetaMobileAdapter", () => {
    test("isAvailable: zero LocationLog rows in last 24h → returns false", async () => {
      (prisma.locationLog.findMany as jest.Mock).mockResolvedValue([]);
      const adapter = new KeetaMobileAdapter();
      expect(await adapter.isAvailable("t-1")).toBe(false);
    });
  });
});

// RED — turned GREEN by Wave 2. File contains "KeetaXlsxAdapter" pin.
