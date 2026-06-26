/**
 * ETAPA 7 (T7.2) — Gastos da viagem e acerto do motorista.
 *
 * Tipos espelham as rotas driver do monolito:
 *  - POST /driver/expenses
 *  - GET  /driver/expenses?tripId
 *  - GET  /driver/settlement/atual
 */

/**
 * Tipo do gasto. Regra de acerto:
 *  - DIARIA: adiantamento/diária — NÃO desconta do saldo do motorista.
 *  - AJUDANTE: pagamento a ajudante — desconta.
 *  - COM_COMPROVANTE: gasto com comprovante anexado — desconta (se a foto faltar,
 *    o backend trata como sem comprovante e desconta do motorista).
 *  - OUTRO: outros — desconta.
 */
export type ExpenseTipo = "DIARIA" | "AJUDANTE" | "COM_COMPROVANTE" | "OUTRO";

export interface CreateExpenseInput {
  tipo: ExpenseTipo;
  /** Valor em reais (number, ex.: 123.45). */
  valor: number;
  /** Data do gasto (ISO `YYYY-MM-DD`). */
  data: string;
  tripId?: string;
  comprovanteUrl?: string;
  notes?: string;
  /** UUID gerado no cliente para reconciliar o lançamento otimista com o servidor. */
  clientId?: string;
}

export interface DriverExpense {
  id: string;
  tipo: ExpenseTipo;
  valor: number;
  data: string;
  tripId?: string | null;
  comprovanteUrl?: string | null;
  notes?: string | null;
  /** Eco do clientId enviado no lançamento (quando o back persiste). */
  clientId?: string | null;
  /** Se este gasto desconta do saldo do motorista. */
  desconta?: boolean;
  createdAt?: string;
  /** Marcador local: lançamento ainda na fila offline (não confirmado). */
  pending?: boolean;
}

/** Agrupamento de gastos por viagem dentro do acerto atual. */
export interface SettlementTripGroup {
  tripId: string | null;
  /** Rótulo amigável da viagem (origem → destino, ou "Sem viagem"). */
  tripLabel?: string;
  /** Total que desconta do saldo neste grupo. */
  totalDesconta: number;
  /** Total que NÃO desconta (diárias/adiantamentos). */
  totalNaoDesconta: number;
  expenses: DriverExpense[];
}

export interface DriverSettlement {
  /** Total de gastos em aberto (somatório geral). */
  totalGastos: number;
  /** Total que desconta do saldo. */
  totalDesconta: number;
  /** Total que não desconta (diárias). */
  totalNaoDesconta: number;
  /** Saldo parcial do acerto (positivo = a receber; negativo = a pagar). */
  saldoParcial: number;
  /** Gastos agrupados por viagem. */
  porViagem: SettlementTripGroup[];
}
