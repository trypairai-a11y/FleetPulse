"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSidebar } from "@/contexts/SidebarContext";
import { useRole } from "@/hooks/useRole";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Users,
  CalendarClock,
  Package,
  Siren,
  Wallet,
  LineChart,
  Settings,
  PanelLeftClose,
  Command,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/api";

/**
 * v2 Sidebar — 7 workflow-oriented items. Replaces the 38-item platform-grouped
 * nav in the legacy Sidebar.tsx. Platform becomes a filter pill on each list
 * page rather than a structural axis.
 */

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  minRole?: "ADMIN" | "OPS_MANAGER" | "SUPERVISOR" | "ACCOUNTANT" | "VIEWER";
  liveBadge?: "queue"; // pulls count from /api/queue/counts
}

const NAV: NavItem[] = [
  { label: "Command Centre", path: "/v2", icon: Sparkles },
  { label: "Drivers", path: "/v2/drivers", icon: Users },
  { label: "Dispatch", path: "/v2/dispatch", icon: CalendarClock },
  { label: "Orders", path: "/v2/orders", icon: Package },
  { label: "Triage", path: "/v2/triage", icon: Siren, liveBadge: "queue" },
  { label: "Money", path: "/v2/money", icon: Wallet, minRole: "ACCOUNTANT" },
  { label: "Intelligence", path: "/v2/intelligence", icon: LineChart },
];

const ROLE_VISIBILITY: Record<string, string[]> = {
  ADMIN: NAV.map((n) => n.path),
  OPS_MANAGER: NAV.map((n) => n.path),
  SUPERVISOR: ["/v2", "/v2/drivers", "/v2/dispatch", "/v2/triage"],
  ACCOUNTANT: ["/v2", "/v2/money", "/v2/intelligence", "/v2/triage"],
  VIEWER: ["/v2", "/v2/intelligence"],
};

export default function SidebarV2() {
  const pathname = usePathname();
  const { collapsed, open, setOpen } = useSidebar();
  const { role, canManageSettings } = useRole();
  const [queueCount, setQueueCount] = useState<number | null>(null);

  const visible = new Set(ROLE_VISIBILITY[role] ?? ROLE_VISIBILITY.VIEWER);
  const items = NAV.filter((i) => visible.has(i.path));

  useEffect(() => {
    let mounted = true;
    async function loadCount() {
      try {
        const { data } = await api.get("/api/queue/counts");
        if (mounted) setQueueCount(data.pending ?? 0);
      } catch {
        if (mounted) setQueueCount(null);
      }
    }
    loadCount();
    const t = setInterval(loadCount, 30_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/v2") return pathname === "/v2";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 flex h-screen flex-col border-r border-gray-100 bg-white transition-all duration-200",
        !open ? "-translate-x-full w-60" : collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-gray-50", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        {!collapsed ? (
          <Image src="/logo.png" alt="Darb" width={120} height={40} className="object-contain" priority />
        ) : (
          <Image src="/logo.png" alt="Darb" width={28} height={28} className="object-contain" priority />
        )}
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-gray-50 hover:text-foreground"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const badge = item.liveBadge === "queue" && queueCount && queueCount > 0 ? queueCount : null;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                active ? "bg-foreground text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} className={active ? "" : "text-gray-400 group-hover:text-foreground"} />
                {!collapsed && <span>{item.label}</span>}
              </span>
              {!collapsed && badge !== null && (
                <span
                  className={cn(
                    "inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active ? "bg-white/20 text-white" : "bg-red-500 text-white"
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Cmd+K hint */}
      {!collapsed && (
        <div className="border-t border-gray-50 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-secondary">
            <Command size={13} />
            <span className="flex-1">Ask Darb</span>
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-500">⌘K</kbd>
          </div>
        </div>
      )}

      {canManageSettings && (
        <div className="border-t border-gray-50 px-2 py-3">
          <Link
            href="/v2/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
              isActive("/v2/settings") ? "bg-foreground text-white" : "text-gray-600 hover:bg-gray-50 hover:text-foreground"
            )}
          >
            <Settings size={18} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}
