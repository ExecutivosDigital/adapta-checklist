import { api, setAdminTenantId } from "@/lib/api";
import { MOCK } from "@/services/checklistMock";
import type {
  DriverMe,
  FleetChecklist,
  FleetChecklistTemplate,
  FleetChecklistTipo,
  FleetChecklistTipoCampo,
} from "@/types/checklist.types";

/**
 * Service da Frota — lado ADM (rotas com RBAC do monolito `adapta-api`).
 *
 * Diferente do `checklistService` (motorista, rotas `/driver/...` resolvidas pelo
 * CPF do token), estas rotas exigem o header `x-tenant-id`. O tenant é resolvido
 * uma vez via `GET /driver/me` e setado no `api` (ver `resolveAdminTenant`).
 *
 * Shapes confirmados lendo os controllers/services reais:
 *  - fleet-maintenance-requests.controller.ts / .service.ts (findMine, approve, reject)
 *  - vehicles.controller.ts / .service.ts (availabilityGrid)
 *  - fleet-checklists.controller.ts / .service.ts (templates, list)
 */

// ───────────────────────── Tenant (x-tenant-id) ─────────────────────────

let cachedTenant: DriverMe | null = null;

/**
 * Resolve o tenant do ADM logado e injeta `x-tenant-id` no `api`. Idempotente
 * (cacheia). Defensivo: se `GET /driver/me` ainda não existir no back (ou o
 * usuário não for motorista), não derruba a tela — só não seta o header, e as
 * chamadas ADM falharão com 400/403 tratados na UI.
 */
export async function resolveAdminTenant(): Promise<DriverMe | null> {
  if (MOCK) return null;
  if (cachedTenant) {
    setAdminTenantId(cachedTenant.tenantId);
    return cachedTenant;
  }
  try {
    const { data } = await api.get<DriverMe>("/driver/me");
    if (data?.tenantId) {
      cachedTenant = data;
      setAdminTenantId(data.tenantId);
    }
    return data ?? null;
  } catch {
    // /driver/me indisponível: segue sem header (UI mostra erro/empty nas abas).
    return null;
  }
}

export function clearAdminTenant() {
  cachedTenant = null;
  setAdminTenantId(null);
}

// ───────────────────────── A fazer (manutenção) ─────────────────────────

export type MaintenanceRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DONE"
  | "CANCELED";

export interface MaintenanceRequest {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: MaintenanceRequestStatus;
  estimatedCost: number | null;
  odometer: number | null;
  requesterName: string | null;
  reviewNotes: string | null;
  createdAt: string;
  vehicle: {
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
    type: string;
  } | null;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Lista requisições de manutenção (Admin vê todas do tenant). */
export async function listMaintenanceRequests(params?: {
  status?: MaintenanceRequestStatus;
  page?: number;
  limit?: number;
}): Promise<MaintenanceRequest[]> {
  if (MOCK) return [];
  const { data } = await api.get<Paginated<MaintenanceRequest>>(
    "/fleet-maintenance-requests",
    { params: { limit: 50, ...params } },
  );
  return data.data;
}

/** Aprova uma requisição PENDENTE → vira OS no back. */
export async function approveMaintenanceRequest(
  id: string,
  reviewNotes?: string,
): Promise<MaintenanceRequest> {
  const { data } = await api.patch<MaintenanceRequest>(
    `/fleet-maintenance-requests/${id}/approve`,
    reviewNotes ? { reviewNotes } : {},
  );
  return data;
}

/** Rejeita uma requisição PENDENTE. */
export async function rejectMaintenanceRequest(
  id: string,
  reviewNotes?: string,
): Promise<MaintenanceRequest> {
  const { data } = await api.patch<MaintenanceRequest>(
    `/fleet-maintenance-requests/${id}/reject`,
    reviewNotes ? { reviewNotes } : {},
  );
  return data;
}

// ───────────────────────── Disponibilidade ─────────────────────────

export type VehicleStatus =
  | "DISPONIVEL"
  | "EM_VIAGEM"
  | "MANUTENCAO"
  | "INATIVO"
  | "BLOQUEADO"
  | "ACIDENTE";

/** Linha da grade de disponibilidade já achatada para 1 status por veículo. */
export interface VehicleAvailability {
  id: string;
  plate: string;
  tipo: string;
  tracao: boolean;
  status: VehicleStatus;
  motivo?: string;
}

interface AvailabilityGridDay {
  date: string;
  status: VehicleStatus;
  tripId?: string;
  lockId?: string;
  motivo?: string;
}

interface AvailabilityGridVehicle {
  id: string;
  plate: string;
  tipo: string;
  tracao: boolean;
  days: AvailabilityGridDay[];
  resumo: Record<string, number>;
}

interface AvailabilityGridResponse {
  range: { inicio: string; fim: string };
  vehicles: AvailabilityGridVehicle[];
}

/** YYYY-MM-DD de hoje (local). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Disponibilidade dos veículos numa data (default: hoje). Usa a grade da Etapa 2
 * (`GET /vehicles/availability`) com `inicio = fim`, e achata para 1 status/dia.
 */
export async function listVehicleAvailability(
  data?: string,
): Promise<VehicleAvailability[]> {
  if (MOCK) return [];
  const dia = data ?? todayKey();
  const { data: grid } = await api.get<AvailabilityGridResponse>(
    "/vehicles/availability",
    { params: { inicio: dia, fim: dia } },
  );
  return grid.vehicles.map((v) => {
    const day = v.days[0];
    return {
      id: v.id,
      plate: v.plate,
      tipo: v.tipo,
      tracao: v.tracao,
      status: day?.status ?? "DISPONIVEL",
      motivo: day?.motivo,
    };
  });
}

// ───────────────────────── Templates ─────────────────────────

export async function listTemplatesAdmin(
  tipo?: FleetChecklistTipo,
): Promise<FleetChecklistTemplate[]> {
  if (MOCK) return [];
  const { data } = await api.get<FleetChecklistTemplate[]>(
    "/fleet-checklists/templates",
    { params: tipo ? { tipo } : undefined },
  );
  return data;
}

export interface CreateTemplateInput {
  tipo: FleetChecklistTipo;
  nome: string;
  periodicidadeDias?: number;
  itens: {
    codigo: string;
    titulo: string;
    bloqueante?: boolean;
    obrigatorio?: boolean;
    tipoCampo?: FleetChecklistTipoCampo;
    descricao?: string;
    unidade?: string;
    valorMeta?: number;
  }[];
}

export async function createTemplateAdmin(
  input: CreateTemplateInput,
): Promise<FleetChecklistTemplate> {
  const { data } = await api.post<FleetChecklistTemplate>(
    "/fleet-checklists/templates",
    input,
  );
  return data;
}

/** Edita um template existente — `PATCH /fleet-checklists/templates/:id`. */
export async function updateTemplateAdmin(
  id: string,
  input: Partial<CreateTemplateInput> & { ativo?: boolean },
): Promise<FleetChecklistTemplate> {
  const { data } = await api.patch<FleetChecklistTemplate>(
    `/fleet-checklists/templates/${id}`,
    input,
  );
  return data;
}

// ───────────────────────── Chegadas ─────────────────────────

/**
 * Checklists EM ANDAMENTO dos motoristas (controller ADM). Cada item abre o
 * checklist (`/checklist/[id]`) para a Frota "fazer junto".
 */
export async function listChecklistsEmAndamento(): Promise<FleetChecklist[]> {
  if (MOCK) return [];
  const { data } = await api.get<FleetChecklist[]>("/fleet-checklists", {
    params: { status: "EM_ANDAMENTO" },
  });
  return data;
}
