import { useMemo } from "react";
import { Check } from "lucide-react";
import type { VehicleSetSummary } from "@/services/frotaAdmService";
import type { DriverVehicle } from "@/types/checklist.types";
import { matchesSearch } from "@/utils/normalizeSearch";
import { orderedItems, splitConjuntos } from "@/utils/vehicleSets";
import { ConjuntoCard, SectionTitle } from "./ConjuntoCard";

/** id selecionável de um conjunto: a tração presente na lista, ou a 1ª peça. */
function selectableId(
  set: VehicleSetSummary,
  available: Set<string>,
): string | null {
  const items = orderedItems(set);
  const tracao = items.find(
    (it) => it.role === "TRACAO" && available.has(it.vehicle.id),
  );
  if (tracao) return tracao.vehicle.id;
  const first = items.find((it) => available.has(it.vehicle.id));
  return first?.vehicle.id ?? null;
}

/**
 * Seletor de veículo separando "Conjuntos" (cavalo+carreta — seleciona a
 * tração) de "Veículos avulsos". Filtra por `search` (placa/marca/modelo) e
 * agrupa o resultado contra os conjuntos da empresa.
 */
export function VehiclePicker({
  vehicles,
  conjuntos,
  search,
  value,
  onChange,
}: {
  vehicles: DriverVehicle[];
  conjuntos: VehicleSetSummary[];
  search: string;
  value: string;
  onChange: (vehicleId: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim();
    return q
      ? vehicles.filter(
          (v) =>
            matchesSearch(v.plate, q) ||
            matchesSearch(v.brand ?? "", q) ||
            matchesSearch(v.model ?? "", q),
        )
      : vehicles.slice(0, 50);
  }, [vehicles, search]);

  const { conjuntos: cjs, avulsos } = useMemo(
    () => splitConjuntos(filtered, conjuntos),
    [filtered, conjuntos],
  );

  const availableIds = useMemo(
    () => new Set(filtered.map((v) => v.id)),
    [filtered],
  );

  return (
    <div className="mt-2">
      {cjs.length > 0 && (
        <>
          <SectionTitle label="Conjuntos" count={cjs.length} />
          <div className="space-y-2">
            {cjs.map((s) => {
              const pick = selectableId(s, availableIds);
              const selected = s.items.some((it) => it.vehicle.id === value);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!pick}
                  onClick={() => pick && onChange(pick)}
                  className={`block w-full rounded-xl text-left transition ${
                    selected ? "ring-2 ring-primary" : ""
                  } ${pick ? "" : "opacity-60"}`}
                >
                  <ConjuntoCard
                    set={s}
                    renderRight={(vid) =>
                      vid === value ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null
                    }
                  />
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle
        label={cjs.length > 0 ? "Veículos avulsos" : "Veículos"}
        count={avulsos.length}
      />
      <ul className="space-y-1">
        {avulsos.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onChange(v.id)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                value === v.id ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <span className="font-semibold text-text">{v.plate}</span>
              <span className="text-xs text-text-muted">
                {[v.brand, v.model].filter(Boolean).join(" ")}
              </span>
            </button>
          </li>
        ))}
        {avulsos.length === 0 && cjs.length === 0 && (
          <li className="text-sm text-text-muted">Nenhum veículo encontrado.</li>
        )}
      </ul>
    </div>
  );
}
