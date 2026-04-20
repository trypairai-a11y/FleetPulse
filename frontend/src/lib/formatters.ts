/**
 * Clean driver name by removing trailing platform ID suffixes.
 * e.g., "Ahmed Ali 123A - Hawally" → "Ahmed Ali"
 */
export function cleanDriverName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/\s+\d+[A-Za-z]?\s*[-–—]\s*\w+$/i, "").trim() || raw;
}

/**
 * Map driver/entity status to Tailwind color classes.
 */
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  // Driver status
  ACTIVE: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  ONLINE: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  INACTIVE: { bg: "bg-sand-200", text: "text-sand-800", dot: "bg-sand-500" },
  OFFLINE: { bg: "bg-sand-200", text: "text-sand-800", dot: "bg-sand-500" },
  SUSPENDED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  TERMINATED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  LEAVE: { bg: "bg-slate2/10", text: "text-slate2", dot: "bg-slate2" },
  RESTRICTED: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  RESTRICTED_PERMANENTLY: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  PERMANENTLY_RESTRICTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },

  // Attendance
  PRESENT: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  ON_TIME: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  LATE: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ABSENT: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  NO_SHOW: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  EXCUSED: { bg: "bg-slate2/10", text: "text-slate2", dot: "bg-slate2" },
  DAY_OFF: { bg: "bg-clay/10", text: "text-clay", dot: "bg-clay" },

  // Cash
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  SETTLED: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  PARTIALLY_PAID: { bg: "bg-slate2/10", text: "text-slate2", dot: "bg-slate2" },

  // Violations
  ESTABLISHED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  UNDER_REVIEW: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  OVERTURNED: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  EXPIRED: { bg: "bg-sand-200", text: "text-sand-800", dot: "bg-sand-500" },

  // Appeals
  NOT_RAISED: { bg: "bg-sand-200", text: "text-sand-800", dot: "bg-sand-500" },
  APPROVED: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },

  // Leave
  PLANNED: { bg: "bg-slate2/10", text: "text-slate2", dot: "bg-slate2" },
  COMPLETED: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  CANCELLED: { bg: "bg-sand-200", text: "text-sand-800", dot: "bg-sand-500" },
};

const DEFAULT_STATUS_COLOR = { bg: "bg-sand-200", text: "text-sand-800", dot: "bg-sand-500" };

export function getStatusColor(status: string | null | undefined) {
  if (!status) return DEFAULT_STATUS_COLOR;
  return STATUS_COLORS[status.toUpperCase()] || DEFAULT_STATUS_COLOR;
}

/**
 * Map platform name to brand color classes.
 */
export const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  TALABAT: { bg: "bg-talabat/10", text: "text-talabat" },
  KEETA: { bg: "bg-keeta/10", text: "text-keeta" },
  DELIVEROO: { bg: "bg-deliveroo/10", text: "text-deliveroo" },
  AMERICANA: { bg: "bg-americana/10", text: "text-americana" },
};

export function getPlatformColor(platform: string | null | undefined) {
  if (!platform) return { bg: "bg-sand-200", text: "text-sand-800" };
  return PLATFORM_COLORS[platform.toUpperCase()] || { bg: "bg-sand-200", text: "text-sand-800" };
}
