"use client";
import { useParams } from "next/navigation";
import Driver360 from "@/components/shared/Driver360";

export default function KeetaDriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <Driver360 driverId={id} platform="keeta" />;
}
