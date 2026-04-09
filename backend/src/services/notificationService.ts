import { prisma } from "../config";

/**
 * Dispatch a notification via WhatsApp.
 * Stub implementation — wire to your WhatsApp Business API here.
 */
async function sendWhatsApp(phone: string, message: string): Promise<void> {
  // TODO: integrate with WhatsApp Business API (e.g. Twilio, 360dialog, Meta WABA)
  console.warn(`[WhatsApp] Notification to ${phone}: ${message}`);
}

/**
 * Dispatch a notification via email.
 * Stub implementation — wire to your email provider here.
 */
async function sendEmail(email: string, subject: string, body: string): Promise<void> {
  // TODO: integrate with email provider (e.g. SendGrid, SES, Nodemailer)
  console.warn(`[Email] Notification to ${email} — Subject: ${subject}: ${body}`);
}

/**
 * Dispatch a notification via SMS.
 * Stub implementation — wire to your SMS provider here.
 */
async function sendSms(phone: string, message: string): Promise<void> {
  // TODO: integrate with SMS provider (e.g. Twilio, Nexmo)
  console.warn(`[SMS] Notification to ${phone}: ${message}`);
}

/**
 * Create notifications for all users matching the notification rules
 * for a given violation type within a tenant.
 * Supports in-app, WhatsApp, email, and SMS channels.
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
    where: { tenantId, eventType, enabled: true },
  });

  if (rules.length === 0) return { created: 0 };

  // Load platform settings to determine enabled channels
  const platformSettings = await prisma.platformSettings.findFirst({ where: { tenantId } });
  const notifConfig = (platformSettings?.notificationConfig as any) || {};
  const channels = notifConfig.channels || { inApp: true, whatsapp: false, sms: false, email: false };

  const targetRoles = rules.map((r) => r.role);

  const users = await prisma.user.findMany({
    where: { tenantId, role: { in: targetRoles }, isActive: true },
    select: { id: true, email: true, phone: true },
  });

  if (users.length === 0) return { created: 0 };

  // In-app notifications (always created if inApp is enabled)
  let inAppCount = 0;
  if (channels.inApp !== false) {
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
    inAppCount = notifications.count;
  }

  // External channels — dispatch asynchronously, don't block response
  for (const user of users) {
    if (channels.whatsapp && user.phone) {
      sendWhatsApp(user.phone, `[${title}] ${message}`).catch((e) =>
        console.error(`[WhatsApp] Failed for user ${user.id}:`, e)
      );
    }
    if (channels.email && user.email) {
      sendEmail(user.email, title, message).catch((e) =>
        console.error(`[Email] Failed for user ${user.id}:`, e)
      );
    }
    if (channels.sms && user.phone) {
      sendSms(user.phone, `${title}: ${message}`).catch((e) =>
        console.error(`[SMS] Failed for user ${user.id}:`, e)
      );
    }
  }

  return { created: inAppCount };
}

/** Severity mapping for violation event types */
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
