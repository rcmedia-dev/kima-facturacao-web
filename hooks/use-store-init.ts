"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

export function useStoreInit() {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" || pathname === "/signup" || pathname === "/auth";

  useEffect(() => {
    if (isAuthPage) return;
    // Load all data from the API (Supabase) once on mount when authenticated
    useAppStore.getState().loadAll();
  }, [isAuthPage]);
}
