"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Home, Map, Users, Package, ClipboardCheck, Clock, Car,
  Banknote, Ticket, Smartphone, Brain, FileText, Settings,
  ChevronsLeft, ChevronsRight, Zap, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import { useAlertCount } from "@/hooks/useAI";

const iconMap: Record<string, React.ElementType> = {
  Home, Map, Users, Package, ClipboardCheck, Clock, Car,
  Banknote, Ticket, Smartphone, Brain, FileText, Settings,
};

// Group nav items semantically
const NAV_GROUPS = [
  { items: ["home", "map"] },
  { label: "Operations", labelAr: "العمليات", items: ["drivers", "orders", "attendance", "shifts"] },
  { label: "Assets", labelAr: "الأصول", items: ["vehicles", "cash", "tickets", "devices"] },
  { label: "Intelligence", labelAr: "التحليلات", items: ["ai", "reports"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { language, sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const isAr = language === "ar";
  const { data: alertCount } = useAlertCount();
  const activeAlerts = alertCount?.count ?? 0;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  const itemsByKey = Object.fromEntries(SIDEBAR_ITEMS.map((i) => [i.key, i]));

  return (
    <>
    {/* Mobile overlay backdrop */}
    {mobileSidebarOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={() => setMobileSidebarOpen(false)}
      />
    )}
    <aside
      className={cn(
        "fixed top-0 bottom-0 z-50 flex flex-col bg-[#0B1D30] transition-all duration-200 ease-out",
        isAr ? "right-0" : "left-0",
        // Desktop: normal sidebar
        "hidden lg:flex",
        sidebarOpen ? "w-[236px]" : "w-[60px]",
        // Mobile: slide-in overlay
        mobileSidebarOpen && "!flex w-[260px]",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 shrink-0 border-b border-white/[0.06]",
        sidebarOpen || mobileSidebarOpen ? "px-5 gap-2.5" : "justify-center"
      )}>
        <div className="w-7 h-7 bg-[#2563EB] rounded-md flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        {(sidebarOpen || mobileSidebarOpen) && (
          <span className="text-white text-[15px] font-semibold tracking-[-0.01em] flex-1">
            FleetPulse
          </span>
        )}
        {/* Mobile close button */}
        {mobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden w-7 h-7 rounded-md flex items-center justify-center text-[#7B95B0] hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-5")}>
            {/* Group label */}
            {group.label && (sidebarOpen || mobileSidebarOpen) && (
              <div className="px-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4A6580]">
                  {isAr ? group.labelAr : group.label}
                </span>
              </div>
            )}
            {group.label && !sidebarOpen && !mobileSidebarOpen && gi > 0 && (
              <div className="mx-auto my-2 w-5 border-t border-white/[0.06]" />
            )}

            <div className="space-y-0.5">
              {group.items.map((key) => {
                const item = itemsByKey[key];
                if (!item) return null;
                const Icon = iconMap[item.icon];
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center rounded-md text-[13px] font-medium transition-all duration-150",
                      (sidebarOpen || mobileSidebarOpen) ? "gap-2.5 px-2.5 h-8" : "justify-center h-9",
                      isActive
                        ? "bg-[#2563EB]/[0.15] text-white"
                        : "text-[#7B95B0] hover:text-[#C8D8E8] hover:bg-white/[0.04]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0 transition-colors",
                        (sidebarOpen || mobileSidebarOpen) ? "w-[16px] h-[16px]" : "w-[18px] h-[18px]",
                        isActive ? "text-[#5B9BFF]" : "text-[#5A7A96] group-hover:text-[#8AAFC8]"
                      )}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    {(sidebarOpen || mobileSidebarOpen) && (
                      <span className="truncate flex-1">
                        {isAr ? item.labelAr : item.labelEn}
                      </span>
                    )}
                    {/* Alert badge on AI nav item */}
                    {item.key === "ai" && activeAlerts > 0 && (
                      <span className={cn(
                        "flex items-center justify-center rounded-full bg-[#E5484D] text-white font-bold",
                        (sidebarOpen || mobileSidebarOpen) ? "text-[9px] min-w-[16px] h-4 px-1" : "absolute top-0.5 text-[8px] min-w-[14px] h-3.5 px-0.5",
                        isAr ? ((sidebarOpen || mobileSidebarOpen) ? "" : "left-0.5") : ((sidebarOpen || mobileSidebarOpen) ? "" : "right-0.5"),
                      )}>
                        {activeAlerts > 99 ? "99+" : activeAlerts}
                      </span>
                    )}
                    {isActive && (
                      <div className={cn(
                        "absolute w-[3px] h-4 rounded-full bg-[#2563EB]",
                        isAr ? "right-0" : "left-0"
                      )} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings (pinned) */}
      <div className="px-2.5 pb-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center rounded-md text-[13px] font-medium transition-all duration-150",
            (sidebarOpen || mobileSidebarOpen) ? "gap-2.5 px-2.5 h-8" : "justify-center h-9",
            pathname === "/settings"
              ? "bg-[#2563EB]/[0.15] text-white"
              : "text-[#7B95B0] hover:text-[#C8D8E8] hover:bg-white/[0.04]"
          )}
        >
          <Settings className={cn("shrink-0", (sidebarOpen || mobileSidebarOpen) ? "w-4 h-4" : "w-[18px] h-[18px]")} strokeWidth={1.75} />
          {(sidebarOpen || mobileSidebarOpen) && <span>{isAr ? "الإعدادات" : "Settings"}</span>}
        </Link>
      </div>

      {/* Collapse — hidden on mobile */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "hidden lg:flex items-center h-10 border-t border-white/[0.06] text-[#4A6580] hover:text-[#8AAFC8] transition-colors",
          sidebarOpen ? "px-4 justify-end" : "justify-center"
        )}
      >
        {sidebarOpen ? (
          isAr ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />
        ) : (
          isAr ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />
        )}
      </button>
    </aside>
    </>
  );
}
