"use client";

import { useParams } from "next/navigation";
import Driver360 from "@/components/shared/Driver360";

export default function DeliverooDriverDetailPage() {
  const params = useParams();
  const driverId = String(params?.id ?? "");
  return <Driver360 driverId={driverId} platform="deliveroo" />;
}
