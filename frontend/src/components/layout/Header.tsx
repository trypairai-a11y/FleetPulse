"use client";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

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

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {greeting}, {user?.name || "User"}
        </h1>
        <p className="text-xs text-secondary">{dateStr}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right mr-2">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <p className="text-xs text-secondary">{user?.role?.replace("_", " ")}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-gray-50 text-secondary transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
