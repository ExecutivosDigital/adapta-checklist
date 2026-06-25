export type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type MutationStatus = "pending" | "in_flight" | "failed";

/**
 * Descreve um upload de arquivo (foto) que precisa subir ANTES do `endpoint`
 * da mutação. Ao drenar, o blob (base64) é enviado como multipart pro endpoint
 * de arquivos do backend; a URL retornada é então injetada no body da mutação
 * (via `urlField`) antes do request principal. Permite tirar foto offline:
 * o blob fica no IndexedDB da fila e o upload acontece ao reconectar.
 */
export interface PendingFileUpload {
  /** Endpoint de upload (ex: `/file`). */
  endpoint: string;
  /** Nome do campo no multipart (ex: `file`). */
  field: string;
  /** Conteúdo do arquivo em data URL base64 (`data:image/jpeg;base64,...`). */
  dataUrl: string;
  fileName: string;
  mimeType: string;
  /**
   * Caminho (dot-path) dentro de `body` onde a URL retornada deve ser gravada
   * antes de executar a mutação principal (ex: `itens.0.fotoUrl`).
   */
  urlField: string;
}

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
  /**
   * Upload de arquivo a executar ANTES do request principal. A URL resultante
   * é injetada no `body` (em `upload.urlField`). Usado pela foto do checklist
   * offline — ver `enqueueMutation` / `executeMutation`.
   */
  upload?: PendingFileUpload;
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
