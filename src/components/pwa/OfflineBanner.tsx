"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { CloudOff } from "lucide-react";

export function OfflineBanner() {
  const { online, hydrated } = useNetworkStatus();

  if (!hydrated || online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-gray-900 px-4 py-2 text-xs font-medium text-white shadow-md"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      <span>
        Sem conexão — alterações serão sincronizadas quando voltar online.
      </span>
    </div>
  );
}
