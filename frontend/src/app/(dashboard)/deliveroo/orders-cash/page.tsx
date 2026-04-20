"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeliverooOrdersCashRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/deliveroo/orders");
  }, [router]);

  return (
    <div className="p-8 text-center text-sm text-gray-500">
      This page has moved. Redirecting to{" "}
      <span className="font-medium text-foreground">/deliveroo/orders</span>…
    </div>
  );
}
