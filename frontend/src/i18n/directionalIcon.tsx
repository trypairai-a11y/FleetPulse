"use client";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  type LucideProps,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "./I18nProvider";

type DirectionalKind =
  | "chevron-forward"
  | "chevron-back"
  | "arrow-forward"
  | "arrow-back";

/**
 * "forward" = the direction the user reads toward (right in LTR, left in RTL).
 * "back"    = the opposite direction (left in LTR, right in RTL).
 * Use these semantics rather than picking ChevronLeft/Right directly so the
 * icon tracks reading direction automatically.
 */
const MAP: Record<
  DirectionalKind,
  { ltr: LucideIcon; rtl: LucideIcon }
> = {
  "chevron-forward": { ltr: ChevronRight, rtl: ChevronLeft },
  "chevron-back": { ltr: ChevronLeft, rtl: ChevronRight },
  "arrow-forward": { ltr: ArrowRight, rtl: ArrowLeft },
  "arrow-back": { ltr: ArrowLeft, rtl: ArrowRight },
};

export function DirectionalIcon({
  kind,
  ...rest
}: { kind: DirectionalKind } & LucideProps) {
  const { dir } = useI18n();
  const Icon = dir === "rtl" ? MAP[kind].rtl : MAP[kind].ltr;
  return <Icon {...rest} />;
}

export function useDirectionalIcon(kind: DirectionalKind): LucideIcon {
  const { dir } = useI18n();
  return dir === "rtl" ? MAP[kind].rtl : MAP[kind].ltr;
}
