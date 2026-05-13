/**
 * Wave 0 RED test — turns GREEN in Wave 2 when:
 *   1. POST /api/agent/delivery-photo writes OrderEvent
 *      (action="DELIVERY_PHOTO", metadata={photoKey,latitude,longitude})
 *   2. The endpoint rejects 403 when the key prefix doesn't match the
 *      caller's tenant (cross-tenant forgery — Pitfall 5 in RESEARCH.md)
 *   3. The endpoint rejects 400 on out-of-range lat/lng
 */

import express from "express";
import request from "supertest";
import { getMockPrisma, resetAllMocks } from "../setup";

const agentRouter = require("../../routes/agent").default;

const app = express();
app.use(express.json());
app.use("/api/agent", agentRouter);

describe("/api/agent/delivery-photo — Wave 0 RED scaffolding", () => {
  beforeEach(() => resetAllMocks());

  test("creates OrderEvent with action=DELIVERY_PHOTO + photoKey + lat/lng metadata", async () => {
    const prisma = getMockPrisma();
    prisma.device.findUnique.mockResolvedValue({
      id: "dev1",
      tenantId: "tenA",
      driverId: "drv1",
      driver: { id: "drv1", tenantId: "tenA" },
    });
    prisma.orderEvent.create.mockResolvedValue({ id: "oe1", tenantId: "tenA" });

    const res = await request(app).post("/api/agent/delivery-photo").send({
      deviceId: "dev1",
      orderId: "order1",
      key: "tenA/order1/dev1/12345.jpg",
      capturedAt: new Date().toISOString(),
      latitude: 29.3759,
      longitude: 47.9774,
    });

    expect(res.status).toBe(200);
    expect(prisma.orderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenA",
        orderId: "order1",
        action: "DELIVERY_PHOTO",
        metadata: expect.objectContaining({
          photoKey: "tenA/order1/dev1/12345.jpg",
          latitude: 29.3759,
          longitude: 47.9774,
        }),
      }),
    });
  });

  test("rejects 403 when key prefix tenant mismatch (cross-tenant forgery)", async () => {
    const prisma = getMockPrisma();
    prisma.device.findUnique.mockResolvedValue({
      id: "dev1",
      tenantId: "tenA",
      driverId: "drv1",
      driver: { id: "drv1", tenantId: "tenA" },
    });

    const res = await request(app).post("/api/agent/delivery-photo").send({
      deviceId: "dev1",
      orderId: "order1",
      key: "tenB/order1/dev1/12345.jpg", // ← tenant B prefix, caller is A
      capturedAt: new Date().toISOString(),
      latitude: 29.3759,
      longitude: 47.9774,
    });

    expect(res.status).toBe(403);
    expect(prisma.orderEvent.create).not.toHaveBeenCalled();
  });

  test("rejects 400 when latitude out of range [-90, 90]", async () => {
    const prisma = getMockPrisma();
    prisma.device.findUnique.mockResolvedValue({
      id: "dev1",
      tenantId: "tenA",
      driverId: "drv1",
      driver: { id: "drv1", tenantId: "tenA" },
    });
    const res = await request(app).post("/api/agent/delivery-photo").send({
      deviceId: "dev1",
      orderId: "order1",
      key: "tenA/order1/dev1/12345.jpg",
      capturedAt: new Date().toISOString(),
      latitude: 999,
      longitude: 0,
    });
    expect(res.status).toBe(400);
  });
});
