export interface CapturedOrder {
  id: string;
  tenant_id: string;
  driver_id: string;
  device_id: string | null;
  platform: string;
  order_ref: string | null;
  status: string;
  parsed_data: Record<string, unknown> | null;
  amount: number | null;
  captured_at: string;
}

export interface OrderFilters {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  platform?: string;
  page?: number;
  per_page?: number;
}

export interface OrderSummary {
  date: string;
  total: number;
  by_platform: Record<string, number>;
  total_amount: number;
  by_platform_amount: Record<string, number>;
  top_drivers: { driver_id: string; driver_name: string; count: number }[];
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}
