// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Core Entities ──────────────────────────────────────────────────────────

export type Platform = "TALABAT" | "KEETA" | "DELIVEROO" | "AMERICANA";

export type DriverStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "TERMINATED"
  | "LEAVE"
  | "RESTRICTED"
  | "RESTRICTED_PERMANENTLY";

export interface Driver {
  id: string;
  name: string;
  phone: string | null;
  platform: Platform;
  platformDriverId: string | null;
  status: DriverStatus;
  zone: string | null;
  batchNumber: string | null;
  vehicleType: string | null;
  nationality: string | null;
  companyId: string | null;
  company?: { name: string; platform: Platform };
  // Enriched fields
  dailyOrders?: number;
  totalSales?: number | null;
  cashCollected?: number | null;
  cashDeposited?: number | null;
  uti?: number;
  workingHours?: number | null;
  talabatStatus?: string;
}

export interface Company {
  id: string;
  name: string;
  platform: Platform;
  contactPerson?: string | null;
  contactPhone?: string | null;
  _count?: { drivers: number };
}

export interface OrderLog {
  id: string;
  driverId: string;
  platform: Platform;
  date: string;
  orderCount: number;
  orderNumber?: string | null;
  cashCollected?: number | null;
  totalAmount?: number | null;
  tips?: number | null;
  distanceKm?: number | null;
  source?: string;
  driver?: Pick<Driver, "id" | "name" | "platform" | "zone" | "batchNumber"> & {
    company?: { name: string };
  };
}

export interface Violation {
  id: string;
  driverId: string;
  platform: Platform;
  violationType: string;
  violationStatus: string;
  appealStatus: string;
  firstAppealStatus: string;
  secondAppealStatus: string;
  violationTime: string;
  details?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown> | null;
  driver?: Pick<Driver, "id" | "name" | "platformDriverId" | "vehicleType">;
  penalties?: Penalty[];
  appeals?: Appeal[];
}

export interface Penalty {
  id: string;
  driverId: string;
  penaltyType: string;
  penaltyStatus: string;
  penaltyValue?: string | null;
  createdAt: string;
}

export interface Appeal {
  id: string;
  violationId: string;
  appealLevel: number;
  appealStatus: string;
  channel?: string | null;
  reason?: string | null;
  rejectionNote?: string | null;
  appealedAt: string;
  reviewedAt?: string | null;
}

export interface AttendanceRecord {
  id: string;
  driverId: string;
  date: string;
  status: string;
  clockIn?: string | null;
  clockOut?: string | null;
  source?: string | null;
  driver?: Pick<Driver, "id" | "name" | "platform">;
}

export interface CashRecord {
  id: string;
  driverId: string;
  date: string;
  salesAmount: number;
  collectionAmount?: number | null;
  pendingDues?: number | null;
  status: string;
  driver?: Pick<Driver, "id" | "name" | "platform">;
}

export interface TalabatSession {
  id: string;
  driverId: string;
  date: string;
  zone?: string | null;
  status: string;
  plannedHours?: number | null;
  actualHours?: number | null;
  deliveries?: number | null;
  cashCollected?: number | null;
  driver?: Pick<Driver, "id" | "name" | "platform">;
}

export interface LeaveRequest {
  id: string;
  driverId: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  reason?: string | null;
  driver?: Pick<Driver, "id" | "name" | "platform">;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  titleAr?: string | null;
  bodyAr?: string | null;
  category?: string | null;
  severity?: string | null;
  read: boolean;
  createdAt: string;
}

// ─── Summary Responses ──────────────────────────────────────────────────────

export interface DriverSummary {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  docsExpiring: number;
  docsMissing: number;
  avgUtrToday: number;
  totalOrdersToday: number;
}

export interface OrderSummary {
  totalDeliveries: number;
  totalDistanceKm: number;
  totalTipsKd: number;
  totalCashKd: number;
  ordersPerHour: number;
  avgCashPerOrder: number;
  peakHour: number | null;
  topDriverName: string | null;
  topZone: string | null;
  zones: Array<{ zone: string; deliveries: number; cash: number }>;
}
