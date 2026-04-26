"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSidebar } from "@/contexts/SidebarContext";
import { useRole } from "@/hooks/useRole";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  LayoutDashboard, Ticket, Users, Settings,
  ChevronDown, PanelLeftClose, PanelLeft,
  ClipboardList, DollarSign, Briefcase,
  ShieldAlert, BarChart3, Target, Gauge, Building2, Lightbulb,
  Activity, AlertTriangle, Ban, Calendar, Trophy, Wallet, PieChart, Compass, Sparkles,
} from "lucide-react";
import { DirectionalIcon } from "@/i18n/directionalIcon";

// Platform names stay as brand strings; sub-page labels translate via i18n keys.
// R11 · Simplified per PRD:
//   - Talabat drops Phones, Vehicles, Available-shifts, Sessions (now under Driver 360 / Shifts).
//   - Keeta drops Phones, Vehicles, Penalties, Copilot, Courier-details, Shift-monitor, Available-shifts.
//   - Deliveroo drops Phones, Vehicles (now under Driver 360 / Assets) and the Schedule redirector page (folded into Attendance).
const PLATFORMS = [
  {
    name: "Talabat",
    key: "talabat",
    color: "text-talabat",
    bg: "bg-talabat/10",
    subPages: [
      { i18n: "nav.overview", path: "/talabat/overview", icon: Gauge },
      { i18n: "nav.drivers", path: "/talabat/drivers", icon: Users },
      { i18n: "nav.attendanceShifts", path: "/talabat/attendance", icon: Calendar },
      { i18n: "nav.orders", path: "/talabat/orders", icon: Briefcase },
      { i18n: "nav.cash", path: "/talabat/cash", icon: DollarSign },
      { i18n: "nav.violations", path: "/talabat/violations", icon: ShieldAlert },
      { i18n: "nav.performance", path: "/talabat/performance", icon: BarChart3 },
      { i18n: "nav.ingestReview", path: "/talabat/ingest-review", icon: ClipboardList },
      { i18n: "nav.settings", path: "/talabat/settings", icon: Settings },
    ],
  },
  {
    name: "Keeta",
    key: "keeta",
    color: "text-keeta",
    bg: "bg-keeta/10",
    subPages: [
      { i18n: "nav.overview", path: "/keeta/overview", icon: Gauge },
      { i18n: "nav.monitor", path: "/keeta/monitor", icon: Activity },
      { i18n: "nav.drivers", path: "/keeta/drivers", icon: Users },
      { i18n: "nav.attendanceShifts", path: "/keeta/attendance", icon: Calendar },
      { i18n: "nav.orders", path: "/keeta/orders", icon: Briefcase },
      { i18n: "nav.financial", path: "/keeta/financial/billings", icon: Wallet },
      { i18n: "nav.violations", path: "/keeta/violations", icon: AlertTriangle },
      { i18n: "nav.performance", path: "/keeta/performance", icon: BarChart3 },
      { i18n: "nav.operationCentre", path: "/keeta/operation-centre", icon: Compass },
      { i18n: "nav.reports", path: "/keeta/reports", icon: PieChart },
      { i18n: "nav.settings", path: "/keeta/settings", icon: Settings },
    ],
  },
  {
    name: "Deliveroo",
    key: "deliveroo",
    color: "text-deliveroo",
    bg: "bg-deliveroo/10",
    subPages: [
      { i18n: "nav.overview", path: "/deliveroo/overview", icon: Gauge },
      { i18n: "nav.drivers", path: "/deliveroo/drivers", icon: Users },
      { i18n: "nav.attendanceShifts", path: "/deliveroo/attendance", icon: Calendar },
      { i18n: "nav.orders", path: "/deliveroo/orders", icon: Briefcase },
      { i18n: "nav.cash", path: "/deliveroo/cash", icon: Wallet },
      { i18n: "nav.violations", path: "/deliveroo/violations", icon: ShieldAlert },
      { i18n: "nav.ingestReview", path: "/deliveroo/ingest-review", icon: ClipboardList },
      { i18n: "nav.settings", path: "/deliveroo/settings", icon: Settings },
    ],
  },
  {
    name: "Americana",
    key: "americana",
    color: "text-americana",
    bg: "bg-americana/10",
    subPages: [
      { i18n: "nav.overview", path: "/americana/overview", icon: Gauge },
      { i18n: "nav.drivers", path: "/americana/drivers", icon: Users },
      { i18n: "nav.orders", path: "/americana/orders", icon: Briefcase },
      { i18n: "nav.violations", path: "/americana/violations", icon: ShieldAlert },
      { i18n: "nav.settings", path: "/americana/settings", icon: Settings },
    ],
  },
] as const;

const GLOBAL_NAV = [
  { i18n: "nav.overview", path: "/overview", icon: LayoutDashboard },
  { i18n: "nav.darbAi", path: "/copilot", icon: Sparkles },
  { i18n: "nav.companies", path: "/companies", icon: Building2 },
  { i18n: "nav.kpis", path: "/kpis", icon: Target },
  { i18n: "nav.analytics", path: "/analytics", icon: BarChart3 },
  { i18n: "nav.insights", path: "/insights", icon: Lightbulb },
  { i18n: "nav.tickets", path: "/tickets", icon: Ticket },
  { i18n: "nav.recruitment", path: "/recruitment", icon: Users },
  { i18n: "nav.supervisors", path: "/supervisors", icon: Users },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, open, setOpen } = useSidebar();
  const { canManageSettings } = useRole();
  const { t, dir } = useI18n();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const togglePlatform = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "fixed top-0 h-screen bg-forest-900 text-white/85 z-40 flex flex-col transition-all duration-250 ease-sierra-out",
        dir === "rtl" ? "right-0 border-l border-white/5" : "left-0 border-r border-white/5",
        !open
          ? dir === "rtl" ? "translate-x-full w-60" : "-translate-x-full w-60"
          : collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + Collapse */}
      <div className={cn("h-16 flex items-center border-b border-white/5", collapsed ? "justify-center px-2" : "px-5 justify-between")}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">D</div>
            <span className="font-medium tracking-tight text-white">Darb</span>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">D</div>
        )}
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {/* Global */}
        {!collapsed && (
          <div className="px-3 mb-2 text-[11px] font-medium text-white/40 uppercase tracking-[0.18em]">
            {t("common.global")}
          </div>
        )}
        {GLOBAL_NAV.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-pill text-sm font-medium transition-all duration-250 ease-sierra-out mb-0.5",
              isActive(item.path)
                ? "bg-primary text-white shadow-soft"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={18} />
            {!collapsed && <span>{t(item.i18n)}</span>}
          </Link>
        ))}

        {/* Platforms */}
        <div className={cn("mt-6", !collapsed && "px-3 mb-2")}>
          {!collapsed && (
            <div className="text-[11px] font-medium text-white/40 uppercase tracking-[0.18em] mb-2">
              {t("common.platforms")}
            </div>
          )}
        </div>
        {PLATFORMS.map((platform) => (
          <div key={platform.key} className="mb-1">
            <button
              onClick={() => togglePlatform(platform.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-pill text-sm font-medium transition-all duration-250 ease-sierra-out",
                pathname.startsWith(`/${platform.key}`)
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", {
                "bg-keeta": platform.key === "keeta",
                "bg-talabat": platform.key === "talabat",
                "bg-deliveroo": platform.key === "deliveroo",
                "bg-americana": platform.key === "americana",
              })} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-start">{platform.name}</span>
                  {expanded[platform.key] ? <ChevronDown size={14} /> : <DirectionalIcon kind="chevron-forward" size={14} />}
                </>
              )}
            </button>
            {!collapsed && expanded[platform.key] && (
              <div className="ms-5 mt-0.5 space-y-0.5 animate-fade-in">
                {platform.subPages
                  .filter((sub) => sub.i18n !== "nav.settings" || canManageSettings)
                  .map((sub) => (
                    <Link
                      key={sub.path}
                      href={sub.path}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-250 ease-sierra-out",
                        isActive(sub.path)
                          ? "bg-white/10 text-white font-medium"
                          : "text-white/55 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <sub.icon size={14} aria-hidden="true" />
                      <span>{t(sub.i18n)}</span>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ))}

        {/* System — only visible to OPS_MANAGER and above */}
        {canManageSettings && (
          <div className="mt-6">
            {!collapsed && (
              <div className="px-3 mb-2 text-[11px] font-medium text-white/40 uppercase tracking-[0.18em]">
                {t("common.system")}
              </div>
            )}
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-pill text-sm font-medium transition-all duration-250 ease-sierra-out",
                isActive("/settings")
                  ? "bg-primary text-white shadow-soft"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Settings size={18} aria-hidden="true" />
              {!collapsed && <span>{t("nav.settings")}</span>}
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-white/5 p-2">
        <LanguageSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}
