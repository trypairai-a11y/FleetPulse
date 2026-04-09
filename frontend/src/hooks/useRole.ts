"use client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "ADMIN" | "OPS_MANAGER" | "SUPERVISOR" | "ACCOUNTANT" | "VIEWER";

/** Role hierarchy: higher index = less permissions */
const ROLE_ORDER: UserRole[] = ["ADMIN", "OPS_MANAGER", "SUPERVISOR", "ACCOUNTANT", "VIEWER"];

/**
 * Returns helpers for checking the current user's role and permissions.
 */
export function useRole() {
  const { user } = useAuth();
  const role = (user?.role as UserRole) ?? "VIEWER";

  /**
   * Returns true if the current user has AT LEAST the given role
   * (i.e., their role is equal to or higher privilege than the required role).
   */
  function hasRole(required: UserRole): boolean {
    const userIdx = ROLE_ORDER.indexOf(role);
    const reqIdx = ROLE_ORDER.indexOf(required);
    return userIdx !== -1 && reqIdx !== -1 && userIdx <= reqIdx;
  }

  /**
   * Returns true if the current user has EXACTLY one of the given roles.
   */
  function isRole(...roles: UserRole[]): boolean {
    return roles.includes(role);
  }

  return {
    role,
    hasRole,
    isRole,
    isAdmin: role === "ADMIN",
    isOpsManager: isRole("ADMIN", "OPS_MANAGER"),
    isSupervisor: isRole("ADMIN", "OPS_MANAGER", "SUPERVISOR"),
    canEdit: hasRole("SUPERVISOR"),       // SUPERVISOR and above can edit
    canDelete: hasRole("OPS_MANAGER"),    // OPS_MANAGER and above can delete
    canManageSettings: hasRole("OPS_MANAGER"), // OPS_MANAGER and above can change settings
    canViewFinancials: hasRole("ACCOUNTANT"), // ACCOUNTANT and above can see cash/financials
  };
}
