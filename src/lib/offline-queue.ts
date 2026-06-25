import axios from "axios";
import { v4 as uuid } from "uuid";
import { api } from "@/lib/api";
import {
  deletePendingMutation,
  listPendingMutations,
  savePendingMutation,
} from "@/lib/offline-store";
import type {
  DrainResult,
  MutationMethod,
  PendingFileUpload,
  PendingMutation,
} from "@/types/offline.types";

interface EnqueueInput {
  endpoint: string;
  method: MutationMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Identifica o tipo de operação (ex: "trip.delivery", "offer.accept"). */
  kind: string;
  /** Upload de arquivo (foto) a subir antes do request principal. */
  upload?: PendingFileUpload;
}

/**
 * Persistente entre reloads — usado pra evitar drains concorrentes
 * dentro do mesmo documento. Workers em outras abas podem disparar em
 * paralelo; o `Idempotency-Key` no backend garante segurança.
 */
let draining = false;

const MAX_ATTEMPTS = 8;
// Backoff exponencial — 1s, 2s, 4s, ... até 60s.
function backoffMs(attempts: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempts - 1));
}

export async function enqueueMutation(
  input: EnqueueInput,
): Promise<PendingMutation> {
  const mutation: PendingMutation = {
    idempotencyKey: uuid(),
    endpoint: input.endpoint,
    method: input.method,
    body: input.body,
    headers: input.headers,
    kind: input.kind,
    upload: input.upload,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  await savePendingMutation(mutation);
  // Pede ao SW pra registrar Background Sync — Chromium dispara `sync`
  // quando o navegador detecta conectividade. iOS/Safari ignoram.
  void registerBackgroundSync();
  // Tenta drenar imediatamente — se já online, vai embora; se offline, fica.
  void drainQueue();
  return mutation;
}

async function registerBackgroundSync(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (
      registration as ServiceWorkerRegistration & {
        sync?: { register(tag: string): Promise<void> };
      }
    ).sync;
    if (syncManager) {
      await syncManager.register("adapta-drain-queue");
    }
  } catch {
    /* navegador sem suporte ou SW não pronto — silencia */
  }
}

/** Converte um data URL (`data:...;base64,...`) num Blob pra upload multipart. */
function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/** Grava `value` em `obj` seguindo um dot-path (ex: `itens.0.fotoUrl`). */
function setByPath(obj: unknown, path: string, value: unknown): void {
  const keys = path.split(".");
  let cursor = obj as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cursor[k] !== "object" || cursor[k] === null) cursor[k] = {};
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
}

/**
 * Sobe a foto pelo endpoint de arquivos e devolve a URL. O backend
 * (`POST /file`) recebe multipart no campo configurado e responde `{ url }`.
 */
async function uploadFile(upload: PendingFileUpload): Promise<string> {
  const blob = dataUrlToBlob(upload.dataUrl, upload.mimeType);
  const form = new FormData();
  form.append(upload.field, blob, upload.fileName);
  const { data } = await api.post<{ url: string; fullUrl?: string }>(
    upload.endpoint,
    form,
  );
  return data.fullUrl ?? data.url;
}

async function executeMutation(m: PendingMutation): Promise<void> {
  let body = m.body;
  // Se há foto na fila: sobe primeiro, injeta a URL no body e segue.
  if (m.upload) {
    const url = await uploadFile(m.upload);
    body = m.body ? JSON.parse(JSON.stringify(m.body)) : {};
    setByPath(body, m.upload.urlField, url);
  }
  await api.request({
    url: m.endpoint,
    method: m.method,
    data: body,
    headers: {
      ...m.headers,
      "Idempotency-Key": m.idempotencyKey,
    },
  });
}

/**
 * Drena a fila em ordem. Para no primeiro erro de rede (assume que voltou
 * offline ou backend caiu). Em 409/Conflict assume idempotência satisfeita
 * e remove a mutação — ver D7 em NOTES.
 */
export async function drainQueue(): Promise<DrainResult> {
  if (draining) return { drained: 0, failed: 0, remaining: -1 };
  draining = true;

  let drained = 0;
  let failed = 0;
  try {
    const pending = await listPendingMutations();
    if (pending.length === 0) return { drained: 0, failed: 0, remaining: 0 };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { drained: 0, failed: 0, remaining: pending.length };
    }

    for (const m of pending) {
      // Backoff: se a próxima tentativa ainda não chegou, pula.
      if (m.attempts > 0) {
        const nextAt = m.createdAt + backoffMs(m.attempts);
        if (Date.now() < nextAt) continue;
      }

      try {
        await savePendingMutation({ ...m, status: "in_flight" });
        await executeMutation(m);
        await deletePendingMutation(m.idempotencyKey);
        drained++;
      } catch (err) {
        const isAxios = axios.isAxiosError(err);
        const status = isAxios ? err.response?.status : undefined;

        // 409 Conflict = backend já registrou a mesma operação (idempotência).
        // Tratamos como sucesso e removemos da fila (D7).
        if (status === 409) {
          await deletePendingMutation(m.idempotencyKey);
          drained++;
          continue;
        }

        const attempts = m.attempts + 1;
        const message = isAxios
          ? err.response?.data?.message ?? err.message
          : err instanceof Error
            ? err.message
            : "Erro desconhecido";

        const updated: PendingMutation = {
          ...m,
          attempts,
          lastError: typeof message === "string" ? message : String(message),
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        };
        await savePendingMutation(updated);
        failed++;

        // Erros 4xx (exceto 409) — não vão sumir com retry: param a fila aqui
        // pra evitar gastar tentativas em coisa quebrada de antemão.
        if (status && status >= 400 && status < 500) {
          break;
        }

        // Erro de rede ou 5xx — pode estar offline de novo, para por aqui.
        if (!status) break;
      }
    }

    const remaining = (await listPendingMutations()).length;
    return { drained, failed, remaining };
  } finally {
    draining = false;
  }
}

export async function countPendingMutations(): Promise<number> {
  return (await listPendingMutations()).length;
}
