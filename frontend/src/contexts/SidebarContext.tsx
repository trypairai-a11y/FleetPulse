"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

const STORAGE_KEY = "sidebar-collapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

function writeStoredCollapsed(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded)
  }
}

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
  open: true,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedRaw] = useState<boolean>(readStoredCollapsed);
  const [open, setOpen] = useState(true);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedRaw(v);
    writeStoredCollapsed(v);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedRaw((prev) => {
      const next = !prev;
      writeStoredCollapsed(next);
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle, open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
