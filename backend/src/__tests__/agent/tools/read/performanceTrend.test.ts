jest.mock("../../../../config", () => require("../../../mocks/config"));

// Wave 1 creates this tool — registry lookup returns undefined today (RED).
import { toolRegistry } from "../../../../agent/registry";
import "../../../../agent"; // side-effect register all tools

describe("agent tool: performanceTrend (RED — Wave 1)", () => {
  it("registers performanceTrend in toolRegistry with strict=true", () => {
    const tool = toolRegistry.get("performanceTrend");
    expect(tool).toBeDefined();
    expect(tool?.strict).not.toBe(false);
    expect((tool?.inputSchema as any)?.additionalProperties).toBe(false);
  });

  it("declares description >= 200 chars", () => {
    const tool = toolRegistry.get("performanceTrend");
    expect((tool?.description ?? "").length).toBeGreaterThanOrEqual(200);
  });

  it("returns an array when called with valid args (tenant isolation enforced by Phase 1's prismaExtensions)", async () => {
    const agent = require("../../../../agent");
    const spy = jest.spyOn(agent, "listSnapshotsForDriver").mockResolvedValue([]);
    const tool = toolRegistry.get("performanceTrend");
    const ctx = { tenantId: "tenant-a", userId: "u1", role: "OPS_MANAGER" as const };
    const result = await tool!.execute(ctx as any, { driverId: "drv-b", daysBack: 30 });
    expect(Array.isArray(result)).toBe(true);
    expect(spy).toHaveBeenCalledWith("tenant-a", "drv-b", 30);
    spy.mockRestore();
  });

  it("respects daysBack default 90 when omitted", async () => {
    const agent = require("../../../../agent");
    const spy = jest.spyOn(agent, "listSnapshotsForDriver").mockResolvedValue([]);
    const tool = toolRegistry.get("performanceTrend");
    await tool!.execute({ tenantId: "t", userId: "u", role: "OPS_MANAGER" } as any, { driverId: "d1" });
    expect(spy).toHaveBeenCalledWith("t", "d1", 90);
    spy.mockRestore();
  });

  it("clamps daysBack to max 365", async () => {
    const agent = require("../../../../agent");
    const spy = jest.spyOn(agent, "listSnapshotsForDriver").mockResolvedValue([]);
    const tool = toolRegistry.get("performanceTrend");
    await tool!.execute({ tenantId: "t", userId: "u", role: "OPS_MANAGER" } as any, { driverId: "d1", daysBack: 1000 });
    expect(spy).toHaveBeenCalledWith("t", "d1", 365);
    spy.mockRestore();
  });
});
