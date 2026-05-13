// Phase 6 Wave 0 RED — Turns GREEN when Wave 3 ships
// backend/src/routes/talabat.ts::POST /import.
//
// REQ-ingest-adapter-layer: POST /api/talabat/import — canonical XLSX upload shape
// {success, rowsIn, rowsOk, errors} per CON-xlsx-fallback. Mirrors Keeta /import.

import request from "supertest";
import express from "express";

// Mocks must be hoisted before the route under test imports prisma.
jest.mock("../../config", () => ({
  prisma: {
    driver: { findFirst: jest.fn() },
    talabatDailyMetrics: { upsert: jest.fn() },
    ingestRun: { create: jest.fn() },
  },
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  env: { JWT_SECRET: "test" },
}));

import { prisma } from "../../config";
import talabatRouter from "../../routes/talabat";
import { buildTalabatXlsxBuffer } from "../services/ingest/fixtures";

function makeApp() {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).user = { tenantId: "t-1", userId: "u-1", role: "ADMIN" };
    next();
  });
  app.use("/api/talabat", talabatRouter);
  return app;
}

describe("Phase 6 / REQ-ingest-adapter-layer: POST /api/talabat/import", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.driver.findFirst as jest.Mock).mockImplementation(({ where }) =>
      Promise.resolve({ id: `drv-${where.platformDriverId}`, tenantId: where.tenantId }),
    );
    (prisma.talabatDailyMetrics.upsert as jest.Mock).mockResolvedValue({ id: "tdm-1" });
    (prisma.ingestRun.create as jest.Mock).mockResolvedValue({ id: "run-1" });
  });

  test("valid XLSX upload → 200 {success: true, rowsIn: N, rowsOk: M, errors: []}", async () => {
    const app = makeApp();
    const buf = buildTalabatXlsxBuffer();
    const res = await request(app)
      .post("/api/talabat/import")
      .attach("file", buf, { filename: "talabat.xlsx" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        rowsIn: expect.any(Number),
        rowsOk: expect.any(Number),
        errors: expect.any(Array),
      }),
    );
  });

  test("no file in multipart body → 400 {error: 'No file uploaded'}", async () => {
    const app = makeApp();
    const res = await request(app).post("/api/talabat/import");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("writes IngestRun row {tenantId, platform: 'TALABAT', source: 'XLSX_IMPORT', status: 'SUCCESS'}", async () => {
    const app = makeApp();
    const buf = buildTalabatXlsxBuffer();
    await request(app)
      .post("/api/talabat/import")
      .attach("file", buf, { filename: "talabat.xlsx" });
    expect(prisma.ingestRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t-1",
          platform: "TALABAT",
          source: "XLSX_IMPORT",
          status: "SUCCESS",
        }),
      }),
    );
  });

  test("duplicate upload (same buffer twice) → idempotent (no row-count doubling)", async () => {
    const app = makeApp();
    const buf = buildTalabatXlsxBuffer();
    const a = await request(app).post("/api/talabat/import").attach("file", buf, { filename: "x.xlsx" });
    const b = await request(app).post("/api/talabat/import").attach("file", buf, { filename: "x.xlsx" });
    expect(a.body.rowsOk).toBe(b.body.rowsOk);
  });

  test("uploaded XLSX with driver_id from a different tenant → errors[] entry; cross-tenant rejection (Pitfall 3)", async () => {
    (prisma.driver.findFirst as jest.Mock).mockResolvedValue(null);
    const app = makeApp();
    const buf = buildTalabatXlsxBuffer();
    const res = await request(app)
      .post("/api/talabat/import")
      .attach("file", buf, { filename: "x.xlsx" });
    expect(res.status).toBe(200);
    expect(res.body.rowsOk).toBe(0);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

// RED — turned GREEN by Wave 3. File contains "POST /api/talabat/import" pin.
