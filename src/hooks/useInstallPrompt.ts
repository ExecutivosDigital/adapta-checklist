"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

interface InstallPromptState {
  /** PWA já está rodando em modo standalone (instalado). */
  isStandalone: boolean;
  /** Dispositivo iOS (instalação manual via Compartilhar). */
  isIOS: boolean;
  /** Chrome/Android disparou beforeinstallprompt — `promptInstall()` é chamável. */
  canPrompt: boolean;
  /** Aciona o prompt nativo de instalação. Resolve com a escolha do usuário. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  // iPad em iOS 13+ reporta UA de Mac → detectar via touch points.
  const isIPadOS =
    /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setIsIOS(detectIOS());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      // Telemetria simples (P4): pode ser substituído por evento real depois.
      console.info("[pwa] appinstalled");
    };
    const standaloneMql = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setIsStandalone(detectStandalone());

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    standaloneMql.addEventListener("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneMql.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  }, [deferredPrompt]);

  return {
    isStandalone,
    isIOS,
    canPrompt: !!deferredPrompt,
    promptInstall,
  };
}
