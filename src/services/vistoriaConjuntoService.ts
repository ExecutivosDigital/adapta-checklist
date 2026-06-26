import { api } from "@/lib/api";
import { enqueueMutation } from "@/lib/offline-queue";
import { MOCK } from "@/services/checklistMock";
import {
  MOCK_CONJUNTO,
  MOCK_CONJUNTO_ITENS,
} from "@/services/frotaGrMock";
import type {
  ConfirmarVistoriaInput,
  VistoriaConjuntoQuery,
  VistoriaConjuntoStatus,
  VistoriaItemDef,
} from "@/types/vistoriaConjunto.types";

/**
 * Vistoria do Conjunto (cavalo + carreta) — lado MOTORISTA (Etapa 8 / T8.2).
 * Rotas driver-scoped do monolito (`/driver/vistoria-conjunto`), autorizadas
 * pelo CPF do token (injetado pelo interceptor em `src/lib/api.ts`).
 *
 * Leitura (status do conjunto + gerenciadora) vai online. Confirmar a vistoria
 * manual passa pela fila offline (`enqueueMutation`) com um `clientId` (uuid)
 * pra idempotência — funciona sem rede e sobe ao reconectar.
 *
 * O status da gerenciadora é SOMENTE LEITURA aqui (registrado no GR); o app só
 * exibe. Com `NEXT_PUBLIC_MOCK_DATA=1` (modo DEMO), tudo responde com dados de
 * exemplo (reaproveita o shape do `frotaGrMock.ts`).
 */
const BASE = "/driver/vistoria-conjunto";

/** Catálogo de itens da vistoria (mesma referência usada pela aba GR). */
export const VISTORIA_CONJUNTO_ITENS: VistoriaItemDef[] = MOCK_CONJUNTO_ITENS.map(
  (i) => ({ codigo: i.codigo, titulo: i.titulo }),
);

/** Monta os params da consulta (preferindo vehicleSetId quando houver). */
function buildParams(query: VistoriaConjuntoQuery): VistoriaConjuntoQuery {
  if (query.vehicleSetId) return { vehicleSetId: query.vehicleSetId };
  return { cavalo: query.cavalo, carreta: query.carreta };
}

/** Estado mock (em memória) pra refletir a confirmação no modo DEMO. */
let mockVistoriaValida = MOCK_CONJUNTO.status === "VALIDA";

/** Status atual do conjunto + checklist da gerenciadora (read-only). */
export async function getVistoriaConjunto(
  query: VistoriaConjuntoQuery,
): Promise<VistoriaConjuntoStatus> {
  if (MOCK) {
    return {
      conjunto: {
        vehicleSetId: query.vehicleSetId ?? null,
        cavalo: query.cavalo ?? MOCK_CONJUNTO.cavalo,
        carreta: query.carreta ?? MOCK_CONJUNTO.carreta,
      },
      vistoriaValida: mockVistoriaValida,
      ultimaVistoria: mockVistoriaValida
        ? {
            id: "mock-vistoria-1",
            data: new Date().toISOString(),
            status: "CONFORME",
          }
        : null,
      gerenciadora: {
        status: "PENDENTE",
        validade: null,
      },
    };
  }
  const { data } = await api.get<VistoriaConjuntoStatus>(BASE, {
    params: buildParams(query),
  });
  return data;
}

/**
 * Confirma a vistoria manual do conjunto — offline-safe. O body inteiro
 * (com `clientId`) entra na fila offline: ao reconectar, sobe via
 * `POST /driver/vistoria-conjunto/confirmar`. O backend é idempotente por
 * `clientId`. Em MOCK, marca a vistoria como válida em memória.
 */
export async function confirmarVistoriaConjunto(
  input: ConfirmarVistoriaInput,
): Promise<void> {
  if (MOCK) {
    mockVistoriaValida = true;
    return;
  }
  await enqueueMutation({
    endpoint: `${BASE}/confirmar`,
    method: "POST",
    body: input,
    kind: "vistoriaConjunto.confirmar",
  });
}
