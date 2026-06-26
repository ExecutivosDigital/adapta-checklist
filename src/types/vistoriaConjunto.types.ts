// Tipos da Vistoria do Conjunto (cavalo + carreta) — lado MOTORISTA (Etapa 8 / T8.2).
// Espelham o contrato das rotas driver-scoped do monolito (`/driver/vistoria-conjunto`).

/** Status de um item da vistoria manual do conjunto. */
export type VistoriaItemStatus = "CONFORME" | "NAO_CONFORME" | "NAO_APLICAVEL";

/** Status do checklist da gerenciadora (read-only — registrado no GR). */
export type GerenciadoraStatus =
  | "APROVADO"
  | "REPROVADO"
  | "PENDENTE"
  | "VENCIDO";

/** Identifica o conjunto: por `vehicleSetId` OU pelo par de placas. */
export interface ConjuntoRef {
  vehicleSetId?: string | null;
  cavalo: string;
  carreta: string;
}

/** Última vistoria manual registrada do conjunto (ou null). */
export interface UltimaVistoria {
  id: string;
  data: string; // ISO
  status: string;
}

/** Status do checklist da gerenciadora (somente leitura no app). */
export interface GerenciadoraInfo {
  status: GerenciadoraStatus | string;
  validade?: string | null; // ISO
}

/** Resposta de `GET /driver/vistoria-conjunto`. */
export interface VistoriaConjuntoStatus {
  conjunto: ConjuntoRef;
  vistoriaValida: boolean;
  ultimaVistoria: UltimaVistoria | null;
  gerenciadora: GerenciadoraInfo | null;
}

/** Catálogo de itens a vistoriar (código + título legível). */
export interface VistoriaItemDef {
  codigo: string;
  titulo: string;
}

/** Item respondido na vistoria manual. */
export interface VistoriaItemResposta {
  codigo: string;
  titulo: string;
  status: VistoriaItemStatus;
  observacao?: string;
}

/** Body de `POST /driver/vistoria-conjunto/confirmar`. */
export interface ConfirmarVistoriaInput {
  vehicleSetId?: string | null;
  cavalo?: string;
  carreta?: string;
  itens: VistoriaItemResposta[];
  /** UUID v4 — idempotência do sync offline. */
  clientId: string;
}

/** Parâmetros de consulta de `GET /driver/vistoria-conjunto`. */
export interface VistoriaConjuntoQuery {
  vehicleSetId?: string;
  cavalo?: string;
  carreta?: string;
}
