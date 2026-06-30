import { Link2 } from "lucide-react";
import type { VehicleSetSummary } from "@/services/frotaAdmService";
import {
  ROLE_LABEL,
  conjuntoTitle,
  orderedItems,
  setFleetClass,
} from "@/utils/vehicleSets";

/**
 * Card de um conjunto veicular (cavalo + reboques) — composição empilhada com o
 * papel de cada peça. `renderRight` injeta conteúdo por veículo (status, seleção).
 */
export function ConjuntoCard({
  set,
  renderRight,
}: {
  set: VehicleSetSummary;
  renderRight?: (vehicleId: string) => React.ReactNode;
}) {
  const fleetClass = setFleetClass(set);
  const items = orderedItems(set);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0 text-primary" />
          <p className="truncate font-semibold text-text">{conjuntoTitle(set)}</p>
        </div>
        {fleetClass && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {fleetClass.code}
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {items.map((it) => (
          <li
            key={it.vehicle.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted/40 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-medium text-text">{it.vehicle.plate}</span>
              <span className="rounded bg-border/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                {ROLE_LABEL[it.role]}
              </span>
              {it.vehicle.model && (
                <span className="truncate text-xs text-text-muted">
                  {it.vehicle.model}
                </span>
              )}
            </div>
            {renderRight?.(it.vehicle.id)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cabeçalho de seção ("Conjuntos" / "Veículos avulsos") com contagem. */
export function SectionTitle({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <h3 className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold text-text-muted first:mt-0">
      {label}
      <span className="rounded-full bg-border/60 px-2 py-0.5 text-xs text-text-muted">
        {count}
      </span>
    </h3>
  );
}
