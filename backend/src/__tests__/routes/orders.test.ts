import request from "supertest";
import express from "express";
import { getMockPrisma, resetAllMocks } from "../setup";
import ordersRouter from "../../routes/orders";

const app = express();
app.use(express.json());
app.use("/api/orders", ordersRouter);

describe("Orders route integration tests", () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // ─── GET /api/orders ─────────────────────────────────────────────────────

  describe("GET /api/orders", () => {
    it("returns a paginated response with empty data", async () => {
      const prisma = getMockPrisma();
      prisma.orderLog.findMany.mockResolvedValueOnce([]);
      prisma.orderLog.count.mockResolvedValueOnce(0);

      const res = await request(app).get("/api/orders");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        total: 0,
        totalPages: 0,
      });
    });

    it("returns enriched order records", async () => {
      const prisma = getMockPrisma();
      const mockOrder = {
        id: "ord-1",
        orderNumber: "ORD-2026-001",
        platform: "KEETA",
        date: new Date("2026-04-14"),
        orderCount: 5,
        cashCollected: 12.5,
        tenantId: "test-tenant-id",
        driverId: "drv-1",
        driver: {
          id: "drv-1",
          name: "Ahmed Ali",
          platform: "KEETA",
          zone: "Hawally",
          batchNumber: "B1",
          company: { name: "FastFleet" },
        },
      };
      prisma.orderLog.findMany.mockResolvedValueOnce([mockOrder]);
      prisma.orderLog.count.mockResolvedValueOnce(1);

      const res = await request(app).get("/api/orders?platform=KEETA");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty("orderNumber", "ORD-2026-001");
      expect(res.body.data[0]).toHaveProperty("zone", "Hawally");
      expect(res.body.data[0]).toHaveProperty("companyName", "FastFleet");
      expect(res.body.data[0]).toHaveProperty("deliveriesCount", 5);
      expect(res.body.data[0]).toHaveProperty("cashCollectedKd", 12.5);
    });

    it("applies date range filters", async () => {
      const prisma = getMockPrisma();
      prisma.orderLog.findMany.mockResolvedValueOnce([]);
      prisma.orderLog.count.mockResolvedValueOnce(0);

      await request(app).get("/api/orders?dateFrom=2026-04-01&dateTo=2026-04-14");

      expect(prisma.orderLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  // ─── GET /api/orders/:id ─────────────────────────────────────────────────

  describe("GET /api/orders/:id", () => {
    it("returns 404 when order is not found", async () => {
      const prisma = getMockPrisma();
      prisma.orderLog.findFirst.mockResolvedValueOnce(null);

      const res = await request(app).get("/api/orders/nonexistent-id");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Order not found");
    });

    it("returns the order when found", async () => {
      const prisma = getMockPrisma();
      const mockOrder = {
        id: "ord-1",
        orderNumber: "ORD-2026-001",
        platform: "KEETA",
        date: new Date("2026-04-14"),
        orderCount: 3,
        tenantId: "test-tenant-id",
        driver: { id: "drv-1", name: "Ahmed" },
        shift: null,
      };
      prisma.orderLog.findFirst.mockResolvedValueOnce(mockOrder);

      const res = await request(app).get("/api/orders/ord-1");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", "ord-1");
      expect(res.body).toHaveProperty("orderNumber", "ORD-2026-001");
    });
  });

  // ─── POST /api/orders ────────────────────────────────────────────────────

  describe("POST /api/orders", () => {
    const validBody = {
      driverId: "drv-1",
      platform: "KEETA",
      date: "2026-04-14",
      orderCount: 8,
      cashCollected: 15.0,
    };

    it("creates an order and returns 201", async () => {
      const prisma = getMockPrisma();
      const createdOrder = {
        id: "ord-new",
        ...validBody,
        tenantId: "test-tenant-id",
      };
      prisma.orderLog.create.mockResolvedValueOnce(createdOrder);

      const res = await request(app)
        .post("/api/orders")
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", "ord-new");
      expect(prisma.orderLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "test-tenant-id",
            driverId: "drv-1",
            platform: "KEETA",
            orderCount: 8,
          }),
        })
      );
    });

    it("returns 400 when driverId is missing", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({ platform: "KEETA", date: "2026-04-14", orderCount: 5 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "driverId" }),
        ])
      );
    });

    it("returns 400 when orderCount is fractional", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({ ...validBody, orderCount: 2.5 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Validation failed");
    });

    it("returns 400 for invalid platform", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({ ...validBody, platform: "UBER" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Validation failed");
    });

    it("creates an overcollection alert when cash exceeds sales", async () => {
      const prisma = getMockPrisma();
      const body = {
        ...validBody,
        cashCollected: 100,
        totalAmount: 50, // cash is 2x the total — well over 5% threshold
      };
      const createdOrder = { id: "ord-overcash", ...body, tenantId: "test-tenant-id" };
      prisma.alert.create.mockResolvedValueOnce({});
      prisma.orderLog.create.mockResolvedValueOnce(createdOrder);

      const res = await request(app)
        .post("/api/orders")
        .send(body);

      expect(res.status).toBe(201);
      expect(prisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "cash_overcollection",
            severity: "CRITICAL",
          }),
        })
      );
    });
  });

  // ─── DELETE /api/orders/:id ──────────────────────────────────────────────

  describe("DELETE /api/orders/:id", () => {
    it("deletes the order and returns success message", async () => {
      const prisma = getMockPrisma();
      prisma.orderLog.deleteMany.mockResolvedValueOnce({ count: 1 });

      const res = await request(app).delete("/api/orders/ord-1");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "Order deleted");
    });
  });
});
