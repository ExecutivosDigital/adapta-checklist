// Tipos das Macros do motorista (Etapa 5).
// Espelham o backend `adapta-api` (rotas driver-scoped `/driver/macros`).

/**
 * Tipos de macro que o motorista pode passar ao longo da viagem.
 * O backend valida a sequência válida — o app só mostra os botões
 * permitidos a partir do estado atual (vindos de `/proximas`).
 */
export type MacroType =
  | "RECEBIMENTO_VEICULO"
  | "INICIO_VIAGEM"
  | "PARADA"
  | "REFEICAO"
  | "ABASTECIMENTO"
  | "PERNOITE"
  | "CHEGADA"
  | "DESCARGA"
  | "ENGATE"
  | "DESENGATE"
  | "FIM_VIAGEM";

/** Registro de uma macro passada (histórico). */
export interface MacroEntry {
  id: string;
  vehicleId: string;
  tipo: MacroType;
  occurredAt: string;
  latitude?: number | null;
  longitude?: number | null;
  tripId?: string | null;
  notes?: string | null;
  /** UUID gerado no app — idempotência do sync offline. */
  clientId?: string | null;
  /** Marca local: ainda na fila offline, não confirmada pelo back. */
  pending?: boolean;
}

/** Resposta de `GET /driver/macros/proximas`. */
export interface MacrosProximas {
  /** Última macro registrada para o veículo (ou null se nenhuma). */
  last: MacroEntry | null;
  /** Tipos válidos a partir do estado atual. */
  proximas: MacroType[];
}

/** Body de `POST /driver/macros`. */
export interface PassMacroInput {
  vehicleId: string;
  tipo: MacroType;
  occurredAt: string;
  latitude?: number;
  longitude?: number;
  tripId?: string;
  notes?: string;
  /** UUID v4 — idempotência (mesmo clientId não duplica). */
  clientId: string;
}
