"use client";

import { useToastContext } from "@/components/ui/toast";

export function useToast() {
  const { toast, success, error, warning } = useToastContext();
  return { toast, success, error, warning };
}
