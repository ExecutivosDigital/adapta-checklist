/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Fase 2 — esqueleto: precache mínimo + listener pra SKIP_WAITING vindo do
// <UpdatePrompt /> quando o usuário aceitar atualizar. Cache runtime fica
// pra Fase 3.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // skipWaiting=false → SW novo fica em "waiting" até receber SKIP_WAITING
  // (decisão D2 do NOTES.md — prompt explícito de atualização).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // Fallback servido quando uma navegação falha (offline + sem cache da rota).
  // /~offline é uma rota estática precacheada pelo build do Next.
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

// Background Sync (Chromium): browser dispara `sync` quando detecta
// conectividade. O SW não tem acesso ao IndexedDB do contexto da página
// nem ao token JWT, então só avisa os clients pra drenarem por conta própria.
self.addEventListener("sync", (event) => {
  const syncEvent = event as ExtendableEvent & { tag?: string };
  if (syncEvent.tag !== "adapta-drain-queue") return;

  syncEvent.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "PWA_DRAIN_QUEUE" });
      }
    }),
  );
});
