export const queryKeys = {
  drivers: {
    all: ["drivers"] as const,
    list: (filters?: unknown) => ["drivers", "list", filters] as const,
    detail: (id: string) => ["drivers", "detail", id] as const,
    stats: (id: string) => ["drivers", "stats", id] as const,
    leaderboard: () => ["drivers", "leaderboard"] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (filters?: unknown) => ["orders", "list", filters] as const,
    summary: (date?: string) => ["orders", "summary", date] as const,
    hourly: (date?: string) => ["orders", "hourly", date] as const,
  },
  attendance: {
    all: ["attendance"] as const,
    list: (filters?: unknown) => ["attendance", "list", filters] as const,
    summary: (date?: string) => ["attendance", "summary", date] as const,
  },
  shifts: {
    all: ["shifts"] as const,
    list: (filters?: unknown) => ["shifts", "list", filters] as const,
    detail: (id: string) => ["shifts", "detail", id] as const,
    templates: () => ["shifts", "templates"] as const,
    calendar: (dateFrom: string, dateTo: string) => ["shifts", "calendar", dateFrom, dateTo] as const,
  },
  vehicles: {
    all: ["vehicles"] as const,
    list: (filters?: unknown) => ["vehicles", "list", filters] as const,
    detail: (id: string) => ["vehicles", "detail", id] as const,
    spare: () => ["vehicles", "spare"] as const,
  },
  inspections: {
    list: (vehicleId: string) => ["inspections", "list", vehicleId] as const,
  },
  maintenance: {
    list: (vehicleId: string) => ["maintenance", "list", vehicleId] as const,
  },
  cash: {
    all: ["cash"] as const,
    list: (filters?: unknown) => ["cash", "list", filters] as const,
    summary: (dateFrom?: string, dateTo?: string) => ["cash", "summary", dateFrom, dateTo] as const,
    outstanding: () => ["cash", "outstanding"] as const,
  },
  tickets: {
    all: ["tickets"] as const,
    list: (filters?: unknown) => ["tickets", "list", filters] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
    stats: () => ["tickets", "stats"] as const,
    comments: (ticketId: string) => ["tickets", "comments", ticketId] as const,
  },
  devices: {
    all: ["devices"] as const,
    list: (filters?: unknown) => ["devices", "list", filters] as const,
    detail: (id: string) => ["devices", "detail", id] as const,
    commands: (deviceId: string) => ["devices", "commands", deviceId] as const,
  },
  ai: {
    chat: () => ["ai", "chat"] as const,
    alerts: (filters?: unknown) => ["ai", "alerts", filters] as const,
    alertCount: () => ["ai", "alerts", "count"] as const,
    digest: () => ["ai", "digest"] as const,
    digests: (page?: number) => ["ai", "digests", page] as const,
    scores: (filters?: unknown) => ["ai", "scores", filters] as const,
    driverScore: (driverId: string) => ["ai", "scores", "driver", driverId] as const,
  },
  reports: {
    all: ["reports"] as const,
    list: (filters?: unknown) => ["reports", "list", filters] as const,
  },
};
