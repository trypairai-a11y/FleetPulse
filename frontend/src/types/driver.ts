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
  current_vehicle_id: string | null;
  device_id: string | null;
  notes: string | null;
  photo_url: string | null;
  is_active: boolean;
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
  current_vehicle_id?: string;
  notes?: string;
}

export interface DriverUpdate extends Partial<DriverCreate> {
  device_id?: string;
}

export interface DriverFilters {
  status?: string;
  platform?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface DriverStatsResponse {
  order_count: number;
  attendance_rate: number;
  outstanding_cash: number;
}

export interface DriverLeaderboardEntry {
  driver_id: string;
  driver_name: string;
  platform: string | null;
  order_count: number;
}

export interface DriverImportResponse {
  created: number;
  errors: string[];
}
