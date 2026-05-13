// Phase 6 Wave 0 RED — Turns GREEN when Wave 1 ships
// backend/src/services/ingest/audit.ts.
//
// REQ-ingest-adapter-layer: writeIngestRun({tenantId, platform, source, status, ...})
// must create a tenant-scoped IngestRun row.

jest.mock("../../../config", () => ({
  prisma: {
    ingestRun: {
      create: jest.fn(),
    },
  },
}));

import { prisma } from "../../../config";
import { writeIngestRun } from "../../../services/ingest/audit";

describe("Phase 6 / REQ-ingest-adapter-layer: writeIngestRun audit helper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.ingestRun.create as jest.Mock).mockResolvedValue({ id: "run-1" });
  });

  test("writeIngestRun creates tenant-scoped IngestRun row", async () => {
    const startedAt = new Date("2026-05-01T00:00:00Z");
    const finishedAt = new Date("2026-05-01T00:01:00Z");
    await writeIngestRun({
      tenantId: "t-1",
      platform: "KEETA",
      source: "XLSX_IMPORT",
      status: "SUCCESS",
      rowsIn: 10,
      rowsOk: 10,
      startedAt,
      finishedAt,
    });
    expect(prisma.ingestRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t-1",
          platform: "KEETA",
          source: "XLSX_IMPORT",
          status: "SUCCESS",
          rowsIn: 10,
          rowsOk: 10,
          startedAt,
          finishedAt,
        }),
      }),
    );
  });

  test("writeIngestRun status='FAILED' with errorLog string ≤4000 chars persists errorLog", async () => {
    const err = "x".repeat(100);
    await writeIngestRun({
      tenantId: "t-1",
      platform: "TALABAT",
      source: "PORTAL_SCRAPER",
      status: "FAILED",
      startedAt: new Date(),
      errorLog: err,
    });
    const args = (prisma.ingestRun.create as jest.Mock).mock.calls[0][0];
    expect(args.data.errorLog).toBe(err);
    expect(args.data.status).toBe("FAILED");
  });

  test("writeIngestRun trims errorLog over 4000 chars to 4000-char prefix", async () => {
    const huge = "y".repeat(5000);
    await writeIngestRun({
      tenantId: "t-1",
      platform: "KEETA",
      source: "PORTAL_SCRAPER",
      status: "FAILED",
      startedAt: new Date(),
      errorLog: huge,
    });
    const args = (prisma.ingestRun.create as jest.Mock).mock.calls[0][0];
    expect(args.data.errorLog).toHaveLength(4000);
    expect(args.data.errorLog).toBe("y".repeat(4000));
  });

  test("writeIngestRun returns {id: string}", async () => {
    const result = await writeIngestRun({
      tenantId: "t-1",
      platform: "DELIVEROO",
      source: "XLSX_IMPORT",
      status: "SUCCESS",
      startedAt: new Date(),
    });
    expect(typeof result.id).toBe("string");
    expect(result.id).toBe("run-1");
  });
});

// RED — turned GREEN by Wave 1
