import type {
  VehicleRole,
  VehicleSetItem,
  VehicleSetSummary,
} from "@/services/frotaAdmService";

/** Rótulo curto do papel do veículo dentro do conjunto. */
export const ROLE_LABEL: Record<VehicleRole, string> = {
  TRACAO: "Cavalo",
  UNIDADE: "Unidade",
  REBOQUE: "Carreta",
  ENGATE: "Engate",
};

/** Classe de frota do conjunto (override tem prioridade sobre a derivada). */
export function setFleetClass(
  set: VehicleSetSummary,
): { code: string; name: string } | null {
  return set.overrideFleetClass ?? set.derivedFleetClass ?? null;
}

/** Título do conjunto: o `name`, ou as placas das peças concatenadas. */
export function conjuntoTitle(set: VehicleSetSummary): string {
  if (set.name?.trim()) return set.name.trim();
  const plates = [...set.items]
    .sort((a, b) => a.sequence - b.sequence)
    .map((it) => it.vehicle.plate);
  return plates.join(" + ") || "Conjunto";
}

/** Itens do conjunto ordenados pela sequência da composição. */
export function orderedItems(set: VehicleSetSummary): VehicleSetItem[] {
  return [...set.items].sort((a, b) => a.sequence - b.sequence);
}

/**
 * Separa uma lista de veículos entre os que compõem algum conjunto e os
 * avulsos. Só considera "relevantes" os conjuntos que tocam ao menos um veículo
 * da lista (evita mostrar conjuntos sem nenhuma peça visível ao usuário).
 */
export function splitConjuntos<T extends { id: string }>(
  items: T[],
  sets: VehicleSetSummary[],
): {
  conjuntos: VehicleSetSummary[];
  avulsos: T[];
  /** Acesso rápido ao item original (status/seleção) por vehicleId. */
  byVehicleId: Map<string, T>;
} {
  const byVehicleId = new Map(items.map((i) => [i.id, i]));
  const conjuntos = sets.filter((s) =>
    s.items.some((it) => byVehicleId.has(it.vehicle.id)),
  );
  const memberIds = new Set(
    conjuntos.flatMap((s) => s.items.map((it) => it.vehicle.id)),
  );
  const avulsos = items.filter((i) => !memberIds.has(i.id));
  return { conjuntos, avulsos, byVehicleId };
}

/** Mapa vehicleId → conjunto, para anotar telas que listam por veículo. */
export function setByVehicleId(
  sets: VehicleSetSummary[],
): Map<string, VehicleSetSummary> {
  const map = new Map<string, VehicleSetSummary>();
  for (const s of sets) {
    for (const it of s.items) map.set(it.vehicle.id, s);
  }
  return map;
}
