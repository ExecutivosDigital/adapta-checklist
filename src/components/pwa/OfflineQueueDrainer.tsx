"use client";

import { drainQueue } from "@/lib/offline-queue";
import { useEffect } from "react";

/**
 * Componente "headless" que dispara `drainQueue()` em momentos chave:
 *  - Ao montar (login / reabertura do app).
 *  - Quando volta `online`.
 *  - Quando o SW recebe `sync` (Background Sync) e manda `PWA_DRAIN_QUEUE`.
 *
 * Renderizar dentro do AuthGate — só usuários autenticados drenam (token
 * disponível pro axios interceptor).
 */
export function OfflineQueueDrainer() {
  useEffect(() => {
    void drainQueue();

    const onOnline = () => {
      void drainQueue();
    };
    window.addEventListener("online", onOnline);

    let messageHandler: ((event: MessageEvent) => void) | undefined;
    if ("serviceWorker" in navigator) {
      messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "PWA_DRAIN_QUEUE") {
          void drainQueue();
        }
      };
      navigator.serviceWorker.addEventListener("message", messageHandler);
    }

    return () => {
      window.removeEventListener("online", onOnline);
      if (messageHandler && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", messageHandler);
      }
    };
  }, []);

  return null;
}
