import type { MacroEntry, MacroType } from "@/types/macros.types";

/**
 * Dados/estado de DEMO pra validar a UX das macros sem backend/auth/banco.
 * Ativado por `NEXT_PUBLIC_MOCK_DATA=1` (mesma flag do checklist).
 *
 * Em MOCK, o "estado" das macros vive em memória aqui — ao passar uma macro
 * gravamos no array e recalculamos as próximas válidas, espelhando a máquina
 * de estados do backend o suficiente pra exercitar a tela.
 */
export const MOCK = process.env.NEXT_PUBLIC_MOCK_DATA === "1";

/**
 * Máquina de estados simplificada (espelha a regra do back): dado o tipo da
 * última macro, quais tipos podem vir a seguir. Sem nenhuma macro ainda, só
 * `RECEBIMENTO_VEICULO` está liberada.
 */
const TRANSITIONS: Record<MacroType, MacroType[]> = {
  RECEBIMENTO_VEICULO: ["ENGATE", "INICIO_VIAGEM"],
  ENGATE: ["INICIO_VIAGEM"],
  INICIO_VIAGEM: [
    "PARADA",
    "REFEICAO",
    "ABASTECIMENTO",
    "PERNOITE",
    "CHEGADA",
  ],
  PARADA: ["INICIO_VIAGEM", "REFEICAO", "ABASTECIMENTO", "PERNOITE", "CHEGADA"],
  REFEICAO: ["INICIO_VIAGEM", "PARADA", "ABASTECIMENTO", "PERNOITE", "CHEGADA"],
  ABASTECIMENTO: ["INICIO_VIAGEM", "PARADA", "REFEICAO", "PERNOITE", "CHEGADA"],
  PERNOITE: ["INICIO_VIAGEM", "PARADA", "REFEICAO", "ABASTECIMENTO", "CHEGADA"],
  CHEGADA: ["DESCARGA", "DESENGATE"],
  DESCARGA: ["DESENGATE", "FIM_VIAGEM"],
  DESENGATE: ["FIM_VIAGEM"],
  FIM_VIAGEM: ["RECEBIMENTO_VEICULO"],
};

const FIRST: MacroType[] = ["RECEBIMENTO_VEICULO"];

/**
 * Próximos tipos válidos a partir de um tipo de macro específico. Usado pelo
 * app pra recalcular os botões OTIMISTICAMENTE quando offline (sem rede pra
 * consultar `/proximas`). Espelha a máquina de estados do backend.
 */
export function proximasFromType(tipo: MacroType): MacroType[] {
  return TRANSITIONS[tipo] ?? FIRST;
}

/** Estado em memória: histórico por veículo. */
const mockHistory: Record<string, MacroEntry[]> = {};

function sorted(list: MacroEntry[]): MacroEntry[] {
  return [...list].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
}

export function mockListHistory(vehicleId: string): MacroEntry[] {
  return sorted(mockHistory[vehicleId] ?? []);
}

export function mockLast(vehicleId: string): MacroEntry | null {
  const list = sorted(mockHistory[vehicleId] ?? []);
  return list.length ? list[list.length - 1] : null;
}

/** Próximos tipos válidos a partir do estado atual do veículo. */
export function mockProximas(vehicleId: string): MacroType[] {
  const last = mockLast(vehicleId);
  if (!last) return FIRST;
  return proximasFromType(last.tipo);
}

/** Grava uma macro no estado mock (idempotente por clientId). */
export function mockPass(entry: MacroEntry): MacroEntry {
  const list = mockHistory[entry.vehicleId] ?? [];
  if (entry.clientId && list.some((m) => m.clientId === entry.clientId)) {
    return list.find((m) => m.clientId === entry.clientId)!;
  }
  list.push(entry);
  mockHistory[entry.vehicleId] = list;
  return entry;
}
