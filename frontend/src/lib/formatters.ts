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
  ACTIVE: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  ONLINE: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  INACTIVE: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  OFFLINE: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  SUSPENDED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  TERMINATED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  LEAVE: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  RESTRICTED: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  RESTRICTED_PERMANENTLY: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  PERMANENTLY_RESTRICTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },

  // Attendance
  PRESENT: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  ON_TIME: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  LATE: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ABSENT: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  NO_SHOW: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  EXCUSED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  DAY_OFF: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },

  // Cash
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  SETTLED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  PARTIALLY_PAID: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },

  // Violations
  ESTABLISHED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  UNDER_REVIEW: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  OVERTURNED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  EXPIRED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },

  // Appeals
  NOT_RAISED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  APPROVED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },

  // Leave
  PLANNED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  COMPLETED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

const DEFAULT_STATUS_COLOR = { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };

export function getStatusColor(status: string | null | undefined) {
  if (!status) return DEFAULT_STATUS_COLOR;
  return STATUS_COLORS[status.toUpperCase()] || DEFAULT_STATUS_COLOR;
}

/**
 * Map platform name to brand color classes.
 */
export const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  TALABAT: { bg: "bg-orange-50", text: "text-orange-700" },
  KEETA: { bg: "bg-yellow-50", text: "text-yellow-700" },
  DELIVEROO: { bg: "bg-teal-50", text: "text-teal-700" },
  AMERICANA: { bg: "bg-blue-50", text: "text-blue-700" },
};

export function getPlatformColor(platform: string | null | undefined) {
  if (!platform) return { bg: "bg-gray-100", text: "text-gray-600" };
  return PLATFORM_COLORS[platform.toUpperCase()] || { bg: "bg-gray-100", text: "text-gray-600" };
}
