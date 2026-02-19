"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { Plus, Ticket, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTickets, useTicketStats, useCreateTicket } from "@/hooks/useTickets";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import {
  TICKET_STATUS_CONFIG,
  TICKET_PRIORITY_CONFIG,
  TICKET_CATEGORIES,
} from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type { Ticket as TicketType, TicketCreate } from "@/types/ticket";

export default function TicketsPage() {
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDescription, setFormDescription] = useState("");
  const [formDriverId, setFormDriverId] = useState("");

  // Debounced search
  const debouncedSearch = useDebounce(search, 300);

  // Pagination
  const { page, perPage, goToPage, resetPage } = usePagination({
    initialPage: 1,
    initialPerPage: 20,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    resetPage();
  }, [debouncedSearch, statusFilter, categoryFilter, priorityFilter, resetPage]);

  // Fetch tickets
  const { data, isLoading } = useTickets({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    page,
    per_page: perPage,
  });

  // Stats
  const { data: stats } = useTicketStats();

  // Create mutation
  const createTicket = useCreateTicket();

  const tickets = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const openCount = stats?.by_status?.open ?? 0;
  const inProgressCount = stats?.by_status?.in_progress ?? 0;
  const resolvedCount = stats?.by_status?.resolved ?? 0;
  const avgResolution = stats?.avg_resolution_hours ?? 0;

  const handleCreate = async () => {
    if (!formTitle || !formCategory) return;
    const body: TicketCreate = {
      title: formTitle,
      category: formCategory,
      priority: formPriority || "medium",
      description: formDescription || undefined,
      driver_id: formDriverId || undefined,
    };
    await createTicket.mutateAsync(body);
    setCreateOpen(false);
    setFormTitle("");
    setFormCategory("");
    setFormPriority("medium");
    setFormDescription("");
    setFormDriverId("");
  };

  // Filter options
  const statusOptions = Object.keys(TICKET_STATUS_CONFIG).map((s) => ({
    value: s,
    labelEn: TICKET_STATUS_CONFIG[s].labelEn,
    labelAr: TICKET_STATUS_CONFIG[s].labelAr,
  }));

  const categoryOptions = TICKET_CATEGORIES.map((c) => ({
    value: c.value,
    labelEn: c.labelEn,
    labelAr: c.labelAr,
  }));

  const priorityOptions = Object.keys(TICKET_PRIORITY_CONFIG).map((p) => ({
    value: p,
    labelEn: TICKET_PRIORITY_CONFIG[p].labelEn,
    labelAr: TICKET_PRIORITY_CONFIG[p].labelAr,
  }));

  // Table columns
  const columns = [
    {
      key: "title",
      headerEn: "Title",
      headerAr: "العنوان",
      render: (t: TicketType) => (
        <div>
          <div className="text-[13px] font-medium text-[#0C1825] group-hover:text-[#2563EB] transition-colors">
            {t.title}
          </div>
          {t.title_ar && (
            <div className="text-[11px] text-[#9CA3AF]">{t.title_ar}</div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      headerEn: "Category",
      headerAr: "التصنيف",
      render: (t: TicketType) => {
        const cat = TICKET_CATEGORIES.find((c) => c.value === t.category);
        return (
          <span className="text-[12px] text-[#6B7A8D] capitalize">
            {cat ? (isAr ? cat.labelAr : cat.labelEn) : t.category.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "priority",
      headerEn: "Priority",
      headerAr: "الأولوية",
      render: (t: TicketType) => (
        <StatusBadge
          status={t.priority}
          config={TICKET_PRIORITY_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "status",
      headerEn: "Status",
      headerAr: "الحالة",
      render: (t: TicketType) => (
        <StatusBadge
          status={t.status}
          config={TICKET_STATUS_CONFIG}
          language={language}
        />
      ),
    },
    {
      key: "created_at",
      headerEn: "Created",
      headerAr: "تاريخ الإنشاء",
      render: (t: TicketType) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {formatRelativeTime(t.created_at)}
        </span>
      ),
    },
    {
      key: "assigned_to",
      headerEn: "Assigned",
      headerAr: "مسند إلى",
      render: (t: TicketType) => (
        <span className="text-[12px] text-[#6B7A8D]">
          {t.assigned_to || "\u2014"}
        </span>
      ),
    },
  ];

  const noFiltersActive =
    !debouncedSearch &&
    statusFilter === "all" &&
    categoryFilter === "all" &&
    priorityFilter === "all";

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Header */}
      <PageHeader
        titleEn="Tickets"
        titleAr="التذاكر"
        subtitleEn="Manage support requests and follow-ups"
        subtitleAr="إدارة طلبات الدعم والمتابعة"
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-8 px-3 text-[12px] font-medium bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAr ? "تذكرة جديدة" : "New Ticket"}
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label={isAr ? "مفتوحة" : "Open"}
          value={openCount}
          icon={AlertCircle}
          iconColor="#2563EB"
        />
        <StatCard
          label={isAr ? "قيد التنفيذ" : "In Progress"}
          value={inProgressCount}
          icon={Loader2}
          iconColor="#F59E0B"
        />
        <StatCard
          label={isAr ? "تم الحل" : "Resolved"}
          value={resolvedCount}
          icon={CheckCircle2}
          iconColor="#12B981"
        />
        <StatCard
          label={isAr ? "متوسط وقت الحل (ساعات)" : "Avg Resolution (hrs)"}
          value={avgResolution.toFixed(1)}
          icon={Clock}
          iconColor="#8B5CF6"
        />
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholderEn="Search tickets..."
        searchPlaceholderAr="بحث في التذاكر..."
        filters={[
          {
            key: "status",
            placeholderEn: "Status",
            placeholderAr: "الحالة",
            options: statusOptions,
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: "category",
            placeholderEn: "Category",
            placeholderAr: "التصنيف",
            options: categoryOptions,
            value: categoryFilter,
            onChange: setCategoryFilter,
          },
          {
            key: "priority",
            placeholderEn: "Priority",
            placeholderAr: "الأولوية",
            options: priorityOptions,
            value: priorityFilter,
            onChange: setPriorityFilter,
          },
        ]}
      />

      {/* Table or Empty State */}
      {!isLoading && tickets.length === 0 && noFiltersActive ? (
        <EmptyState
          icon={Ticket}
          titleEn="No tickets yet"
          titleAr="لا توجد تذاكر بعد"
          descriptionEn="Create a ticket to track issues and requests."
          descriptionAr="أنشئ تذكرة لتتبع المشاكل والطلبات."
          actionLabelEn="New Ticket"
          actionLabelAr="تذكرة جديدة"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <DataTable<TicketType>
            columns={columns}
            data={tickets}
            loading={isLoading}
            emptyMessage={isAr ? "لا توجد نتائج" : "No tickets found"}
            language={language}
            rowKey={(t) => t.id}
            onRowClick={(t) => router.push(`/tickets/${t.id}`)}
          />
          {total > 0 && (
            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPageChange={goToPage}
            />
          )}
        </>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "تذكرة جديدة" : "New Ticket"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {isAr
                ? "أنشئ تذكرة جديدة لتتبع مشكلة أو طلب"
                : "Create a new ticket to track an issue or request"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#374151]">
                {isAr ? "العنوان" : "Title"}
              </Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={isAr ? "عنوان التذكرة" : "Ticket title"}
                className="h-8 text-[12px] border-[#E6E9EE]"
              />
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#374151]">
                  {isAr ? "التصنيف" : "Category"}
                </Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-8 text-[12px] border-[#E6E9EE]">
                    <SelectValue
                      placeholder={isAr ? "اختر التصنيف" : "Select category"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {isAr ? c.labelAr : c.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#374151]">
                  {isAr ? "الأولوية" : "Priority"}
                </Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="h-8 text-[12px] border-[#E6E9EE]">
                    <SelectValue
                      placeholder={isAr ? "اختر الأولوية" : "Select priority"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_PRIORITY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {isAr ? cfg.labelAr : cfg.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#374151]">
                {isAr ? "الوصف" : "Description"}
              </Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={isAr ? "وصف المشكلة أو الطلب..." : "Describe the issue or request..."}
                className="text-[12px] border-[#E6E9EE] min-h-[80px]"
              />
            </div>

            {/* Driver ID */}
            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#374151]">
                {isAr ? "معرف السائق (اختياري)" : "Driver ID (optional)"}
              </Label>
              <Input
                value={formDriverId}
                onChange={(e) => setFormDriverId(e.target.value)}
                placeholder={isAr ? "معرف السائق" : "Driver ID"}
                className="h-8 text-[12px] border-[#E6E9EE]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="h-8 px-3 text-[12px]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formTitle || !formCategory || createTicket.isPending}
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {createTicket.isPending
                ? isAr
                  ? "جاري الإنشاء..."
                  : "Creating..."
                : isAr
                  ? "إنشاء التذكرة"
                  : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
