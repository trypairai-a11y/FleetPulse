// Wave 0 RED test — turns GREEN in Wave 2 when backend/src/agent/pinnedView.ts
// ships with createPinnedView() + listPinsForUser(). Do not skip.
//
// Behavior contract:
// PinnedView is per-USER (not just per-tenant) — owner A and owner B
// in the same tenant cannot see each other's pins. Pins are listed
// in sortOrder ASC. REQ-data-pinned-view.

import {
  createPinnedView,
  listPinsForUser,
} from "../../agent/pinnedView";
import { prisma } from "../mocks/config";

describe("PinnedView — REQ-data-pinned-view (per-user CRUD)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.pinnedView.create as jest.Mock).mockResolvedValue({
      id: "pin-1",
    });
  });

  test("create writes tenantId, userId, title, viewType, spec", async () => {
    await createPinnedView({
      tenantId: "t1",
      userId: "user-1",
      title: "My drivers leaderboard",
      viewType: "table",
      spec: { columns: ["name", "score"] },
    });
    expect(prisma.pinnedView.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "t1",
        userId: "user-1",
        title: "My drivers leaderboard",
        viewType: "table",
        spec: { columns: ["name", "score"] },
      }),
    });
  });

  test("listForUser scopes by BOTH tenantId AND userId, ordered by sortOrder asc", async () => {
    (prisma.pinnedView.findMany as jest.Mock).mockResolvedValue([]);
    await listPinsForUser("t1", "user-1");
    expect(prisma.pinnedView.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "t1",
          userId: "user-1",
        }),
        orderBy: { sortOrder: "asc" },
      }),
    );
  });

  test("listForUser returns empty array when prisma returns []", async () => {
    (prisma.pinnedView.findMany as jest.Mock).mockResolvedValue([]);
    const pins = await listPinsForUser("t1", "user-1");
    expect(pins).toEqual([]);
  });

  test("listForUser does NOT include another user's pins (mock-side isolation guard)", async () => {
    // Seed two pins — one for user-1, one for user-2. The implementation
    // MUST pass userId in the where clause; if the mock receives it, then
    // production would as well. Verify the where filter, not the data.
    (prisma.pinnedView.findMany as jest.Mock).mockImplementation(
      ({ where }: { where: { tenantId: string; userId: string } }) => {
        const all = [
          { id: "pin-1", tenantId: "t1", userId: "user-1", title: "A" },
          { id: "pin-2", tenantId: "t1", userId: "user-2", title: "B" },
        ];
        return Promise.resolve(
          all.filter(
            (p) => p.tenantId === where.tenantId && p.userId === where.userId,
          ),
        );
      },
    );
    const u1Pins = await listPinsForUser("t1", "user-1");
    expect(u1Pins).toHaveLength(1);
    expect(u1Pins[0]).toMatchObject({ userId: "user-1", title: "A" });
  });
});
