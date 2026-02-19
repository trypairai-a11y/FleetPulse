import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "./useQueryHelpers";
import type { PaginatedResponse } from "@/types/api";
import type { Ticket, TicketCreate, TicketUpdate, TicketFilters, TicketComment, TicketCommentCreate, TicketStats } from "@/types/ticket";

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tickets.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.per_page) params.per_page = String(filters.per_page);
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.driver_id) params.driver_id = filters.driver_id;
      if (filters.assigned_to) params.assigned_to = filters.assigned_to;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get<PaginatedResponse<Ticket>>("/api/tickets", { params });
      return data;
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Ticket>(`/api/tickets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: queryKeys.tickets.stats(),
    queryFn: async () => {
      const { data } = await api.get<TicketStats>("/api/tickets/stats");
      return data;
    },
  });
}

export function useTicketComments(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.tickets.comments(ticketId),
    queryFn: async () => {
      const { data } = await api.get<TicketComment[]>(`/api/tickets/${ticketId}/comments`);
      return data;
    },
    enabled: !!ticketId,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TicketCreate) => {
      const { data } = await api.post<Ticket>("/api/tickets", body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tickets.all }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: TicketUpdate & { id: string }) => {
      const { data } = await api.put<Ticket>(`/api/tickets/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tickets.all }),
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { data } = await api.put<Ticket>(`/api/tickets/${ticketId}/assign`, null, {
        params: { user_id: userId },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tickets.all }),
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data } = await api.put<Ticket>(`/api/tickets/${ticketId}/resolve`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tickets.all }),
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data } = await api.put<Ticket>(`/api/tickets/${ticketId}/close`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tickets.all }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, ...body }: TicketCommentCreate & { ticketId: string }) => {
      const { data } = await api.post<TicketComment>(`/api/tickets/${ticketId}/comments`, body);
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.tickets.comments(vars.ticketId) }),
  });
}
