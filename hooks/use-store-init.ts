"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

export function useStoreInit() {
  useEffect(() => {
    // Load from storage only once on mount
    useAppStore.getState().loadFromStorage();
  }, []); // Empty dependency array - runs only once on mount
}
