import { api } from "@/lib/api";

/**
 * T3.2 — Aderência (calendário do diário) + Status de calibragem — lado ADM.
 *
 * Endpoints ADM do monolito (`adapta-api`, módulo tms/fleet-checklists). O
 * `x-tenant-id` é resolvido/injetado automaticamente pelo axios `api`
 * (interceptor em `src/lib/api.ts`, via `GET /driver/me`). Se algum dia for
 * preciso o tenant explícito aqui, chamar `GET /driver/me`
 * (`{ companyId, tenantId, motorista }`) num hook próprio.
 *
 * O backend está sendo construído em paralelo, então os parsers abaixo blindam
 * a UI contra payload vazio/parcial: nunca confiamos em campos virem todos.
 */
const BASE = "/fleet-checklists";

// ── Tipos do contrato (T3.2) ──

export interface AdherenceDay {
  date: string;
  feito: boolean;
  checklistId?: string;
}

export interface AdherenceRow {
  vehicleId: string;
  plate: string;
  motorista?: string;
  days: AdherenceDay[];
  feitos: number;
  total: number;
}

export interface AdherenceResponse {
  range: { inicio: string; fim: string };
  rows: AdherenceRow[];
}

export interface AdherenceParams {
  inicio: string;
  fim: string;
  vehicleId?: string;
  motoristaDoc?: string;
}

export type CalibrationStatus = "EM_DIA" | "VENCENDO" | "VENCIDO";

export interface CalibrationItem {
  vehicleId: string;
  plate: string;
  ultimaCalibragem?: string;
  periodicidadeDias: number;
  diasDesde?: number;
  status: CalibrationStatus;
}

// ── Parsers defensivos ──

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseDay(raw: unknown): AdherenceDay {
  const d = (raw ?? {}) as Record<string, unknown>;
  return {
    date: str(d.date) ?? "",
    feito: d.feito === true,
    checklistId: str(d.checklistId),
  };
}

function parseRow(raw: unknown): AdherenceRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  const days = Array.isArray(r.days) ? r.days.map(parseDay) : [];
  const feitos =
    r.feitos != null ? num(r.feitos) : days.filter((d) => d.feito).length;
  const total = r.total != null ? num(r.total) : days.length;
  return {
    vehicleId: str(r.vehicleId) ?? "",
    plate: str(r.plate) ?? "—",
    motorista: str(r.motorista),
    days,
    feitos,
    total,
  };
}

function parseAdherence(raw: unknown): AdherenceResponse {
  const r = (raw ?? {}) as Record<string, unknown>;
  const range = (r.range ?? {}) as Record<string, unknown>;
  return {
    range: { inicio: str(range.inicio) ?? "", fim: str(range.fim) ?? "" },
    rows: Array.isArray(r.rows) ? r.rows.map(parseRow) : [],
  };
}

const VALID_STATUS: CalibrationStatus[] = ["EM_DIA", "VENCENDO", "VENCIDO"];

function parseCalibration(raw: unknown): CalibrationItem {
  const c = (raw ?? {}) as Record<string, unknown>;
  const status = VALID_STATUS.includes(c.status as CalibrationStatus)
    ? (c.status as CalibrationStatus)
    : "EM_DIA";
  return {
    vehicleId: str(c.vehicleId) ?? "",
    plate: str(c.plate) ?? "—",
    ultimaCalibragem: str(c.ultimaCalibragem),
    periodicidadeDias: num(c.periodicidadeDias, 10),
    diasDesde: typeof c.diasDesde === "number" ? c.diasDesde : undefined,
    status,
  };
}

// ── Chamadas ──

/** Calendário de aderência do checklist DIÁRIO por veículo/motorista. */
export async function getAdherence(
  params: AdherenceParams,
): Promise<AdherenceResponse> {
  const { data } = await api.get(`${BASE}/adherence`, { params });
  return parseAdherence(data);
}

/** Status de calibragem (a cada `periodicidadeDias`, padrão 10). */
export async function getCalibrationStatus(): Promise<CalibrationItem[]> {
  const { data } = await api.get(`${BASE}/calibration-status`);
  return Array.isArray(data) ? data.map(parseCalibration) : [];
}
