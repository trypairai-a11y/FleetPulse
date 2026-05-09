"use client";
// Phase 2 Wave 3 — /decisions route group uses SidebarV2 (the workflow-
// oriented v2 sidebar with the new Decisions nav item) rather than the
// legacy Sidebar that the parent (dashboard) group uses.
// Mirrors the v2/layout.tsx pattern (already shipping).

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

export default function DecisionsLayout({
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
