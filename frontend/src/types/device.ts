export interface Device {
  id: string;
  tenant_id: string;
  device_token: string;
  device_model: string | null;
  os_version: string | null;
  app_version: string | null;
  phone_number: string | null;
  imei: string | null;
  assigned_driver_id: string | null;
  status: string;
  battery_level: number | null;
  last_heartbeat_at: string | null;
  last_location_lat: number | null;
  last_location_lng: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DeviceCreate {
  device_model?: string;
  os_version?: string;
  app_version?: string;
  phone_number?: string;
  imei?: string;
  assigned_driver_id?: string;
}

export interface DeviceUpdate {
  device_model?: string;
  os_version?: string;
  app_version?: string;
  phone_number?: string;
  assigned_driver_id?: string;
  status?: string;
  config?: Record<string, unknown>;
}

export interface DeviceFilters {
  status?: string;
  driver_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface DeviceCommand {
  id: string;
  device_id: string;
  command_type: string;
  payload: Record<string, unknown>;
  status: string;
  result: Record<string, unknown> | null;
  issued_at: string;
  completed_at: string | null;
}

export interface DeviceCommandCreate {
  device_id: string;
  command_type: string;
  payload?: Record<string, unknown>;
}

export interface BulkCommandRequest {
  device_ids: string[];
  command_type: string;
  payload?: Record<string, unknown>;
}
