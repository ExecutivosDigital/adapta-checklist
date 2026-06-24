import { v4 as uuid } from "uuid";
import type {
  DriverVehicle,
  FleetChecklist,
  FleetChecklistTemplate,
} from "@/types/checklist.types";

/**
 * Dados de DEMO/MOCK pra validar a UX sem backend/auth/banco.
 * Ativado por `NEXT_PUBLIC_MOCK_DATA=1` (ver checklistService.ts e AuthContext.tsx).
 */
export const MOCK = process.env.NEXT_PUBLIC_MOCK_DATA === "1";

export const MOCK_TEMPLATES: FleetChecklistTemplate[] = [
  {
    id: "tpl-diario",
    tipo: "DIARIO",
    nome: "Diário",
    periodicidadeDias: 1,
    itens: [
      { codigo: "AGUA", titulo: "Nível de água", bloqueante: true },
      { codigo: "OLEO", titulo: "Nível de óleo", bloqueante: true },
      { codigo: "PNEUS", titulo: "Pneus (calibragem/estado)", bloqueante: true },
      { codigo: "LUZ", titulo: "Iluminação / lanternas", bloqueante: false },
    ],
  },
  {
    id: "tpl-inspecao",
    tipo: "INSPECAO_TOTAL",
    nome: "Inspeção total",
    periodicidadeDias: null,
    itens: [
      { codigo: "FREIOS", titulo: "Freios", bloqueante: true },
      { codigo: "LONA", titulo: "Lona de freio", bloqueante: true },
      { codigo: "FAROL", titulo: "Faróis", bloqueante: false },
      { codigo: "RETRO", titulo: "Retrovisores", bloqueante: false },
      { codigo: "ESTEPE", titulo: "Estepe", bloqueante: false },
    ],
  },
  {
    id: "tpl-calibragem",
    tipo: "CALIBRAGEM",
    nome: "Calibragem de pneu",
    periodicidadeDias: 10,
    itens: [
      { codigo: "DIANT", titulo: "Pressão dianteiros", bloqueante: false },
      { codigo: "TRAS", titulo: "Pressão traseiros", bloqueante: false },
    ],
  },
];

export const MOCK_VEHICLES: DriverVehicle[] = [
  { id: "veh-1", plate: "KAF2D34", brand: "Scania", model: "R450", type: "TRUCK", status: "DISPONIVEL", currentOdometer: 233443 },
  { id: "veh-2", plate: "MGY3388", brand: "Randon", model: "Carreta SR", type: "TRAILER", status: "DISPONIVEL", currentOdometer: null },
  { id: "veh-3", plate: "AVC9F66", brand: "Volvo", model: "FH540", type: "TRUCK", status: "EM_VIAGEM", currentOdometer: 410200 },
];

export const MOCK_CHECKLISTS: FleetChecklist[] = [
  {
    id: "chk-1",
    vehicleId: "veh-1",
    tipo: "DIARIO",
    status: "CONCLUIDO",
    odometer: 233443,
    concluidoEm: "2026-06-24T09:10:00.000Z",
    createdAt: "2026-06-24T09:00:00.000Z",
    itens: [],
  },
  {
    id: "chk-2",
    vehicleId: "veh-3",
    tipo: "INSPECAO_TOTAL",
    status: "EM_ANDAMENTO",
    odometer: null,
    concluidoEm: null,
    createdAt: "2026-06-24T11:30:00.000Z",
    itens: [],
  },
  // Checklists "abertos" pras chegadas (Frota faz junto do motorista).
  {
    id: "chk-chegada-1",
    vehicleId: "veh-1",
    tipo: "DIARIO",
    status: "EM_ANDAMENTO",
    odometer: 233443,
    concluidoEm: null,
    createdAt: "2026-06-24T08:40:00.000Z",
    itens: [],
  },
  {
    id: "chk-chegada-2",
    vehicleId: "veh-3",
    tipo: "INSPECAO_TOTAL",
    status: "EM_ANDAMENTO",
    odometer: 410200,
    concluidoEm: null,
    createdAt: "2026-06-24T10:15:00.000Z",
    itens: [],
  },
];

/** Busca um checklist do mock por id (pra tela de detalhe/continuar). */
export function findMockChecklist(id: string): FleetChecklist | undefined {
  const base = MOCK_CHECKLISTS.find((c) => c.id === id);
  if (!base) return undefined;
  // Os checklists de exemplo nascem sem itens; preenche a partir do template do tipo.
  if (base.itens.length > 0) return base;
  const tpl = MOCK_TEMPLATES.find((t) => t.tipo === base.tipo) ?? MOCK_TEMPLATES[0];
  return {
    ...base,
    itens: tpl.itens.map((it, i) => ({
      id: `${base.id}-${it.codigo}`,
      codigo: it.codigo,
      titulo: it.titulo,
      bloqueante: !!it.bloqueante,
      // Concluído → mostra como respondido; em andamento → pendente.
      status: base.status === "CONCLUIDO" ? "CONFORME" : i === 0 ? "CONFORME" : "PENDENTE",
      observacoes: null,
      fotoUrl: null,
    })),
  };
}

// ── Calendário de aderência do diário (~22 dias úteis) ──
export interface DiaAderencia {
  date: string; // ISO (YYYY-MM-DD)
  feito: boolean;
}
export const MOCK_ADERENCIA_DIARIO: DiaAderencia[] = Array.from({ length: 22 }).map(
  (_, i) => {
    const d = new Date(2026, 5, 24 - (21 - i)); // jun/2026, 22 dias até 24/06
    const iso = d.toISOString().slice(0, 10);
    // Demo: faltou em alguns dias pra mostrar a "não-aderência".
    const feito = ![3, 4, 11, 18].includes(i);
    return { date: iso, feito };
  },
);

// ── Alerta de calibragem (a cada 10 dias) ──
export interface AlertaCalibragem {
  plate: string;
  ultima: string; // ISO date
  diasDesde: number;
}
export const MOCK_CALIBRAGEM: AlertaCalibragem[] = [
  { plate: "KAF2D34", ultima: "2026-06-12", diasDesde: 12 }, // vencida (>10)
  { plate: "AVC9F66", ultima: "2026-06-17", diasDesde: 7 },
];

/** Monta um checklist novo (com itens) a partir de um template — usado no /novo. */
export function buildMockChecklist(
  templateId: string,
  vehicleId: string,
): FleetChecklist {
  const tpl =
    MOCK_TEMPLATES.find((t) => t.id === templateId) ?? MOCK_TEMPLATES[0];
  return {
    id: uuid(),
    vehicleId,
    tipo: tpl.tipo,
    status: "EM_ANDAMENTO",
    odometer: null,
    concluidoEm: null,
    createdAt: new Date().toISOString(),
    itens: tpl.itens.map((it) => ({
      id: uuid(),
      codigo: it.codigo,
      titulo: it.titulo,
      bloqueante: !!it.bloqueante,
      status: "PENDENTE",
      observacoes: null,
      fotoUrl: null,
    })),
  };
}
