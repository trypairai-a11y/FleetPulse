// Mock driverService — used by drivers route for batch stats enrichment
export const resolveDriverDateRange = jest.fn().mockResolvedValue({
  targetStart: new Date("2026-04-14T00:00:00"),
  targetEnd: new Date("2026-04-15T00:00:00"),
});

export const batchLoadDriverStats = jest.fn().mockResolvedValue(new Map());

export const resolveTalabatStatus = jest.fn().mockReturnValue(undefined);
