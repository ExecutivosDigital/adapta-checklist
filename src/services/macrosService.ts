import { api } from "@/lib/api";
import { enqueueMutation } from "@/lib/offline-queue";
import {
  MOCK,
  mockListHistory,
  mockLast,
  mockPass,
  mockProximas,
} from "@/services/macrosMock";
import type {
  MacroEntry,
  MacrosProximas,
  PassMacroInput,
} from "@/types/macros.types";

/**
 * Macros do MOTORISTA (Etapa 5) — rotas driver-scoped do monolito,
 * autorizadas pelo CPF do token (injetado pelo interceptor em `src/lib/api.ts`).
 *
 * Leituras (próximas/histórico) vão online. Passar uma macro passa pela fila
 * offline (`enqueueMutation`) com um `clientId` (uuid) pra idempotência —
 * funciona sem rede e sobe ao reconectar.
 *
 * Com `NEXT_PUBLIC_MOCK_DATA=1` (modo DEMO), tudo responde com estado em
 * memória (ver `macrosMock.ts`) — o app roda 100% standalone.
 */
const BASE = "/driver/macros";

/** Próximos tipos válidos a partir do estado atual do veículo (+ última macro). */
export async function listProximasMacros(
  vehicleId: string,
): Promise<MacrosProximas> {
  if (MOCK) {
    return { last: mockLast(vehicleId), proximas: mockProximas(vehicleId) };
  }
  const { data } = await api.get<MacrosProximas>(`${BASE}/proximas`, {
    params: { vehicleId },
  });
  return data;
}

/** Histórico de macros do veículo (opcionalmente da viagem). */
export async function listMacros(params: {
  vehicleId: string;
  tripId?: string;
}): Promise<MacroEntry[]> {
  if (MOCK) {
    const list = mockListHistory(params.vehicleId);
    return params.tripId
      ? list.filter((m) => m.tripId === params.tripId)
      : list;
  }
  const { data } = await api.get<MacroEntry[]>(BASE, { params });
  return data;
}

/**
 * Passa (registra) uma macro — offline-safe. O body inteiro (com `clientId`)
 * entra na fila offline: ao reconectar, sobe via `POST /driver/macros`.
 * O backend valida a sequência e é idempotente por `clientId`.
 *
 * @returns o registro otimista (refletido na UI até a fila drenar).
 */
export async function passMacro(input: PassMacroInput): Promise<MacroEntry> {
  const optimistic: MacroEntry = {
    id: `local-${input.clientId}`,
    vehicleId: input.vehicleId,
    tipo: input.tipo,
    occurredAt: input.occurredAt,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    tripId: input.tripId ?? null,
    notes: input.notes ?? null,
    clientId: input.clientId,
    pending: !MOCK,
  };

  if (MOCK) {
    return mockPass({ ...optimistic, pending: false });
  }

  await enqueueMutation({
    endpoint: BASE,
    method: "POST",
    body: input,
    kind: "macro.pass",
  });

  return optimistic;
}
