"use client";

import { Button } from "@/components/ui/button";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { RefreshCw } from "lucide-react";

export function UpdatePrompt() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-primary/30 bg-white p-3 shadow-xl sm:bottom-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            Nova versão disponível
          </p>
          <p className="text-xs text-gray-600">
            Atualize para receber as últimas melhorias.
          </p>
        </div>
        <Button size="sm" className="h-9 shrink-0" onClick={applyUpdate}>
          Atualizar
        </Button>
      </div>
    </div>
  );
}
