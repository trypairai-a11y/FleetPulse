export const PLATFORMS = ["talabat", "keeta", "deliveroo", "jahez"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const DRIVER_STATUSES = ["active", "inactive", "on_leave", "suspended", "terminated"] as const;
export const VEHICLE_TYPES = ["car", "motorcycle"] as const;
export const OWNERSHIP_TYPES = ["company", "rented"] as const;
export const ROLES = ["admin", "supervisor", "maintenance", "viewer"] as const;

export const SIDEBAR_ITEMS = [
  { key: "home", labelAr: "الرئيسية", labelEn: "Home", href: "/", icon: "Home" },
  { key: "map", labelAr: "الخريطة الحية", labelEn: "Live Map", href: "/map", icon: "Map" },
  { key: "drivers", labelAr: "السائقين", labelEn: "Drivers", href: "/drivers", icon: "Users" },
  { key: "orders", labelAr: "الطلبات", labelEn: "Orders", href: "/orders", icon: "Package" },
  { key: "attendance", labelAr: "الحضور", labelEn: "Attendance", href: "/attendance", icon: "ClipboardCheck" },
  { key: "shifts", labelAr: "الشفتات", labelEn: "Shifts", href: "/shifts", icon: "Clock" },
  { key: "vehicles", labelAr: "المركبات", labelEn: "Vehicles", href: "/vehicles", icon: "Car" },
  { key: "cash", labelAr: "النقدية", labelEn: "Cash", href: "/cash", icon: "Banknote" },
  { key: "tickets", labelAr: "التذاكر", labelEn: "Tickets", href: "/tickets", icon: "Ticket" },
  { key: "devices", labelAr: "الأجهزة", labelEn: "Devices", href: "/devices", icon: "Smartphone" },
  { key: "ai", labelAr: "الذكاء الاصطناعي", labelEn: "AI Insights", href: "/ai", icon: "Brain" },
  { key: "reports", labelAr: "التقارير", labelEn: "Reports", href: "/reports", icon: "FileText" },
  { key: "settings", labelAr: "الإعدادات", labelEn: "Settings", href: "/settings", icon: "Settings" },
] as const;

// Platform colors
export const PLATFORM_COLORS: Record<string, { bg: string; text: string; color: string }> = {
  talabat: { bg: "#FF5A000D", text: "#FF5A00", color: "#FF5A00" },
  keeta: { bg: "#FFD5000D", text: "#B89700", color: "#FFD500" },
  deliveroo: { bg: "#00CCBC0D", text: "#00CCBC", color: "#00CCBC" },
  jahez: { bg: "#E31B540D", text: "#E31B54", color: "#E31B54" },
};

// Driver status configs
export const DRIVER_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  active: { labelEn: "Active", labelAr: "نشط", color: "#12B981", bg: "#12B9810D" },
  inactive: { labelEn: "Inactive", labelAr: "غير نشط", color: "#6B7A8D", bg: "#6B7A8D0D" },
  on_leave: { labelEn: "On Leave", labelAr: "في إجازة", color: "#F59E0B", bg: "#F59E0B0D" },
  suspended: { labelEn: "Suspended", labelAr: "موقوف", color: "#E5484D", bg: "#E5484D0D" },
  terminated: { labelEn: "Terminated", labelAr: "منتهي", color: "#6B7A8D", bg: "#6B7A8D0D" },
};

// Attendance status configs
export const ATTENDANCE_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  present: { labelEn: "Present", labelAr: "حاضر", color: "#12B981", bg: "#12B9810D" },
  late: { labelEn: "Late", labelAr: "متأخر", color: "#F59E0B", bg: "#F59E0B0D" },
  absent: { labelEn: "Absent", labelAr: "غائب", color: "#E5484D", bg: "#E5484D0D" },
  excused: { labelEn: "Excused", labelAr: "معذور", color: "#2563EB", bg: "#2563EB0D" },
  day_off: { labelEn: "Day Off", labelAr: "يوم إجازة", color: "#6B7A8D", bg: "#6B7A8D0D" },
};

// Shift status configs
export const SHIFT_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  scheduled: { labelEn: "Scheduled", labelAr: "مجدول", color: "#2563EB", bg: "#2563EB0D" },
  in_progress: { labelEn: "In Progress", labelAr: "جاري", color: "#12B981", bg: "#12B9810D" },
  completed: { labelEn: "Completed", labelAr: "مكتمل", color: "#6B7A8D", bg: "#6B7A8D0D" },
  cancelled: { labelEn: "Cancelled", labelAr: "ملغي", color: "#E5484D", bg: "#E5484D0D" },
  no_show: { labelEn: "No Show", labelAr: "لم يحضر", color: "#F59E0B", bg: "#F59E0B0D" },
};

// Vehicle status configs
export const VEHICLE_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  active: { labelEn: "Active", labelAr: "نشط", color: "#12B981", bg: "#12B9810D" },
  in_maintenance: { labelEn: "In Maintenance", labelAr: "في الصيانة", color: "#F59E0B", bg: "#F59E0B0D" },
  decommissioned: { labelEn: "Decommissioned", labelAr: "خارج الخدمة", color: "#6B7A8D", bg: "#6B7A8D0D" },
};

// Ticket status configs
export const TICKET_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  open: { labelEn: "Open", labelAr: "مفتوح", color: "#2563EB", bg: "#2563EB0D" },
  in_progress: { labelEn: "In Progress", labelAr: "قيد التنفيذ", color: "#F59E0B", bg: "#F59E0B0D" },
  approved: { labelEn: "Approved", labelAr: "تمت الموافقة", color: "#12B981", bg: "#12B9810D" },
  scheduled: { labelEn: "Scheduled", labelAr: "مجدول", color: "#8B5CF6", bg: "#8B5CF60D" },
  resolved: { labelEn: "Resolved", labelAr: "تم الحل", color: "#12B981", bg: "#12B9810D" },
  closed: { labelEn: "Closed", labelAr: "مغلق", color: "#6B7A8D", bg: "#6B7A8D0D" },
};

// Ticket priority configs
export const TICKET_PRIORITY_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  low: { labelEn: "Low", labelAr: "منخفض", color: "#6B7A8D", bg: "#6B7A8D0D" },
  medium: { labelEn: "Medium", labelAr: "متوسط", color: "#F59E0B", bg: "#F59E0B0D" },
  high: { labelEn: "High", labelAr: "عالي", color: "#E5484D", bg: "#E5484D0D" },
  urgent: { labelEn: "Urgent", labelAr: "عاجل", color: "#DC2626", bg: "#DC26260D" },
};

// Ticket categories
export const TICKET_CATEGORIES = [
  { value: "vehicle_issue", labelEn: "Vehicle Issue", labelAr: "مشكلة مركبة" },
  { value: "accident", labelEn: "Accident", labelAr: "حادث" },
  { value: "device_issue", labelEn: "Device Issue", labelAr: "مشكلة جهاز" },
  { value: "complaint", labelEn: "Complaint", labelAr: "شكوى" },
  { value: "leave_request", labelEn: "Leave Request", labelAr: "طلب إجازة" },
  { value: "cash_issue", labelEn: "Cash Issue", labelAr: "مشكلة نقدية" },
  { value: "other", labelEn: "Other", labelAr: "أخرى" },
] as const;

// Cash record types
export const CASH_RECORD_TYPES = [
  { value: "collection", labelEn: "Collection", labelAr: "تحصيل" },
  { value: "deposit", labelEn: "Deposit", labelAr: "إيداع" },
  { value: "adjustment", labelEn: "Adjustment", labelAr: "تعديل" },
] as const;

export const CASH_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  pending: { labelEn: "Pending", labelAr: "معلق", color: "#F59E0B", bg: "#F59E0B0D" },
  verified: { labelEn: "Verified", labelAr: "تم التحقق", color: "#12B981", bg: "#12B9810D" },
  disputed: { labelEn: "Disputed", labelAr: "متنازع", color: "#E5484D", bg: "#E5484D0D" },
};

// Device status configs
export const DEVICE_STATUS_CONFIG: Record<string, { labelEn: string; labelAr: string; color: string; bg: string }> = {
  active: { labelEn: "Active", labelAr: "نشط", color: "#12B981", bg: "#12B9810D" },
  inactive: { labelEn: "Inactive", labelAr: "غير نشط", color: "#6B7A8D", bg: "#6B7A8D0D" },
  lost: { labelEn: "Lost", labelAr: "مفقود", color: "#E5484D", bg: "#E5484D0D" },
  decommissioned: { labelEn: "Decommissioned", labelAr: "خارج الخدمة", color: "#6B7A8D", bg: "#6B7A8D0D" },
};

// Device command types
export const DEVICE_COMMAND_TYPES = [
  { value: "lock", labelEn: "Lock", labelAr: "قفل" },
  { value: "wipe", labelEn: "Wipe", labelAr: "مسح" },
  { value: "locate", labelEn: "Locate", labelAr: "تحديد الموقع" },
  { value: "update_config", labelEn: "Update Config", labelAr: "تحديث الإعدادات" },
  { value: "reboot", labelEn: "Reboot", labelAr: "إعادة تشغيل" },
  { value: "ring", labelEn: "Ring", labelAr: "رنين" },
] as const;
