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

export type FleetChecklistStatus =
  | "EM_ANDAMENTO"
  | "AGUARDANDO_APROVACAO"
  | "CONCLUIDO"
  | "REPROVADO";

/** Tipo do campo de resposta do item. Itens antigos (sem valor) = BOOLEAN. */
export type FleetChecklistTipoCampo = "BOOLEAN" | "NUMERO" | "TEXTO";

export interface FleetChecklistTemplateItem {
  codigo: string;
  titulo: string;
  /** Se reprovado (NAO_CONFORME) → veículo fica indisponível (MANUTENCAO). */
  bloqueante?: boolean;
  obrigatorio?: boolean;
  /** Tipo do campo. Ausente/`BOOLEAN` = Conforme/Não (comportamento atual). */
  tipoCampo?: FleetChecklistTipoCampo;
  /** Descrição/instrução opcional exibida abaixo do título. */
  descricao?: string | null;
  /** Unidade do valor (ex.: "psi", "L", "mm") — só faz sentido para `NUMERO`. */
  unidade?: string | null;
  /** Valor meta/necessário — só faz sentido para `NUMERO`. */
  valorMeta?: number | null;
}

export interface FleetChecklistTemplate {
  id: string;
  tipo: FleetChecklistTipo;
  nome: string;
  periodicidadeDias: number | null;
  itens: FleetChecklistTemplateItem[];
  /** Checklist recorrente (vale por N dias e precisa ser refeito). */
  recorrente?: boolean;
  /** Validade em dias do checklist concluído (quando `recorrente`). */
  validadeDias?: number | null;
  /** Exigir refazer o checklist antes de cada viagem. */
  exigirAntesViagem?: boolean;
}

export interface FleetChecklistItem {
  id: string;
  codigo: string;
  titulo: string;
  bloqueante: boolean;
  status: FleetChecklistItemStatus;
  observacoes: string | null;
  fotoUrl: string | null;
  /** Tipo do campo. Ausente/`BOOLEAN` = Conforme/Não (comportamento atual). */
  tipoCampo?: FleetChecklistTipoCampo;
  descricao?: string | null;
  unidade?: string | null;
  valorMeta?: number | null;
  /** Valor preenchido pelo motorista (só para `NUMERO`). */
  valorAtual?: number | null;
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
  /**
   * Dados do veículo enriquecidos pelo backend (list/get). Opcional —
   * o backend pode ainda não enviar; nesse caso usa-se `vehicleId` como fallback.
   */
  vehicle?: {
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
  } | null;
  /** Nome do motorista enriquecido pelo backend (list/get). Opcional. */
  motoristaNome?: string | null;
  /**
   * Vigência/recorrência herdada do template (list/get). Opcionais — o backend
   * pode ainda não enviar; trate ausência de forma defensiva.
   */
  validadeDias?: number | null;
  /** ISO da data até a qual o checklist é válido (quando tem validade). */
  validoAte?: string | null;
  /** `true` quando o checklist passou da validade. */
  vencido?: boolean;
  recorrente?: boolean;
  exigirAntesViagem?: boolean;
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
  /** Valor numérico preenchido pelo motorista (item `NUMERO`). */
  valorAtual?: number;
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

/**
 * Identidade do motorista logado resolvida pelo back a partir do CPF do token.
 * Usada para descobrir o `tenantId` que as rotas ADM da Frota exigem em
 * `x-tenant-id`. Endpoint: `GET /driver/me`.
 */
export interface DriverMe {
  companyId: string;
  tenantId: string;
  motorista?: {
    id?: string;
    nome?: string;
    documentNumber?: string;
  } | null;
}

export interface AFazerInput {
  vehicleId: string;
  description: string;
  requesterName?: string;
  voiceTranscript?: string;
}
