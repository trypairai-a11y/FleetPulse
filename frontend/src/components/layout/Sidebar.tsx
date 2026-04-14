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
  LayoutDashboard, Map, Ticket, Users, Settings,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeft,
  ClipboardList, DollarSign, Briefcase,
  ShieldAlert, BarChart3, Target, Gauge, Building2, Lightbulb,
  Activity, AlertTriangle, Ban, Map as MapIcon, Calendar, Trophy, Wallet, PieChart,
} from "lucide-react";

// Platform names stay as brand strings; sub-page labels translate via i18n keys.
const PLATFORMS = [
  {
    name: "Talabat",
    key: "talabat",
    color: "text-talabat",
    bg: "bg-talabat/10",
    subPages: [
      { i18n: "nav.overview", path: "/talabat/overview", icon: Gauge },
      { i18n: "nav.drivers", path: "/talabat/drivers", icon: Users },
      { i18n: "nav.shifts", path: "/talabat/shifts", icon: ClipboardList },
      { i18n: "nav.orders", path: "/talabat/orders", icon: Briefcase },
      { i18n: "nav.cash", path: "/talabat/cash", icon: DollarSign },
      { i18n: "nav.violations", path: "/talabat/violations", icon: ShieldAlert },
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
      { i18n: "nav.operationCentre", path: "/keeta/operation-centre", icon: MapIcon },
      { i18n: "nav.drivers", path: "/keeta/drivers", icon: Users },
      { i18n: "nav.courierDetails", path: "/keeta/courier-details", icon: Calendar },
      { i18n: "nav.shifts", path: "/keeta/shifts", icon: ClipboardList },
      { i18n: "nav.shiftMonitor", path: "/keeta/shift-monitor", icon: Activity },
      { i18n: "nav.orders", path: "/keeta/orders", icon: Briefcase },
      { i18n: "nav.performance", path: "/keeta/performance", icon: BarChart3 },
      { i18n: "nav.monitor", path: "/keeta/monitor", icon: Activity },
      { i18n: "nav.violations", path: "/keeta/violations", icon: AlertTriangle },
      { i18n: "nav.penalties", path: "/keeta/penalties", icon: Ban },
      { i18n: "nav.incentives", path: "/keeta/incentives", icon: Trophy },
      { i18n: "nav.billings", path: "/keeta/financial/billings", icon: DollarSign },
      { i18n: "nav.taxInvoices", path: "/keeta/financial/tax-invoices", icon: Ticket },
      { i18n: "nav.payments", path: "/keeta/financial/payments", icon: Wallet },
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
      { i18n: "nav.shifts", path: "/deliveroo/shifts", icon: ClipboardList },
      { i18n: "nav.ordersCash", path: "/deliveroo/orders-cash", icon: Briefcase },
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
      { i18n: "nav.shifts", path: "/americana/shifts", icon: ClipboardList },
      { i18n: "nav.orders", path: "/americana/orders", icon: Briefcase },
      { i18n: "nav.performance", path: "/americana/performance", icon: BarChart3 },
      { i18n: "nav.settings", path: "/americana/settings", icon: Settings },
    ],
  },
] as const;

const GLOBAL_NAV = [
  { i18n: "nav.overview", path: "/", icon: LayoutDashboard },
  { i18n: "nav.companies", path: "/companies", icon: Building2 },
  { i18n: "nav.kpis", path: "/kpis", icon: Target },
  { i18n: "nav.analytics", path: "/analytics", icon: BarChart3 },
  { i18n: "nav.insights", path: "/insights", icon: Lightbulb },
  { i18n: "nav.liveMap", path: "/map", icon: Map },
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
        "fixed top-0 h-screen bg-white z-40 flex flex-col transition-all duration-200",
        dir === "rtl" ? "right-0 border-l border-gray-100" : "left-0 border-r border-gray-100",
        !open
          ? dir === "rtl" ? "translate-x-full w-60" : "-translate-x-full w-60"
          : collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + Collapse */}
      <div className={cn("h-16 flex items-center border-b border-gray-50", collapsed ? "justify-center px-2" : "px-5 justify-between")}>
        {!collapsed ? (
          <Image src="/logo.png" alt="Darb" width={120} height={40} className="object-contain" priority />
        ) : (
          <Image src="/logo.png" alt="Darb" width={28} height={28} className="object-contain" priority />
        )}
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg text-secondary hover:bg-gray-50 hover:text-foreground transition-colors"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {/* Global */}
        {!collapsed && (
          <div className="px-3 mb-2 text-[11px] font-medium text-secondary uppercase tracking-wider">
            {t("common.global")}
          </div>
        )}
        {GLOBAL_NAV.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-0.5",
              isActive(item.path)
                ? "bg-primary/8 text-primary"
                : "text-gray-600 hover:bg-gray-50 hover:text-foreground"
            )}
          >
            <item.icon size={18} />
            {!collapsed && <span>{t(item.i18n)}</span>}
          </Link>
        ))}

        {/* Platforms */}
        <div className={cn("mt-6", !collapsed && "px-3 mb-2")}>
          {!collapsed && (
            <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-2">
              {t("common.platforms")}
            </div>
          )}
        </div>
        {PLATFORMS.map((platform) => (
          <div key={platform.key} className="mb-1">
            <button
              onClick={() => togglePlatform(platform.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                pathname.startsWith(`/${platform.key}`)
                  ? `${platform.bg} ${platform.color}`
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", {
                "bg-keeta": platform.key === "keeta",
                "bg-talabat": platform.key === "talabat",
                "bg-deliveroo": platform.key === "deliveroo",
                "bg-americana": platform.key === "americana",
              })} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{platform.name}</span>
                  {expanded[platform.key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </>
              )}
            </button>
            {!collapsed && expanded[platform.key] && (
              <div className="ms-5 mt-0.5 space-y-0.5">
                {platform.subPages
                  .filter((sub) => sub.i18n !== "nav.settings" || canManageSettings)
                  .map((sub) => (
                    <Link
                      key={sub.path}
                      href={sub.path}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-200",
                        isActive(sub.path)
                          ? `${platform.bg} ${platform.color} font-medium`
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
              <div className="px-3 mb-2 text-[11px] font-medium text-secondary uppercase tracking-wider">
                {t("common.system")}
              </div>
            )}
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                isActive("/settings")
                  ? "bg-primary/8 text-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-foreground"
              )}
            >
              <Settings size={18} aria-hidden="true" />
              {!collapsed && <span>{t("nav.settings")}</span>}
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-gray-50 p-2">
        <LanguageSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}
