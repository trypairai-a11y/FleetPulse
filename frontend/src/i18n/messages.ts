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
    operationCentre: string;
    courierDetails: string;
    shiftMonitor: string;
    availableShifts: string;
    incentives: string;
    billings: string;
    taxInvoices: string;
    payments: string;
    reports: string;
    attendanceShifts: string;
    ingestReview: string;
    financial: string;
  };
  status: {
    active: string;
    inactive: string;
    present: string;
    late: string;
    absent: string;
    pending: string;
    suspended: string;
    terminated: string;
    online: string;
    offline: string;
    settled: string;
    approved: string;
    rejected: string;
    completed: string;
    cancelled: string;
  };
  language: {
    english: string;
    arabic: string;
    switchTo: string;
  };
  errors: {
    somethingWrong: string;
    notFound: string;
    noData: string;
    loadingData: string;
    sessionExpired: string;
    permissionDenied: string;
    serverError: string;
    noResults: string;
    unexpectedError: string;
  };
  table: {
    name: string;
    phone: string;
    status: string;
    platform: string;
    zone: string;
    date: string;
    time: string;
    driver: string;
    company: string;
    vehicle: string;
    deliveries: string;
    cashKd: string;
    hours: string;
    orders: string;
    violations: string;
    penalties: string;
    attendance: string;
    id: string;
    reason: string;
    taskId: string;
    courierId: string;
    vehicleType: string;
    settlementMode: string;
    violationTime: string;
    appealStatus: string;
    channel: string;
    penaltyType: string;
    penaltyStatus: string;
    penaltyValue: string;
    createdAt: string;
    action: string;
    content: string;
    operator: string;
    operationTime: string;
  };
  labels: {
    total: string;
    suspended: string;
    terminated: string;
    online: string;
    offline: string;
    settled: string;
    approved: string;
    rejected: string;
    completed: string;
    cancelled: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    from: string;
    to: string;
    all: string;
    none: string;
    yes: string;
    no: string;
    description: string;
    details: string;
    summary: string;
    timeline: string;
    history: string;
    profile: string;
    current: string;
    area: string;
    shift: string;
    onlineHours: string;
    completedOrders: string;
    cancelledOrders: string;
    activeOrder: string;
    lastGpsUpdate: string;
    courierInfo: string;
    violationInfo: string;
    penaltyInfo: string;
    appealInfo: string;
    operationRecord: string;
  };
  actions: {
    addDriver: string;
    export: string;
    importData: string;
    upload: string;
    filter: string;
    clearFilters: string;
    apply: string;
    confirm: string;
    edit: string;
    viewDetails: string;
    markAllRead: string;
    tryAgain: string;
    goHome: string;
    previous: string;
    next: string;
    showAll: string;
    showLess: string;
    close: string;
    download: string;
    print: string;
    assign: string;
    unassign: string;
    approve: string;
    reject: string;
    submit: string;
    raiseAppeal: string;
    reviewAppeal: string;
  };
  notifications: {
    important: string;
    opsTodo: string;
    benefits: string;
    other: string;
    markAllRead: string;
    noNotifications: string;
    unreadCount: string;
    gpsAlert: string;
    gpsAlertBody: string;
  };
  violationTypes: {
    latePickup: string;
    orderRejection: string;
    dropOffAdvance: string;
    orderSlightlyLate: string;
    orderVeryLate: string;
    invalidPhoto: string;
    gpsNotUploading: string;
  };
  violationStatuses: {
    established: string;
    underReview: string;
    overturned: string;
    expired: string;
  };
  appealStatuses: {
    notRaised: string;
    pending: string;
    approved: string;
    rejected: string;
  };
  monitor: {
    totalCouriers: string;
    working: string;
    idle: string;
    offline: string;
    scheduledNotOnline: string;
    gpsFailures: string;
    orderRejections: string;
    byCourier: string;
    byOrder: string;
    flightMode: string;
    flightModeDesc: string;
    lastSeen: string;
    noActiveCouriers: string;
  };
  orderFlow: {
    customerPlacedOrder: string;
    customerPaid: string;
    merchantAccepted: string;
    merchantPlaced: string;
    courierAccepted: string;
    courierArrivedMerchant: string;
    courierPickedUp: string;
    courierArrivedCustomer: string;
    orderDelivered: string;
    orderCancelled: string;
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
    operationCentre: "Operation Centre",
    courierDetails: "Courier Details",
    shiftMonitor: "Shift Monitor",
    availableShifts: "Available Shifts",
    incentives: "Incentives",
    billings: "Billings",
    taxInvoices: "Tax Invoices",
    payments: "Payments",
    reports: "Reports",
    attendanceShifts: "Attendance & Shifts",
    ingestReview: "Shift intake",
    financial: "Financial",
  },
  status: {
    active: "Active",
    inactive: "Inactive",
    present: "Present",
    late: "Late",
    absent: "Absent",
    pending: "Pending",
    suspended: "Suspended",
    terminated: "Terminated",
    online: "Online",
    offline: "Offline",
    settled: "Settled",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  language: {
    english: "English",
    arabic: "العربية",
    switchTo: "Switch language",
  },
  errors: {
    somethingWrong: "Something went wrong",
    notFound: "Not found",
    noData: "No data",
    loadingData: "Loading...",
    sessionExpired: "Session expired. Please log in again.",
    permissionDenied: "You don't have permission",
    serverError: "Server error. Please try again.",
    noResults: "No results found",
    unexpectedError: "An unexpected error occurred. Please try again.",
  },
  table: {
    name: "Name",
    phone: "Phone",
    status: "Status",
    platform: "Platform",
    zone: "Zone",
    date: "Date",
    time: "Time",
    driver: "Driver",
    company: "Company",
    vehicle: "Vehicle",
    deliveries: "Deliveries",
    cashKd: "Cash (KD)",
    hours: "Hours",
    orders: "Orders",
    violations: "Violations",
    penalties: "Penalties",
    attendance: "Attendance",
    id: "ID",
    reason: "Reason",
    taskId: "Task ID",
    courierId: "Courier ID",
    vehicleType: "Vehicle Type",
    settlementMode: "Settlement Mode",
    violationTime: "Violation Time",
    appealStatus: "Appeal Status",
    channel: "Channel",
    penaltyType: "Penalty Type",
    penaltyStatus: "Penalty Status",
    penaltyValue: "Penalty Value",
    createdAt: "Created At",
    action: "Action",
    content: "Content",
    operator: "Operator",
    operationTime: "Operation Time",
  },
  labels: {
    total: "Total",
    suspended: "Suspended",
    terminated: "Terminated",
    online: "Online",
    offline: "Offline",
    settled: "Settled",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
    today: "Today",
    thisWeek: "This Week",
    thisMonth: "This Month",
    from: "From",
    to: "To",
    all: "All",
    none: "None",
    yes: "Yes",
    no: "No",
    description: "Description",
    details: "Details",
    summary: "Summary",
    timeline: "Timeline",
    history: "History",
    profile: "Profile",
    current: "Current",
    area: "Area",
    shift: "Shift",
    onlineHours: "Online Hours",
    completedOrders: "Completed Orders",
    cancelledOrders: "Cancelled Orders",
    activeOrder: "Active Order",
    lastGpsUpdate: "Last GPS Update",
    courierInfo: "Courier Info",
    violationInfo: "Violation Info",
    penaltyInfo: "Penalty Info",
    appealInfo: "Appeal Info",
    operationRecord: "Operation Record",
  },
  actions: {
    addDriver: "Add Driver",
    export: "Export",
    importData: "Import",
    upload: "Upload",
    filter: "Filter",
    clearFilters: "Clear Filters",
    apply: "Apply",
    confirm: "Confirm",
    edit: "Edit",
    viewDetails: "View Details",
    markAllRead: "Mark all read",
    tryAgain: "Try again",
    goHome: "Go home",
    previous: "Previous",
    next: "Next",
    showAll: "Show All",
    showLess: "Show Less",
    close: "Close",
    download: "Download",
    print: "Print",
    assign: "Assign",
    unassign: "Unassign",
    approve: "Approve",
    reject: "Reject",
    submit: "Submit",
    raiseAppeal: "Raise Appeal",
    reviewAppeal: "Review Appeal",
  },
  notifications: {
    important: "Important",
    opsTodo: "Ops to-do",
    benefits: "Benefits & Campaigns",
    other: "Other",
    markAllRead: "Mark all read",
    noNotifications: "No notifications",
    unreadCount: "unread",
    gpsAlert: "Not uploading GPS notification",
    gpsAlertBody: "The system detects that your rider has not uploaded the GPS location for a long time.",
  },
  violationTypes: {
    latePickup: "Late Pickup",
    orderRejection: "Order Rejection",
    dropOffAdvance: "Drop-off in Advance",
    orderSlightlyLate: "Slightly Late",
    orderVeryLate: "Very Late",
    invalidPhoto: "Invalid Photo",
    gpsNotUploading: "GPS Not Uploading",
  },
  violationStatuses: {
    established: "Established",
    underReview: "Under Review",
    overturned: "Overturned",
    expired: "Expired",
  },
  appealStatuses: {
    notRaised: "Not Raised",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  },
  monitor: {
    totalCouriers: "Total Couriers",
    working: "Working",
    idle: "Idle",
    offline: "Offline",
    scheduledNotOnline: "Scheduled Not Online",
    gpsFailures: "GPS Upload Failures",
    orderRejections: "Order Rejections",
    byCourier: "By Courier",
    byOrder: "By Order",
    flightMode: "Flight Mode",
    flightModeDesc: "Online but no GPS update in 10+ minutes",
    lastSeen: "Last Seen",
    noActiveCouriers: "No active couriers",
  },
  orderFlow: {
    customerPlacedOrder: "Customer placed order",
    customerPaid: "Customer made payment",
    merchantAccepted: "Merchant accepted order",
    merchantPlaced: "Merchant placed order",
    courierAccepted: "Courier accepted order",
    courierArrivedMerchant: "Courier arrived at merchant",
    courierPickedUp: "Courier picked up",
    courierArrivedCustomer: "Courier arrived at customer",
    orderDelivered: "Order delivered",
    orderCancelled: "Order cancelled",
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
    operationCentre: "مركز العمليات",
    courierDetails: "تفاصيل السائقين",
    shiftMonitor: "مراقبة المناوبات",
    availableShifts: "المناوبات المتاحة",
    incentives: "الحوافز",
    billings: "الفواتير",
    taxInvoices: "الفواتير الضريبية",
    payments: "المدفوعات",
    reports: "التقارير",
    attendanceShifts: "الحضور والمناوبات",
    ingestReview: "استلام المناوبات",
    financial: "المالية",
  },
  status: {
    active: "نشط",
    inactive: "غير نشط",
    present: "حاضر",
    late: "متأخر",
    absent: "غائب",
    pending: "معلّق",
    suspended: "موقوف",
    terminated: "منهي",
    online: "متصل",
    offline: "غير متصل",
    settled: "تمت التسوية",
    approved: "موافق عليه",
    rejected: "مرفوض",
    completed: "مكتمل",
    cancelled: "ملغي",
  },
  language: {
    english: "English",
    arabic: "العربية",
    switchTo: "تغيير اللغة",
  },
  errors: {
    somethingWrong: "حدث خطأ ما",
    notFound: "غير موجود",
    noData: "لا توجد بيانات",
    loadingData: "جاري التحميل...",
    sessionExpired: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
    permissionDenied: "ليس لديك صلاحية",
    serverError: "خطأ في الخادم. يرجى المحاولة لاحقاً.",
    noResults: "لم يتم العثور على نتائج",
    unexpectedError: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
  },
  table: {
    name: "الاسم",
    phone: "الهاتف",
    status: "الحالة",
    platform: "المنصة",
    zone: "المنطقة",
    date: "التاريخ",
    time: "الوقت",
    driver: "السائق",
    company: "الشركة",
    vehicle: "المركبة",
    deliveries: "التوصيلات",
    cashKd: "نقد (د.ك)",
    hours: "ساعات",
    orders: "الطلبات",
    violations: "المخالفات",
    penalties: "العقوبات",
    attendance: "الحضور",
    id: "المعرّف",
    reason: "السبب",
    taskId: "معرّف المهمة",
    courierId: "معرّف المندوب",
    vehicleType: "نوع المركبة",
    settlementMode: "نوع التسوية",
    violationTime: "وقت المخالفة",
    appealStatus: "حالة الاعتراض",
    channel: "القناة",
    penaltyType: "نوع العقوبة",
    penaltyStatus: "حالة العقوبة",
    penaltyValue: "قيمة العقوبة",
    createdAt: "تاريخ الإنشاء",
    action: "الإجراء",
    content: "المحتوى",
    operator: "المشغّل",
    operationTime: "وقت العملية",
  },
  labels: {
    total: "الإجمالي",
    suspended: "موقوف",
    terminated: "منهي",
    online: "متصل",
    offline: "غير متصل",
    settled: "تمت التسوية",
    approved: "موافق عليه",
    rejected: "مرفوض",
    completed: "مكتمل",
    cancelled: "ملغي",
    today: "اليوم",
    thisWeek: "هذا الأسبوع",
    thisMonth: "هذا الشهر",
    from: "من",
    to: "إلى",
    all: "الكل",
    none: "لا شيء",
    yes: "نعم",
    no: "لا",
    description: "الوصف",
    details: "التفاصيل",
    summary: "الملخص",
    timeline: "الجدول الزمني",
    history: "السجل",
    profile: "الملف الشخصي",
    current: "الحالي",
    area: "المنطقة",
    shift: "المناوبة",
    onlineHours: "ساعات الاتصال",
    completedOrders: "الطلبات المكتملة",
    cancelledOrders: "الطلبات الملغاة",
    activeOrder: "الطلب النشط",
    lastGpsUpdate: "آخر تحديث GPS",
    courierInfo: "معلومات المندوب",
    violationInfo: "معلومات المخالفة",
    penaltyInfo: "معلومات العقوبة",
    appealInfo: "معلومات الاعتراض",
    operationRecord: "سجل العمليات",
  },
  actions: {
    addDriver: "إضافة سائق",
    export: "تصدير",
    importData: "استيراد",
    upload: "رفع",
    filter: "تصفية",
    clearFilters: "مسح التصفية",
    apply: "تطبيق",
    confirm: "تأكيد",
    edit: "تعديل",
    viewDetails: "عرض التفاصيل",
    markAllRead: "تعيين الكل كمقروء",
    tryAgain: "حاول مرة أخرى",
    goHome: "الصفحة الرئيسية",
    previous: "السابق",
    next: "التالي",
    showAll: "عرض الكل",
    showLess: "عرض أقل",
    close: "إغلاق",
    download: "تحميل",
    print: "طباعة",
    assign: "تعيين",
    unassign: "إلغاء التعيين",
    approve: "موافقة",
    reject: "رفض",
    submit: "إرسال",
    raiseAppeal: "تقديم اعتراض",
    reviewAppeal: "مراجعة الاعتراض",
  },
  notifications: {
    important: "مهم",
    opsTodo: "مهام العمليات",
    benefits: "المزايا والحملات",
    other: "أخرى",
    markAllRead: "تعيين الكل كمقروء",
    noNotifications: "لا توجد إشعارات",
    unreadCount: "غير مقروء",
    gpsAlert: "إشعار عدم تحميل GPS",
    gpsAlertBody: "اكتشف النظام أن المندوب لم يحمّل موقع GPS منذ فترة طويلة.",
  },
  violationTypes: {
    latePickup: "تأخر الاستلام",
    orderRejection: "رفض الطلب",
    dropOffAdvance: "تسليم مبكر",
    orderSlightlyLate: "تأخير طفيف",
    orderVeryLate: "تأخير شديد",
    invalidPhoto: "صورة غير صالحة",
    gpsNotUploading: "عدم تحميل GPS",
  },
  violationStatuses: {
    established: "مثبت",
    underReview: "قيد المراجعة",
    overturned: "ملغي",
    expired: "منتهي",
  },
  appealStatuses: {
    notRaised: "لم يُقدم",
    pending: "معلّق",
    approved: "موافق عليه",
    rejected: "مرفوض",
  },
  monitor: {
    totalCouriers: "إجمالي المندوبين",
    working: "يعمل",
    idle: "خامل",
    offline: "غير متصل",
    scheduledNotOnline: "مجدول ولم يتصل",
    gpsFailures: "أعطال تحميل GPS",
    orderRejections: "رفض الطلبات",
    byCourier: "حسب المندوب",
    byOrder: "حسب الطلب",
    flightMode: "وضع الطيران",
    flightModeDesc: "متصل لكن بدون تحديث GPS لأكثر من 10 دقائق",
    lastSeen: "آخر ظهور",
    noActiveCouriers: "لا يوجد مندوبون نشطون",
  },
  orderFlow: {
    customerPlacedOrder: "العميل قدّم الطلب",
    customerPaid: "العميل أتم الدفع",
    merchantAccepted: "المتجر قبل الطلب",
    merchantPlaced: "المتجر جهّز الطلب",
    courierAccepted: "المندوب قبل الطلب",
    courierArrivedMerchant: "المندوب وصل المتجر",
    courierPickedUp: "المندوب استلم الطلب",
    courierArrivedCustomer: "المندوب وصل العميل",
    orderDelivered: "تم التوصيل",
    orderCancelled: "تم إلغاء الطلب",
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, ar };

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}
