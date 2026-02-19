export interface Ticket {
  id: string;
  tenant_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  driver_id: string | null;
  vehicle_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  data: Record<string, unknown>;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  title: string;
  title_ar?: string;
  description?: string;
  category: string;
  priority?: string;
  driver_id?: string;
  vehicle_id?: string;
  assigned_to?: string;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  assigned_to?: string;
}

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  driver_id?: string;
  assigned_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string | null;
  content: string;
  attachments: string[];
  created_at: string;
}

export interface TicketCommentCreate {
  content: string;
  attachments?: string[];
}

export interface TicketStats {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  avg_resolution_hours: number;
}
