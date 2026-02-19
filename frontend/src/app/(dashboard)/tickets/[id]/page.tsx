"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import {
  ArrowLeft,
  Send,
  UserCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useTicket,
  useTicketComments,
  useResolveTicket,
  useCloseTicket,
  useAssignTicket,
  useAddComment,
} from "@/hooks/useTickets";
import {
  TICKET_STATUS_CONFIG,
  TICKET_PRIORITY_CONFIG,
  TICKET_CATEGORIES,
} from "@/lib/constants";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useUIStore();
  const isAr = language === "ar";

  const { data: ticket, isLoading: ticketLoading } = useTicket(id);
  const { data: comments, isLoading: commentsLoading } = useTicketComments(id);

  const resolveTicket = useResolveTicket();
  const closeTicket = useCloseTicket();
  const assignTicket = useAssignTicket();
  const addComment = useAddComment();

  const [commentText, setCommentText] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ ticketId: id, content: commentText.trim() });
    setCommentText("");
  };

  const handleResolve = async () => {
    await resolveTicket.mutateAsync(id);
  };

  const handleClose = async () => {
    await closeTicket.mutateAsync(id);
  };

  const handleAssign = async () => {
    if (!assignUserId.trim()) return;
    await assignTicket.mutateAsync({ ticketId: id, userId: assignUserId.trim() });
    setAssignOpen(false);
    setAssignUserId("");
  };

  if (ticketLoading) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-[1400px] space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/tickets")}
          className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isAr ? "العودة للتذاكر" : "Back to Tickets"}
        </Button>
        <div className="bg-white rounded-lg border border-[#E6E9EE] p-12 text-center">
          <p className="text-[14px] font-semibold text-[#0C1825]">
            {isAr ? "التذكرة غير موجودة" : "Ticket not found"}
          </p>
        </div>
      </div>
    );
  }

  const categoryLabel = (() => {
    const cat = TICKET_CATEGORIES.find((c) => c.value === ticket.category);
    return cat
      ? isAr
        ? cat.labelAr
        : cat.labelEn
      : ticket.category.replace(/_/g, " ");
  })();

  return (
    <div className="max-w-[1400px] space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/tickets")}
        className="h-8 px-2 text-[12px] text-[#6B7A8D] gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {isAr ? "العودة للتذاكر" : "Back to Tickets"}
      </Button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[18px] font-bold text-[#0C1825] mb-1.5">
              {ticket.title}
            </h1>
            {ticket.title_ar && (
              <p className="text-[13px] text-[#9CA3AF] mb-2">{ticket.title_ar}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                status={ticket.status}
                config={TICKET_STATUS_CONFIG}
                language={language}
              />
              <StatusBadge
                status={ticket.priority}
                config={TICKET_PRIORITY_CONFIG}
                language={language}
              />
              <span className="text-[11px] text-[#6B7A8D] px-1.5 py-0.5 rounded bg-[#F0F2F5] capitalize">
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {(ticket.status === "open") && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAssignOpen(true)}
                  className="h-8 px-3 text-[12px] border-[#E6E9EE] text-[#6B7A8D] gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {isAr ? "إسناد" : "Assign"}
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={resolveTicket.isPending}
                  className="h-8 px-3 text-[12px] bg-[#12B981] hover:bg-[#0ea572] text-white gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {resolveTicket.isPending
                    ? isAr ? "جاري..." : "..."
                    : isAr ? "حل" : "Resolve"}
                </Button>
              </>
            )}
            {ticket.status === "in_progress" && (
              <>
                <Button
                  onClick={handleResolve}
                  disabled={resolveTicket.isPending}
                  className="h-8 px-3 text-[12px] bg-[#12B981] hover:bg-[#0ea572] text-white gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {resolveTicket.isPending
                    ? isAr ? "جاري..." : "..."
                    : isAr ? "حل" : "Resolve"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={closeTicket.isPending}
                  className="h-8 px-3 text-[12px] border-[#E6E9EE] text-[#6B7A8D] gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {closeTicket.isPending
                    ? isAr ? "جاري..." : "..."
                    : isAr ? "إغلاق" : "Close"}
                </Button>
              </>
            )}
            {ticket.status === "resolved" && (
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={closeTicket.isPending}
                className="h-8 px-3 text-[12px] border-[#E6E9EE] text-[#6B7A8D] gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                {closeTicket.isPending
                  ? isAr ? "جاري..." : "..."
                  : isAr ? "إغلاق" : "Close"}
              </Button>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="border-t border-[#F0F2F5] pt-4">
          {ticket.description && (
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A8D] mb-1">
                {isAr ? "الوصف" : "Description"}
              </h3>
              <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "السائق" : "Driver"}
              </span>
              <span className="text-[12px] text-[#374151] font-mono">
                {ticket.driver_id || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "المركبة" : "Vehicle"}
              </span>
              <span className="text-[12px] text-[#374151] font-mono">
                {ticket.vehicle_id || "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "تاريخ الإنشاء" : "Created"}
              </span>
              <span className="text-[12px] text-[#374151]">
                {formatDateTime(ticket.created_at, language)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9CA3AF] block mb-0.5">
                {isAr ? "تاريخ الحل" : "Resolved At"}
              </span>
              <span className="text-[12px] text-[#374151]">
                {ticket.resolved_at ? formatDateTime(ticket.resolved_at, language) : "\u2014"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg border border-[#E6E9EE] p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-[#6B7A8D]" />
          <h2 className="text-[14px] font-semibold text-[#0C1825]">
            {isAr ? "التعليقات" : "Comments"}
          </h2>
          {comments && (
            <span className="text-[11px] text-[#9CA3AF]">
              ({comments.length})
            </span>
          )}
        </div>

        {/* Comments Timeline */}
        {commentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-3 mb-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="border border-[#F0F2F5] rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-[#6B7A8D]">
                    {comment.user_id || (isAr ? "نظام" : "System")}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 mb-4">
            <p className="text-[12px] text-[#9CA3AF]">
              {isAr ? "لا توجد تعليقات بعد" : "No comments yet"}
            </p>
          </div>
        )}

        {/* Add Comment Form */}
        <div className="border-t border-[#F0F2F5] pt-4">
          <div className="flex gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isAr ? "اكتب تعليقًا..." : "Write a comment..."}
              className="text-[12px] border-[#E6E9EE] min-h-[60px] flex-1"
            />
            <Button
              onClick={handleAddComment}
              disabled={!commentText.trim() || addComment.isPending}
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5 self-end"
            >
              {addComment.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isAr ? "إرسال" : "Send"}
            </Button>
          </div>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[16px]">
              {isAr ? "إسناد التذكرة" : "Assign Ticket"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {isAr
                ? "أدخل معرف المستخدم لإسناد هذه التذكرة"
                : "Enter a user ID to assign this ticket to"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Input
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              placeholder={isAr ? "معرف المستخدم" : "User ID"}
              className="h-8 text-[12px] border-[#E6E9EE]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              className="h-8 px-3 text-[12px]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assignUserId.trim() || assignTicket.isPending}
              className="h-8 px-3 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {assignTicket.isPending
                ? isAr ? "جاري..." : "Assigning..."
                : isAr ? "إسناد" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
