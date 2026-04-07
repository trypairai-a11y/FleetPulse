import { prisma } from "../config";

/**
 * Create notifications for all users matching the notification rules
 * for a given violation type within a tenant.
 */
export async function createViolationNotifications(params: {
  tenantId: string;
  eventType: string;
  severity: string;
  title: string;
  message: string;
  sourceId?: string;
  metadata?: any;
}) {
  const { tenantId, eventType, severity, title, message, sourceId, metadata } = params;

  // Find notification rules for this event type
  const rules = await prisma.notificationRule.findMany({
    where: {
      tenantId,
      eventType,
      enabled: true,
    },
  });

  if (rules.length === 0) return { created: 0 };

  // Get all target roles
  const targetRoles = rules.map((r) => r.role);

  // Find all active users with matching roles
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: targetRoles },
      isActive: true,
    },
    select: { id: true },
  });

  if (users.length === 0) return { created: 0 };

  // Batch create notifications for all matching users
  const notifications = await prisma.notification.createMany({
    data: users.map((user) => ({
      tenantId,
      userId: user.id,
      title,
      message,
      type: eventType,
      severity,
      sourceId,
      metadata,
    })),
  });

  return { created: notifications.count };
}

/** Severity mapping for compliance event types (since the model doesn't store severity) */
export function getViolationSeverity(type: string): string {
  const severityMap: Record<string, string> = {
    CASH_THRESHOLD_EXCEEDED: "CRITICAL",
    SELFIE_FAIL: "HIGH",
    GPS_OFF: "HIGH",
    OUT_OF_ZONE: "HIGH",
    ZONE_MISMATCH: "HIGH",
    SHIFT_NOT_BOOKED: "HIGH",
    LATE_CLOCK_IN: "MEDIUM",
    EARLY_CLOCK_OUT: "MEDIUM",
    ORDER_CLICK_THROUGH: "MEDIUM",
    EQUIPMENT_MISSING: "MEDIUM",
  };
  return severityMap[type] || "MEDIUM";
}
