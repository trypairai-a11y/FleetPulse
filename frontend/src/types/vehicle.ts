export interface Vehicle {
  id: string;
  tenant_id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  vin: string | null;
  vehicle_type: string;
  ownership: string;
  rental_company: string | null;
  current_mileage: number | null;
  fuel_type: string | null;
  status: string;
  assigned_driver_id: string | null;
  insurance_expiry: string | null;
  registration_expiry: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreate {
  plate_number: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  vehicle_type?: string;
  ownership?: string;
  rental_company?: string;
  current_mileage?: number;
  fuel_type?: string;
  assigned_driver_id?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  notes?: string;
}

export interface VehicleUpdate extends Partial<VehicleCreate> {
  status?: string;
}

export interface VehicleFilters {
  status?: string;
  vehicle_type?: string;
  ownership?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface MaintenanceRecord {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id: string | null;
  date: string;
  category: string;
  type: string;
  description: string | null;
  cost: number | null;
  vendor: string | null;
  mileage_at_service: number | null;
  duration_hours: number | null;
  receipt_url: string | null;
  status: string;
  source: string;
  spare_vehicle_id: string | null;
  mechanic_dispatched: boolean | null;
  police_report_url: string | null;
  medical_report_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface VehicleInspection {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id: string;
  shift_id: string | null;
  inspected_at: string;
  checklist: Record<string, unknown>;
  photos: string[];
  overall_status: string;
  notes: string | null;
  location_lat: number | null;
  location_lng: number | null;
}
