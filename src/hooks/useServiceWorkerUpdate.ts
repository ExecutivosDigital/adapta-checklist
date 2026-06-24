"use client";

import { useCallback, useEffect, useState } from "react";

interface ServiceWorkerUpdateState {
  /** Há um SW novo em estado "waiting" pronto para assumir. */
  updateAvailable: boolean;
  /** Aplica o update (envia SKIP_WAITING ao SW novo) e recarrega ao trocar de controller. */
  applyUpdate: () => void;
}

/**
 * Escuta o ciclo de vida do Service Worker e expõe estado "nova versão
 * disponível". Quando o usuário aceitar, envia SKIP_WAITING ao SW em waiting
 * e recarrega no evento `controllerchange`.
 *
 * Em dev (sem registro de SW pelo Serwist), permanece `updateAvailable: false`.
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateState {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const handleControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    let cleanupUpdateFound: (() => void) | undefined;

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      // SW já em waiting no momento do carregamento
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
      }

      const onUpdateFound = () => {
        const installing = registration.installing;
        if (!installing) return;
        const onStateChange = () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(installing);
          }
        };
        installing.addEventListener("statechange", onStateChange);
        cleanupUpdateFound = () => {
          installing.removeEventListener("statechange", onStateChange);
        };
      };
      registration.addEventListener("updatefound", onUpdateFound);
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      cleanupUpdateFound?.();
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  return { updateAvailable: !!waitingWorker, applyUpdate };
}
