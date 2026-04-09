"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, X, AlertTriangle, AlertCircle, Info, Flame } from "lucide-react";
import api from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  CRITICAL: { icon: Flame, color: "text-red-600", bg: "bg-red-50" },
  HIGH: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
  MEDIUM: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-50" },
  LOW: { icon: Info, color: "text-blue-400", bg: "bg-blue-50" },
};

const TYPE_LABELS: Record<string, string> = {
  GPS_OFF: "GPS Off",
  OUT_OF_ZONE: "Out of Zone",
  ZONE_MISMATCH: "Zone Mismatch",
  CASH_THRESHOLD_EXCEEDED: "Cash Threshold",
  SELFIE_FAIL: "Selfie Fail",
  EQUIPMENT_MISSING: "Equipment Missing",
  SHIFT_NOT_BOOKED: "Shift Not Booked",
  LATE_CLOCK_IN: "Late Clock In",
  EARLY_CLOCK_OUT: "Early Clock Out",
  ORDER_CLICK_THROUGH: "Order Click Through",
  cash_overdue: "Cash Overdue",
  shift_not_booked: "Shift Reminder",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/notifications?limit=30");
      setNotifications(data.notifications);
    } catch {}
    setLoading(false);
  }, []);

  // Use SSE for real-time unread count updates (replaces 15s polling)
  useEffect(() => {
    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const connectSSE = () => {
      // Get token from axios defaults for SSE auth
      const token = (api.defaults.headers.common["Authorization"] as string)?.replace("Bearer ", "");
      if (!token) return;

      try {
        es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/notifications/stream?token=${token}`);

        es.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "unread_count") {
              setUnreadCount(payload.count);
            } else if (payload.type === "notifications" && Array.isArray(payload.items)) {
              // Prepend new notifications to the list
              setNotifications((prev) => {
                const existingIds = new Set(prev.map((n) => n.id));
                const newItems = payload.items.filter((n: Notification) => !existingIds.has(n.id));
                return [...newItems, ...prev].slice(0, 50);
              });
              setUnreadCount((c) => c + payload.items.filter((n: Notification) => !n.read).length);
            }
          } catch {}
        };

        es.onerror = () => {
          es?.close();
          es = null;
          // Fallback to polling if SSE fails
          if (!fallbackInterval) {
            api.get("/api/notifications/unread-count")
              .then(({ data }) => setUnreadCount(data.count))
              .catch(() => {});
            fallbackInterval = setInterval(() => {
              api.get("/api/notifications/unread-count")
                .then(({ data }) => setUnreadCount(data.count))
                .catch(() => {});
            }, 30000);
          }
        };
      } catch {
        // SSE not available — use fallback polling
        fallbackInterval = setInterval(() => {
          api.get("/api/notifications/unread-count")
            .then(({ data }) => setUnreadCount(data.count))
            .catch(() => {});
        }, 30000);
      }
    };

    // Small delay to allow auth to settle
    const timeout = setTimeout(connectSSE, 1000);

    return () => {
      clearTimeout(timeout);
      es?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    await api.put(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.put("/api/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-gray-50 text-secondary transition-colors"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-50 text-secondary"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-secondary text-sm">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-secondary">
                <Bell size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.MEDIUM;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      !n.read ? "bg-primary/[0.03]" : ""
                    }`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${config.bg}`}>
                      <Icon size={14} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                          {TYPE_LABELS[n.type] || n.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-secondary ml-auto flex-shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
