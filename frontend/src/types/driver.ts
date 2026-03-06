export interface DriverInventory {
  [key: string]: { given: boolean; quantity?: number };
}

export interface Driver {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  name: string;
  name_ar: string | null;
  phone: string;
  email: string | null;
  status: string;
  hire_date: string | null;
  nationality: string | null;
  license_number: string | null;
  license_expiry: string | null;
  license_group: string | null;
  platform: string | null;
  company: string | null;
  vehicle_type: string | null;
  current_vehicle_id: string | null;
  device_id: string | null;
  score_rate: number | null;
  daily_target: number | null;
  inventory: DriverInventory | null;
  notes: string | null;
  photo_url: string | null;
  is_active: boolean;
  has_shift_today: boolean | null;
  today_shift_status: string | null;
  today_shift_start: string | null;
  today_shift_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverCreate {
  employee_id?: string;
  name: string;
  name_ar?: string;
  phone: string;
  email?: string;
  status?: string;
  hire_date?: string;
  nationality?: string;
  license_number?: string;
  license_expiry?: string;
  license_group?: string;
  platform?: string;
  company?: string;
  vehicle_type?: string;
  current_vehicle_id?: string;
  score_rate?: number;
  daily_target?: number;
  inventory?: DriverInventory;
  notes?: string;
}

export interface DriverUpdate extends Partial<DriverCreate> {
  device_id?: string;
}

export interface DriverFilters {
  status?: string;
  platform?: string;
  company?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface DriverStatsResponse {
  order_count: number;
  revenue: number;
  attendance_rate: number;
  outstanding_cash: number;
}

export interface DriverLeaderboardEntry {
  driver_id: string;
  driver_name: string;
  driver_name_ar: string | null;
  platform: string | null;
  order_count: number;
  total_revenue: number;
  total_hours: number;
  utr: number;
  composite_score: number | null;
  trend: string | null;
  attendance_rate: number | null;
  outstanding_cash: number;
}

export interface LeaderboardParams {
  limit?: number;
  sort_by?: "orders" | "revenue" | "score" | "utr";
  direction?: "top" | "bottom";
  date_from?: string;
  date_to?: string;
  company?: string;
  platform?: string;
}

export interface DriverSummary {
  total: number;
  by_status: Record<string, number>;
  by_platform: Record<string, number>;
  by_company: Record<string, number>;
}

export interface DriverDailyPoint {
  date: string;
  orders: number;
  revenue: number;
  attendance: string | null;
  late_minutes: number;
  cash_collected: number;
  cash_deposited: number;
}

export interface DriverAnalyticsResponse {
  date_from: string;
  date_to: string;
  total_orders: number;
  total_revenue: number;
  attendance_present: number;
  attendance_late: number;
  attendance_absent: number;
  attendance_rate: number;
  avg_late_minutes: number;
  total_shifts: number;
  completed_shifts: number;
  total_cash_collected: number;
  total_cash_deposited: number;
  outstanding_cash: number;
  tickets_opened: number;
  tickets_resolved: number;
  daily: DriverDailyPoint[];
}

export interface DriverImportResponse {
  created: number;
  errors: string[];
}
