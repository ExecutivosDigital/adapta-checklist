"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listChecklists } from "@/services/checklistService";
import { matchesSearch } from "@/utils/normalizeSearch";
import type {
  FleetChecklist,
  FleetChecklistStatus,
  FleetChecklistTipo,
} from "@/types/checklist.types";

const TIPO_LABEL: Record<FleetChecklistTipo, string> = {
  DIARIO: "Diário",
  INSPECAO_TOTAL: "Inspeção total",
  CALIBRAGEM: "Calibragem",
  OUTRO: "Outro",
};
const TIPOS: (FleetChecklistTipo | "all")[] = ["all", "DIARIO", "INSPECAO_TOTAL", "CALIBRAGEM"];
const STATUS_LABEL: Record<FleetChecklistStatus, string> = {
  EM_ANDAMENTO: "Em andamento",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  CONCLUIDO: "Concluído",
  REPROVADO: "Reprovado",
};
const STATUS_VARIANT: Record<
  FleetChecklistStatus,
  "warning" | "info" | "success" | "destructive"
> = {
  EM_ANDAMENTO: "warning",
  AGUARDANDO_APROVACAO: "info",
  CONCLUIDO: "success",
  REPROVADO: "destructive",
};
const STATUS_FILTERS: (FleetChecklistStatus | "all")[] = [
  "all",
  "CONCLUIDO",
  "AGUARDANDO_APROVACAO",
  "EM_ANDAMENTO",
  "REPROVADO",
];
const STATUS_FILTER_LABEL: Record<FleetChecklistStatus | "all", string> = {
  all: "Todos",
  CONCLUIDO: "Concluído",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  EM_ANDAMENTO: "Em andamento",
  REPROVADO: "Reprovado",
};

/** Rótulo do veículo: placa (+ modelo) do `vehicle`, com fallback no `vehicleId`. */
function vehicleLabel(c: FleetChecklist): { plate: string; model: string | null } {
  if (c.vehicle?.plate) {
    return { plate: c.vehicle.plate, model: c.vehicle.model ?? null };
  }
  return { plate: c.vehicleId, model: null };
}

/** Data local (YYYY-MM-DD) de um ISO, no fuso do dispositivo — base do filtro por dia. */
function localDay(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function HistoricoPage() {
  const router = useRouter();
  const [all, setAll] = useState<FleetChecklist[]>([]);
  const [tipo, setTipo] = useState<FleetChecklistTipo | "all">("all");
  const [status, setStatus] = useState<FleetChecklistStatus | "all">("all");
  const [vehicle, setVehicle] = useState<string>("all");
  const [motorista, setMotorista] = useState<string>("all");
  const [day, setDay] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChecklists()
      .then(setAll)
      .finally(() => setLoading(false));
  }, []);

  /** Veículos distintos presentes no histórico, ordenados por placa. */
  const vehicleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of all) {
      map.set(c.vehicleId, c.vehicle?.plate ?? c.vehicleId);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [all]);

  /** Motoristas distintos presentes no histórico, ordenados por nome. */
  const motoristaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of all) {
      if (c.motoristaNome?.trim()) set.add(c.motoristaNome.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [all]);

  const list = useMemo(() => {
    return [...all]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((c) => tipo === "all" || c.tipo === tipo)
      .filter((c) => status === "all" || c.status === status)
      .filter((c) => vehicle === "all" || c.vehicleId === vehicle)
      .filter((c) => motorista === "all" || c.motoristaNome === motorista)
      .filter((c) => !day || localDay(c.createdAt) === day)
      .filter((c) => {
        if (!query.trim()) return true;
        const haystack = [
          c.vehicle?.plate ?? c.vehicleId,
          c.vehicle?.model ?? "",
          c.motoristaNome ?? "",
        ].join(" ");
        return matchesSearch(haystack, query);
      });
  }, [all, tipo, status, vehicle, motorista, day, query]);

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/")} className="rounded-lg p-2 hover:bg-surface-muted">
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">Histórico</h1>
      </header>

      {/* Busca por placa / motorista */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por placa ou motorista"
          className="pl-9"
        />
      </div>

      {/* Filtro por dia, veículo e motorista */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Dia</label>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Veículo</label>
          <select
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary"
          >
            <option value="all">Todos</option>
            {vehicleOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Motorista</label>
          <select
            value={motorista}
            onChange={(e) => setMotorista(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary"
          >
            <option value="all">Todos</option>
            {motoristaOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      {day && (
        <button
          onClick={() => setDay("")}
          className="mb-3 text-xs font-medium text-primary hover:underline"
        >
          Limpar dia
        </button>
      )}

      {/* Filtro por tipo */}
      <div className="mb-2 flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted"
            }`}
          >
            {t === "all" ? "Todos" : TIPO_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Filtro por status */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              status === s ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted"
            }`}
          >
            {STATUS_FILTER_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-muted">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="text-text-muted">Nada por aqui.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const veh = vehicleLabel(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/checklist/${c.id}`}
                  className="block rounded-xl border border-border bg-surface p-4 transition hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">
                        {c.motoristaNome ?? "—"}
                      </p>
                      <p className="text-sm text-text-muted">
                        {veh.plate}
                        {veh.model ? ` · ${veh.model}` : ""} · {TIPO_LABEL[c.tipo]}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANT[c.status]}
                      className="shrink-0"
                    >
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
