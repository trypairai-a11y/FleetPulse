"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bell, LogOut, ChevronDown, Search, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import api from "@/lib/api";

function getPageTitle(pathname: string, isAr: boolean): string {
  if (pathname === "/") return isAr ? "الرئيسية" : "Overview";
  const item = SIDEBAR_ITEMS.find((i) => i.href !== "/" && pathname.startsWith(i.href));
  return item ? (isAr ? item.labelAr : item.labelEn) : "";
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { language, setLanguage, toggleMobileSidebar } = useUIStore();
  const isAr = language === "ar";

  const handleLogout = async () => {
    try { await api.post("/api/auth/logout"); } catch { /* */ }
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="h-14 border-b border-[#E6E9EE] bg-white flex items-center justify-between px-6">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center text-[#6B7A8D] hover:text-[#0C1825] hover:bg-[#F0F2F5] transition-colors"
        >
          <Menu className="w-4.5 h-4.5" strokeWidth={1.75} />
        </button>
        <h1 className="text-[15px] font-semibold text-[#0C1825] tracking-[-0.01em]">
          {getPageTitle(pathname, isAr)}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger */}
        <button className="w-8 h-8 rounded-md flex items-center justify-center text-[#6B7A8D] hover:text-[#0C1825] hover:bg-[#F0F2F5] transition-colors">
          <Search className="w-4 h-4" strokeWidth={1.75} />
        </button>

        {/* Language toggle */}
        <button
          onClick={() => setLanguage(isAr ? "en" : "ar")}
          className="h-8 px-2.5 rounded-md text-[12px] font-semibold text-[#6B7A8D] hover:text-[#0C1825] hover:bg-[#F0F2F5] transition-colors"
        >
          {isAr ? "EN" : "عربي"}
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-md flex items-center justify-center text-[#6B7A8D] hover:text-[#0C1825] hover:bg-[#F0F2F5] transition-colors">
          <Bell className="w-4 h-4" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#2563EB] rounded-full" />
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-[#E6E9EE] mx-2" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-8 px-1.5 rounded-md hover:bg-[#F0F2F5] transition-colors outline-none">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
              </div>
              <span className="text-[13px] font-medium text-[#374151] hidden sm:block max-w-[120px] truncate">
                {user?.name || "User"}
              </span>
              <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isAr ? "start" : "end"} className="w-52 p-1.5">
            <div className="px-2 py-1.5 mb-1">
              <p className="text-[13px] font-medium text-[#0C1825]">{user?.name}</p>
              <p className="text-[11px] text-[#6B7A8D] mt-0.5">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem className="text-[12px] text-[#6B7A8D] rounded-md h-8">
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[10px] font-semibold uppercase tracking-wider text-[#6B7A8D]">
                {user?.role}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[12px] text-[#E5484D] hover:text-[#E5484D] rounded-md h-8 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 me-2" />
              {isAr ? "تسجيل الخروج" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
