// Shared mock for Phase 3 Driver File tests. Shape mirrors the
// DriverFileData type that Wave 2 will create at @/types/driver-file.
// Wave 0 declares the shape inline; Wave 2 replaces with the canonical type.

export const mockDriverFileData = {
  profile: {
    id: "drv_d1",
    name: "Mohamed Khaled",
    civilIdMasked: "XXXXXXXX1234",
    photoUrl: null,
    status: "ACTIVE",
    platformIds: { keeta: "K-123", talabat: "T-456" },
  },
  liveStatus: {
    onlineNow: true,
    lastSeenAt: "2026-05-10T07:00:00Z",
    activeShift: { id: "sh_1", platform: "keeta", startsAt: "2026-05-10T06:00:00Z" },
  },
  score: {
    compositeScore: 78,
    attendanceScore: 80,
    deliveryScore: 75,
    financialScore: 80,
    equipmentScore: 90,
    platformScore: 70,
    trend: "STABLE" as const,
    scoreDate: "2026-05-09",
  },
  scoreExplanation: {
    text: "Mohamed scores 78 / 100. Attendance is strong; delivery is on target.",
    cached: false,
  },
  snapshots90d: [
    { snapshotDate: "2026-04-01", compositeScore: 75 },
    { snapshotDate: "2026-04-15", compositeScore: 76 },
    { snapshotDate: "2026-05-01", compositeScore: 78 },
  ],
  attendance: { last14Days: [], lateCount: 1, absentCount: 0 },
  cash: { outstanding: 0, lastSettlement: null, mismatchFlags: [] },
  violations: { open: [], resolved: [] },
  agentNotes: { proposals: [], observations: [], audit: [] },
  decisionAuditLog: { approved: [], pending: [] },
};
