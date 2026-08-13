"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function useStoreInit() {
  useEffect(() => {
    // Load all data from the API (Supabase) once on mount
    useAppStore.getState().loadAll();
  }, []); // Empty dependency array - runs only once on mount
}
