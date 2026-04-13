export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";

export interface Messages {
  common: {
    global: string;
    platforms: string;
    system: string;
    loading: string;
    retry: string;
    refresh: string;
    cancel: string;
    save: string;
    delete: string;
    search: string;
  };
  nav: {
    overview: string;
    companies: string;
    kpis: string;
    analytics: string;
    insights: string;
    liveMap: string;
    tickets: string;
    recruitment: string;
    supervisors: string;
    settings: string;
    drivers: string;
    shifts: string;
    orders: string;
    cash: string;
    violations: string;
    performance: string;
    ordersCash: string;
    monitor: string;
    penalties: string;
  };
  status: {
    active: string;
    inactive: string;
    present: string;
    late: string;
    absent: string;
    pending: string;
  };
  language: {
    english: string;
    arabic: string;
    switchTo: string;
  };
}

export const en: Messages = {
  common: {
    global: "Global",
    platforms: "Platforms",
    system: "System",
    loading: "Loading…",
    retry: "Retry",
    refresh: "Refresh",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    search: "Search",
  },
  nav: {
    overview: "Overview",
    companies: "Companies",
    kpis: "KPIs",
    analytics: "Analytics",
    insights: "Insights",
    liveMap: "Live Map",
    tickets: "Tickets",
    recruitment: "Recruitment",
    supervisors: "Supervisors",
    settings: "Settings",
    drivers: "Drivers",
    shifts: "Shifts",
    orders: "Orders",
    cash: "Cash",
    violations: "Violations",
    performance: "Performance",
    ordersCash: "Orders & Cash",
    monitor: "Monitor",
    penalties: "Penalties",
  },
  status: {
    active: "Active",
    inactive: "Inactive",
    present: "Present",
    late: "Late",
    absent: "Absent",
    pending: "Pending",
  },
  language: {
    english: "English",
    arabic: "العربية",
    switchTo: "Switch language",
  },
};

export const ar: Messages = {
  common: {
    global: "عام",
    platforms: "المنصات",
    system: "النظام",
    loading: "جار التحميل…",
    retry: "إعادة المحاولة",
    refresh: "تحديث",
    cancel: "إلغاء",
    save: "حفظ",
    delete: "حذف",
    search: "بحث",
  },
  nav: {
    overview: "نظرة عامة",
    companies: "الشركات",
    kpis: "مؤشرات الأداء",
    analytics: "التحليلات",
    insights: "الرؤى",
    liveMap: "الخريطة المباشرة",
    tickets: "التذاكر",
    recruitment: "التوظيف",
    supervisors: "المشرفون",
    settings: "الإعدادات",
    drivers: "السائقون",
    shifts: "المناوبات",
    orders: "الطلبات",
    cash: "النقد",
    violations: "المخالفات",
    performance: "الأداء",
    ordersCash: "الطلبات والنقد",
    monitor: "المراقبة",
    penalties: "العقوبات",
  },
  status: {
    active: "نشط",
    inactive: "غير نشط",
    present: "حاضر",
    late: "متأخر",
    absent: "غائب",
    pending: "معلّق",
  },
  language: {
    english: "English",
    arabic: "العربية",
    switchTo: "تغيير اللغة",
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, ar };

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}
