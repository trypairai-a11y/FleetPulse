export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  driver_id: string;
  shift_id: string | null;
  date: string;
  status: string;
  scheduled_start: string | null;
  actual_start: string | null;
  late_minutes: number;
  source: string;
  selfie_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  created_at: string;
}

export interface AttendanceCreate {
  driver_id: string;
  shift_id?: string;
  date: string;
  status: string;
  scheduled_start?: string;
  actual_start?: string;
  late_minutes?: number;
  source?: string;
  notes?: string;
}

export interface AttendanceUpdate {
  status?: string;
  actual_start?: string;
  late_minutes?: number;
  notes?: string;
}

export interface AttendanceFilters {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface AttendanceSummary {
  date: string;
  summary: Record<string, number>;
  attendance_rate: number;
  avg_late_minutes: number;
}
