"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

const AUTH_PATHS = ["/login", "/signup", "/auth", "/primeiro-acesso", "/acesso-negado"];

export function useStoreInit() {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isAuthPage) return;

    const store = useAppStore.getState();
    if (store._loaded) return;

    void store.loadAll();
  }, [isAuthPage, pathname]);
}
