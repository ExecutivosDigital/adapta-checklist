// Tipos do Checklist de Rotina da Frota (Mundo 1: disponibilidade).
// Espelham o backend `adapta-api` (módulo tms/fleet-checklists).

export type FleetChecklistTipo =
  | "DIARIO"
  | "INSPECAO_TOTAL"
  | "CALIBRAGEM"
  | "OUTRO";

export type FleetChecklistItemStatus =
  | "PENDENTE"
  | "CONFORME"
  | "NAO_CONFORME"
  | "NAO_APLICAVEL";

export type FleetChecklistStatus = "EM_ANDAMENTO" | "CONCLUIDO";

export interface FleetChecklistTemplateItem {
  codigo: string;
  titulo: string;
  /** Se reprovado (NAO_CONFORME) → veículo fica indisponível (MANUTENCAO). */
  bloqueante?: boolean;
  obrigatorio?: boolean;
}

export interface FleetChecklistTemplate {
  id: string;
  tipo: FleetChecklistTipo;
  nome: string;
  periodicidadeDias: number | null;
  itens: FleetChecklistTemplateItem[];
}

export interface FleetChecklistItem {
  id: string;
  codigo: string;
  titulo: string;
  bloqueante: boolean;
  status: FleetChecklistItemStatus;
  observacoes: string | null;
  fotoUrl: string | null;
}

export interface FleetChecklist {
  id: string;
  vehicleId: string;
  tipo: FleetChecklistTipo;
  status: FleetChecklistStatus;
  odometer: number | null;
  concluidoEm: string | null;
  createdAt: string;
  itens: FleetChecklistItem[];
}

// ── Inputs ──

export interface CreateChecklistInput {
  vehicleId: string;
  templateId: string;
  /** UUID gerado no app — idempotência do sync offline. */
  clientId?: string;
  odometer?: number;
}

export interface SaveChecklistItemInput {
  id: string;
  status: FleetChecklistItemStatus;
  observacoes?: string;
  fotoUrl?: string;
}

export interface SaveChecklistItemsInput {
  itens?: SaveChecklistItemInput[];
  /** Cont/Km → atualiza o odômetro do veículo (só sobe). */
  odometer?: number;
}

export interface ConcludeChecklistResult {
  id: string;
  status: FleetChecklistStatus;
  bloqueantes: number;
  pendencias: number;
  veiculoIndisponivel: boolean;
}

export interface DriverVehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  type: string;
  status: string;
  currentOdometer: number | null;
}

export interface AFazerInput {
  vehicleId: string;
  description: string;
  requesterName?: string;
  voiceTranscript?: string;
}
