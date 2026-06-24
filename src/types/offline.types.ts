export type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type MutationStatus = "pending" | "in_flight" | "failed";

export interface PendingMutation {
  /** UUID v4 — também usado como `Idempotency-Key` no header da request. */
  idempotencyKey: string;
  /** Path relativo ao baseURL do axios (ex: `/auth/contact-token`). */
  endpoint: string;
  method: MutationMethod;
  /** Body serializável em JSON. Blobs (fotos etc.) precisam ser convertidos antes. */
  body?: unknown;
  /** Headers extras a aplicar na request (auth Bearer já é setado pelo interceptor). */
  headers?: Record<string, string>;
  /** Identifica o tipo de operação no domínio (ex: "trip.delivery", "offer.accept"). Útil pra UX. */
  kind: string;
  /** Quando a mutação foi enfileirada (epoch ms). */
  createdAt: number;
  /** Quantas tentativas falhadas já houve. */
  attempts: number;
  /** Último erro ao tentar drenar (mensagem curta). */
  lastError?: string;
  status: MutationStatus;
}

export interface DrainResult {
  drained: number;
  failed: number;
  remaining: number;
}
