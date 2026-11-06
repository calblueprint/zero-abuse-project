"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);

  return null;
}
