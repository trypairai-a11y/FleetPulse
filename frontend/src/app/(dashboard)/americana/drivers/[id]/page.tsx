"use client";

// Phase 3 Wave 4 — legacy redirect to canonical /drivers/[id].
// UI-SPEC §2.1 Q3.10 resolution. Old bookmarks survive.

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AmericanaDriverDetailRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const id = params?.id;
    if (!id) return;
    const fromQuery = search?.get("from");
    const target = `/drivers/${id}?from=${fromQuery ?? "americana"}`;
    router.replace(target);
  }, [params, router, search]);

  return null;
}
