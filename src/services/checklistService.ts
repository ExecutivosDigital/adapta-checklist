import { api } from "@/lib/api";
import { enqueueMutation } from "@/lib/offline-queue";
import {
  MOCK,
  MOCK_CHECKLISTS,
  MOCK_TEMPLATES,
  MOCK_VEHICLES,
  buildMockChecklist,
  findMockChecklist,
} from "@/services/checklistMock";
import type {
  AFazerInput,
  CreateChecklistInput,
  DriverVehicle,
  FleetChecklist,
  FleetChecklistStatus,
  FleetChecklistTemplate,
  FleetChecklistTipo,
  SaveChecklistItemsInput,
} from "@/types/checklist.types";

/**
 * Checklist de Rotina da Frota — lado MOTORISTA (rotas driver-scoped do monolito,
 * autorizadas pelo CPF do token). Leituras vão online; preencher/concluir passam
 * pela fila offline (`enqueueMutation`).
 *
 * Com `NEXT_PUBLIC_MOCK_DATA=1` (modo DEMO), tudo responde com dados de exemplo —
 * o app roda 100% standalone pra validar a UX, sem backend/auth/banco.
 */
const BASE = "/driver/fleet-checklists";

export async function listChecklistTemplates(
  tipo?: FleetChecklistTipo,
): Promise<FleetChecklistTemplate[]> {
  if (MOCK) return MOCK_TEMPLATES.filter((t) => !tipo || t.tipo === tipo);
  const { data } = await api.get<FleetChecklistTemplate[]>(`${BASE}/templates`, {
    params: tipo ? { tipo } : undefined,
  });
  return data;
}

export async function listDriverVehicles(): Promise<DriverVehicle[]> {
  if (MOCK) return MOCK_VEHICLES;
  const { data } = await api.get<DriverVehicle[]>(`${BASE}/vehicles`);
  return data;
}

/** "A fazer por voz" → requisição de manutenção (offline-safe). */
export async function createAFazer(input: AFazerInput): Promise<void> {
  if (MOCK) return;
  await enqueueMutation({
    endpoint: `${BASE}/a-fazer`,
    method: "POST",
    body: input,
    kind: "checklist.aFazer",
  });
}

export async function listChecklists(params?: {
  vehicleId?: string;
  tipo?: FleetChecklistTipo;
  status?: FleetChecklistStatus;
}): Promise<FleetChecklist[]> {
  if (MOCK) return MOCK_CHECKLISTS;
  const { data } = await api.get<FleetChecklist[]>(BASE, { params });
  return data;
}

/**
 * Carrega um checklist por id (detalhe / continuar / ver).
 *
 * As rotas do MOTORISTA (`/driver/fleet-checklists`) não expõem `GET /:id`
 * (só a controller de Frota/ADM com RBAC tem). Como o `list` já devolve cada
 * checklist completo (com itens, via include do back), buscamos na lista e
 * filtramos pelo id no cliente.
 */
export async function getChecklist(id: string): Promise<FleetChecklist | null> {
  if (MOCK) return findMockChecklist(id) ?? null;
  const { data } = await api.get<FleetChecklist[]>(BASE);
  return data.find((c) => c.id === id) ?? null;
}

/** Abre um checklist a partir de um template (com os itens). */
export async function createChecklist(
  input: CreateChecklistInput,
): Promise<FleetChecklist> {
  if (MOCK) return buildMockChecklist(input.templateId, input.vehicleId);
  const { data } = await api.post<FleetChecklist>(BASE, input);
  return data;
}

/** Salva respostas dos itens (offline-safe). */
export async function saveChecklistItems(
  id: string,
  input: SaveChecklistItemsInput,
): Promise<void> {
  if (MOCK) return;
  await enqueueMutation({
    endpoint: `${BASE}/${id}/itens`,
    method: "PATCH",
    body: input,
    kind: "checklist.saveItems",
  });
}

/** Conclui o checklist (offline-safe). Dispara o efeito de disponibilidade no back. */
export async function concludeChecklist(
  id: string,
  input: SaveChecklistItemsInput,
): Promise<void> {
  if (MOCK) return;
  await enqueueMutation({
    endpoint: `${BASE}/${id}/concluir`,
    method: "PATCH",
    body: input,
    kind: "checklist.conclude",
  });
}
