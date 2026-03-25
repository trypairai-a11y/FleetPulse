"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard, Map, CalendarCheck, Ticket, Users, Settings,
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeft,
  Car, Smartphone, ClipboardList, DollarSign, Briefcase,
  CalendarClock, ShieldAlert,
} from "lucide-react";

const PLATFORMS = [
  {
    name: "Keeta",
    key: "keeta",
    color: "text-keeta",
    bg: "bg-keeta/10",
    subPages: [
      { name: "Drivers", path: "/keeta/drivers", icon: Users },
      { name: "Attendance", path: "/keeta/attendance", icon: CalendarCheck },
      { name: "Shifts", path: "/keeta/shifts", icon: ClipboardList },
      { name: "Orders", path: "/keeta/orders", icon: Briefcase },
      { name: "Vehicles", path: "/keeta/vehicles", icon: Car },
      { name: "Phones", path: "/keeta/phones", icon: Smartphone },
    ],
  },
  {
    name: "Talabat",
    key: "talabat",
    color: "text-talabat",
    bg: "bg-talabat/10",
    subPages: [
      { name: "Drivers", path: "/talabat/drivers", icon: Users },
      { name: "Attendance", path: "/talabat/attendance", icon: CalendarCheck },
      { name: "Shifts", path: "/talabat/shifts", icon: ClipboardList },
      { name: "Sessions", path: "/talabat/sessions", icon: CalendarClock },
      { name: "Orders", path: "/talabat/orders", icon: Briefcase },
      { name: "Cash & Dues", path: "/talabat/cash", icon: DollarSign },
      { name: "Compliance", path: "/talabat/compliance", icon: ShieldAlert },
      { name: "Vehicles", path: "/talabat/vehicles", icon: Car },
      { name: "Phones", path: "/talabat/phones", icon: Smartphone },
    ],
  },
  {
    name: "Deliveroo",
    key: "deliveroo",
    color: "text-deliveroo",
    bg: "bg-deliveroo/10",
    subPages: [
      { name: "Drivers", path: "/deliveroo/drivers", icon: Users },
      { name: "Attendance", path: "/deliveroo/attendance", icon: CalendarCheck },
      { name: "Shifts", path: "/deliveroo/shifts", icon: ClipboardList },
      { name: "Orders & Cash", path: "/deliveroo/orders-cash", icon: Briefcase },
      { name: "Vehicles", path: "/deliveroo/vehicles", icon: Car },
      { name: "Phones", path: "/deliveroo/phones", icon: Smartphone },
    ],
  },
  {
    name: "Americana",
    key: "americana",
    color: "text-americana",
    bg: "bg-americana/10",
    subPages: [
      { name: "Drivers", path: "/americana/drivers", icon: Users },
      { name: "Attendance", path: "/americana/attendance", icon: CalendarCheck },
      { name: "Shifts", path: "/americana/shifts", icon: ClipboardList },
      { name: "Orders", path: "/americana/orders", icon: Briefcase },
      { name: "Vehicles", path: "/americana/vehicles", icon: Car },
      { name: "Phones", path: "/americana/phones", icon: Smartphone },
    ],
  },
];

const GLOBAL_NAV = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Live Map", path: "/map", icon: Map },
  { name: "Attendance", path: "/attendance", icon: CalendarCheck },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  { name: "Recruitment", path: "/recruitment", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
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
        "fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-40 flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-50">
        {!collapsed && (
          <span className="text-xl font-semibold text-primary tracking-tight">Darb</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-50 text-secondary transition-colors"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {/* Global */}
        {!collapsed && (
          <div className="px-3 mb-2 text-[11px] font-medium text-secondary uppercase tracking-wider">
            Global
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
            {!collapsed && <span>{item.name}</span>}
          </Link>
        ))}

        {/* Platforms */}
        <div className={cn("mt-6", !collapsed && "px-3 mb-2")}>
          {!collapsed && (
            <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-2">
              Platforms
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
              <div className="ml-5 mt-0.5 space-y-0.5">
                {platform.subPages.map((sub) => (
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
                    <sub.icon size={14} />
                    <span>{sub.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* System */}
        <div className="mt-6">
          {!collapsed && (
            <div className="px-3 mb-2 text-[11px] font-medium text-secondary uppercase tracking-wider">
              System
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
            <Settings size={18} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
