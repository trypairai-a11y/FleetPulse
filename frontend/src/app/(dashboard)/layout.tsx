"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { sidebarOpen, language } = useUIStore();
  const [loading, setLoading] = useState(true);
  const isAr = language === "ar";

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!user) {
      api
        .get("/api/auth/me")
        .then(({ data }) => {
          setUser(data);
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          router.push("/login");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // User already loaded — schedule state update as a microtask
      // to avoid synchronous setState during effect body
      queueMicrotask(() => setLoading(false));
    }
  }, [user, setUser, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[#6B7A8D] font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC]" dir={isAr ? "rtl" : "ltr"}>
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200 ease-out min-h-screen flex flex-col",
          // Mobile: no sidebar margin
          "ml-0 mr-0",
          // Desktop: sidebar offset
          isAr
            ? (sidebarOpen ? "lg:mr-[236px]" : "lg:mr-[60px]")
            : (sidebarOpen ? "lg:ml-[236px]" : "lg:ml-[60px]")
        )}
      >
        <Header />
        <main className="flex-1 p-3 sm:p-5">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
