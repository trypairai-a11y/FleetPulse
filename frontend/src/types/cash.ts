export interface CashRecord {
  id: string;
  tenant_id: string;
  driver_id: string;
  date: string;
  record_type: string;
  amount: number;
  receipt_url: string | null;
  deposit_location: string | null;
  reference_number: string | null;
  status: string;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface CashRecordCreate {
  driver_id: string;
  date: string;
  record_type: string;
  amount: number;
  receipt_url?: string;
  deposit_location?: string;
  reference_number?: string;
  notes?: string;
}

export interface CashRecordUpdate {
  status?: string;
  notes?: string;
}

export interface CashFilters {
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  record_type?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface CashSummary {
  collected: number;
  deposited: number;
  outstanding: number;
  verified: number;
}

export interface OutstandingDriver {
  driver_id: string;
  driver_name: string;
  amount: number;
  oldest_date: string;
}
