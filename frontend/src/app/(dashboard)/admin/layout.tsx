"use client";
// Phase 2 Wave 5 — /admin/* layout. Mirrors /decisions layout — SidebarV2 +
// Header + AskDarbPalette. The super-admin guard is per-page (not in the
// layout) because Next 14 App Router client layouts can't redirect cleanly
// during the initial paint without a hydration-mismatch flicker.

import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { useSidebar } from "@/contexts/SidebarContext";
import SidebarV2 from "@/components/layout/SidebarV2";
import Header from "@/components/layout/Header";

const AskDarbPalette = dynamic(
  () => import("@/components/ai/AskDarbPalette"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed, open } = useSidebar();
  return (
    <div className="min-h-screen bg-background">
      <SidebarV2 />
      <div
        className={cn(
          "transition-all duration-200",
          !open ? "ml-0" : collapsed ? "ml-16" : "ml-60",
        )}
      >
        <Header />
        <main className="px-8 pb-24 pt-6">{children}</main>
      </div>
      <AskDarbPalette />
    </div>
  );
}
