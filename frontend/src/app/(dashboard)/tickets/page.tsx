"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import StatCard from "@/components/shared/StatCard";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { cn } from "@/lib/cn";
import { Ticket, AlertTriangle, Clock, CheckCircle, Plus, X } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatDateTime } from "@/i18n/format";

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-gray-400",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-600",
  ASSIGNED: "bg-purple-50 text-purple-600",
  IN_PROGRESS: "bg-yellow-50 text-yellow-700",
  RESOLVED: "bg-green-50 text-green-600",
  CLOSED: "bg-gray-100 text-gray-500",
};

export default function TicketsPage() {
  const { t, locale } = useI18n();
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const params = new URLSearchParams({ limit: "50" });
  if (statusFilter) params.set("status", statusFilter);
  if (priorityFilter) params.set("priority", priorityFilter);

  const { data: ticketsData, refetch } = useApiGet<any>(`/api/tickets?${params}`);
  const tickets = ticketsData?.data || [];

  const openCount = tickets.filter((tk: any) => ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(tk.status)).length;
  const overdueCount = tickets.filter((tk: any) => tk.slaDeadline && new Date(tk.slaDeadline) < new Date() && tk.status !== "RESOLVED" && tk.status !== "CLOSED").length;
  const resolvedWeek = tickets.filter((tk: any) => tk.status === "RESOLVED").length;

  const statusLabel = (s: string) => {
    switch (s) {
      case "OPEN": return t("tickets.statusOpen");
      case "ASSIGNED": return t("tickets.statusAssigned");
      case "IN_PROGRESS": return t("tickets.statusInProgress");
      case "RESOLVED": return t("tickets.statusResolved");
      case "CLOSED": return t("tickets.statusClosed");
      default: return s;
    }
  };
  const priorityLabel = (p: string) => {
    switch (p) {
      case "URGENT": return t("tickets.priorityUrgent");
      case "HIGH": return t("tickets.priorityHigh");
      case "MEDIUM": return t("tickets.priorityMedium");
      case "LOW": return t("tickets.priorityLow");
      default: return p;
    }
  };
  const categoryLabel = (c: string) => {
    switch (c) {
      case "VEHICLE_REPAIR": return t("tickets.catVehicleRepair");
      case "EQUIPMENT_REQUEST": return t("tickets.catEquipmentRequest");
      case "LEAVE_REQUEST": return t("tickets.catLeaveRequest");
      case "COMPLAINT": return t("tickets.catComplaint");
      case "OTHER": return t("tickets.catOther");
      default: return c;
    }
  };

  const [newTicket, setNewTicket] = useState({
    category: "OTHER",
    priority: "MEDIUM",
    title: "",
    description: "",
    submitterType: "USER",
  });

  const handleCreateTicket = async () => {
    try {
      await api.post("/api/tickets", newTicket);
      setShowNewModal(false);
      setNewTicket({ category: "OTHER", priority: "MEDIUM", title: "", description: "", submitterType: "USER" });
      refetch();
    } catch (err) {
      console.error("Failed to create ticket", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("tickets.title")}</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> {t("tickets.newTicket")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title={t("tickets.openTickets")} value={openCount} icon={Ticket} />
        <StatCard title={t("tickets.overdue")} value={overdueCount} icon={AlertTriangle} highlight={overdueCount > 0} />
        <StatCard title={t("tickets.avgResolution")} value="-" icon={Clock} />
        <StatCard title={t("tickets.resolvedThisWeek")} value={resolvedWeek} icon={CheckCircle} />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">{t("companies.allStatuses")}</option>
          {["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">{t("tickets.allPriorities")}</option>
          {["URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <option key={p} value={p}>{priorityLabel(p)}</option>
          ))}
        </select>
      </div>

      {/* Ticket List */}
      <div className="space-y-2">
        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <p className="text-sm text-secondary">{t("tickets.noTicketsFound")}</p>
          </div>
        ) : (
          tickets.map((ticket: any) => {
            const overdue = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-4"
              >
                <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", PRIORITY_DOT[ticket.priority])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-secondary font-mono">{ticket.ticketNumber}</span>
                    <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-medium", STATUS_BADGE[ticket.status])}>
                      {statusLabel(ticket.status)}
                    </span>
                    {ticket.platform && <PlatformBadge platform={ticket.platform} />}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="text-xs text-secondary">{ticket.assignedTo?.name || t("tickets.unassigned")}</p>
                  {ticket.slaDeadline && (
                    <p className={cn("text-[11px] mt-0.5", overdue ? "text-red-500 font-medium" : "text-secondary")}>
                      {overdue ? t("tickets.overdueLabel") : `${t("tickets.sla")}: ${formatDate(ticket.slaDeadline, locale)}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t("tickets.newTicket")}</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1 hover:bg-gray-50 rounded-lg" aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">{t("tickets.category")}</label>
                  <select value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {["VEHICLE_REPAIR", "EQUIPMENT_REQUEST", "LEAVE_REQUEST", "COMPLAINT", "OTHER"].map((c) => (
                      <option key={c} value={c}>{categoryLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">{t("tickets.priority")}</label>
                  <select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                      <option key={p} value={p}>{priorityLabel(p)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">{t("tickets.titleField")}</label>
                <input value={newTicket.title} onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} dir="auto"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={t("tickets.titlePlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">{t("tickets.description")}</label>
                <textarea value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} dir="auto"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  placeholder={t("tickets.descriptionPlaceholder")} />
              </div>
              <button onClick={handleCreateTicket}
                className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
                {t("tickets.createTicket")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Panel */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs text-secondary font-mono">{selectedTicket.ticketNumber}</span>
                <h2 className="text-lg font-semibold mt-1">{selectedTicket.title}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-1 hover:bg-gray-50 rounded-lg" aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", STATUS_BADGE[selectedTicket.status])}>
                  {statusLabel(selectedTicket.status)}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                  {categoryLabel(selectedTicket.category)}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                  {priorityLabel(selectedTicket.priority)}
                </span>
              </div>
              <p className="text-sm text-secondary">{selectedTicket.description}</p>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-secondary">{t("tickets.assignedTo")}: {selectedTicket.assignedTo?.name || t("tickets.unassigned")}</p>
                <p className="text-xs text-secondary mt-1">
                  {t("tickets.created")}: {formatDateTime(selectedTicket.createdAt, locale)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
