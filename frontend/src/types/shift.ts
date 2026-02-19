export interface ShiftTemplate {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface ShiftTemplateCreate {
  name: string;
  name_ar?: string;
  start_time: string;
  end_time: string;
}

export interface ShiftTemplateUpdate {
  name?: string;
  name_ar?: string;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}

export interface Shift {
  id: string;
  tenant_id: string;
  driver_id: string;
  template_id: string | null;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  clock_in_method: string | null;
  clock_out_method: string | null;
  clock_in_selfie_url: string | null;
  clock_in_location_lat: number | null;
  clock_in_location_lng: number | null;
  clock_out_location_lat: number | null;
  clock_out_location_lng: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftCreate {
  driver_id: string;
  template_id?: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  notes?: string;
}

export interface ShiftFilters {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface ShiftBulkAssign {
  driver_ids: string[];
  template_id: string;
  dates: string[];
}

export interface ShiftCalendarDay {
  date: string;
  shifts: (Shift & { driver_name?: string })[];
}
