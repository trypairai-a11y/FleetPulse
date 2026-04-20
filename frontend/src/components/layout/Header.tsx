"use client";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, PanelLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import NotificationDropdown from "./NotificationDropdown";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { open, setOpen } = useSidebar();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initial = (user?.name || "U").charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-sand-50/90 dark:bg-card/80 backdrop-blur-xl border-b border-sand-200 dark:border-border flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-pill hover:bg-sand-200/70 text-sand-700 hover:text-sand-900 transition-colors duration-250 ease-sierra-out"
            title="Open sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="font-display text-[22px] leading-tight text-sand-900 tracking-tight">
            {greeting}, <span className="italic">{user?.name?.split(" ")[0] || "User"}</span>
          </h1>
          <p className="text-xs text-sand-600 mt-0.5">{dateStr}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationDropdown />
        <div className="hidden md:flex items-center gap-3 ms-2 ps-3 border-s border-sand-200 dark:border-border">
          <div className="h-9 w-9 rounded-full bg-forest-800 text-white flex items-center justify-center font-display text-sm">
            {initial}
          </div>
          <div className="text-right leading-tight">
            <p className="text-[13px] font-medium text-sand-900">{user?.name}</p>
            <p className="text-[11px] text-sand-600 uppercase tracking-widest">{user?.role?.replace("_", " ")}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-pill hover:bg-sand-200/70 text-sand-700 hover:text-sand-900 transition-colors duration-250 ease-sierra-out"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
