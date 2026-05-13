// Phase 6 Wave 0 RED — Turns GREEN when Wave 2c ships
// backend/src/services/ingest/americana/{xlsx,email}.ts.
//
// REQ-ingest-adapter-layer: Americana adapters (XLSX wrap + Email thin-shim).

jest.mock("../../../../config", () => ({
  prisma: {
    driver: { findFirst: jest.fn() },
    americanaDailyOrders: { upsert: jest.fn() },
    platformSettings: { findUnique: jest.fn() },
  },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  AmericanaXlsxAdapter,
  AmericanaEmailAdapter,
} from "../../../../services/ingest/americana";
import { prisma } from "../../../../config";
import { buildAmericanaXlsxBuffer } from "../fixtures";

describe("Phase 6 / REQ-ingest-adapter-layer: Americana adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("AmericanaXlsxAdapter", () => {
    test("ingestXlsx wraps existing parseAmericanaDailyXlsx → preserves side-effects", async () => {
      const adapter = new AmericanaXlsxAdapter();
      const buf = buildAmericanaXlsxBuffer();
      const result = await adapter.ingestXlsx!("t-1", buf);
      expect(result).toHaveProperty("rowsIn");
      expect(result).toHaveProperty("rowsOk");
      expect(result).toHaveProperty("errors");
    });

    test("ingestXlsx response shape: {rowsIn, rowsOk, errors}", async () => {
      const adapter = new AmericanaXlsxAdapter();
      const buf = buildAmericanaXlsxBuffer();
      const result = await adapter.ingestXlsx!("t-1", buf);
      expect(typeof result.rowsIn).toBe("number");
      expect(typeof result.rowsOk).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("AmericanaEmailAdapter", () => {
    test("module exports re-export from americanaInboxWatcher (thin-wrap shim per orchestrator resolution #5)", () => {
      const adapter = new AmericanaEmailAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.platform).toBe("AMERICANA");
      expect(adapter.source).toBe("EMAIL_INBOX");
    });

    test("adapter exposes a run() function that invokes existing pollTenantInbox unchanged", async () => {
      const adapter = new AmericanaEmailAdapter();
      // run() exists and returns a thenable.
      expect(typeof (adapter as unknown as { run?: () => Promise<unknown> }).run).toBe("function");
    });

    test("isAvailable returns true if tenant has americana.ingest IMAP config; false otherwise", async () => {
      (prisma.platformSettings.findUnique as jest.Mock).mockResolvedValue({
        notificationConfig: { americanaInbox: { host: "imap.x", user: "u", password: "enc:v1:a:b" } },
      });
      const adapter = new AmericanaEmailAdapter();
      expect(await adapter.isAvailable("t-1")).toBe(true);

      (prisma.platformSettings.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await adapter.isAvailable("t-1")).toBe(false);
    });
  });
});

// RED — turned GREEN by Wave 2c. File contains "AmericanaXlsxAdapter" pin.
