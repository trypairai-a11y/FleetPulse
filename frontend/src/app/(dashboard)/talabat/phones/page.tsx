"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeprecatedTalabatPhonesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/talabat/drivers?tab=assets");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-gray-500">
      Phones moved to Driver 360 → Assets. Redirecting…
    </div>
  );
}
