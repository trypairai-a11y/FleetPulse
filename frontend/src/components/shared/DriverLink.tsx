// Phase 3 Wave 2 — global Driver File link primitive.
// Replaces legacy /{platform}/drivers/${id} hrefs across the app.

import Link from "next/link";
import { ReactNode } from "react";

export interface DriverLinkProps {
  driverId: string;
  name: ReactNode;
  platform?: "keeta" | "talabat" | "deliveroo" | "americana";
  className?: string;
}

export default function DriverLink({ driverId, name, platform, className }: DriverLinkProps) {
  const href = platform ? `/drivers/${driverId}?from=${platform}` : `/drivers/${driverId}`;
  return (
    <Link
      href={href}
      prefetch={false}
      className={className ?? "text-primary hover:underline"}
    >
      {name}
    </Link>
  );
}
