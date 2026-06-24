"use client";

import { useEffect, useState } from "react";

interface NetworkStatus {
  /** O navegador acredita que existe conectividade. Pode ser falso positivo em redes captive/proxy. */
  online: boolean;
  /** Já hidratou no client (evita flicker SSR onde `online` chuta `true`). */
  hydrated: boolean;
}

/**
 * Reage a `online`/`offline` do navegador. `navigator.onLine` é heurístico —
 * `false` é confiável (não há rede física), `true` apenas indica que o
 * adapter tem IP, não que existe internet de verdade. Pra detecção robusta
 * de "internet real" o consumidor precisa complementar com health-check.
 */
export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online, hydrated };
}
