"use client";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { useSidebar } from "@/contexts/SidebarContext";
import SidebarV2 from "@/components/layout/SidebarV2";
import Header from "@/components/layout/Header";

const AskDarbPalette = dynamic(() => import("@/components/ai/AskDarbPalette"), {
  ssr: false,
  loading: () => null,
});

export default function V2Layout({ children }: { children: React.ReactNode }) {
  const { collapsed, open } = useSidebar();
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <SidebarV2 />
      <div className={cn("transition-all duration-200", !open ? "ml-0" : collapsed ? "ml-16" : "ml-60")}>
        <Header />
        <main className="px-8 pb-24 pt-6">{children}</main>
      </div>
      <AskDarbPalette />
    </div>
  );
}
