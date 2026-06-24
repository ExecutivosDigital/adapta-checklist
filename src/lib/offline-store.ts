import { createStore, del, get, keys, set } from "idb-keyval";
import type { PendingMutation } from "@/types/offline.types";

/**
 * Wrapper tipado em cima de idb-keyval. Cada "namespace" abre um store
 * separado no IndexedDB (banco `adapta-driver-offline`). Migrar para Dexie
 * só quando precisarmos de queries por índice — ver D3 em NOTES.
 */

const DB_NAME = "adapta-driver-offline";

const pendingMutationsStore = createStore(DB_NAME, "pendingMutations");
const cachedDataStore = createStore(DB_NAME, "cachedData");

// ----- Pending mutations (fila offline) -----

export async function listPendingMutations(): Promise<PendingMutation[]> {
  const ids = (await keys(pendingMutationsStore)) as string[];
  const items = await Promise.all(
    ids.map((id) => get<PendingMutation>(id, pendingMutationsStore)),
  );
  return items
    .filter((m): m is PendingMutation => !!m)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function savePendingMutation(m: PendingMutation): Promise<void> {
  await set(m.idempotencyKey, m, pendingMutationsStore);
}

export async function deletePendingMutation(idempotencyKey: string): Promise<void> {
  await del(idempotencyKey, pendingMutationsStore);
}

// ----- Cached data (futuras features offline — ainda vazio) -----

export async function setCached<T>(key: string, value: T): Promise<void> {
  await set(key, value, cachedDataStore);
}

export async function getCached<T>(key: string): Promise<T | undefined> {
  return get<T>(key, cachedDataStore);
}

export async function deleteCached(key: string): Promise<void> {
  await del(key, cachedDataStore);
}

// ----- Limpeza total (chamar no logout — ver A4 em NOTES) -----

export async function clearOfflineStorage(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  // idb-keyval não expõe drop de banco — usar a API nativa.
  await new Promise<void>((resolve, reject) => {
    const req = window.indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve(); // outro tab segurou — não bloqueia o logout
  });
}
