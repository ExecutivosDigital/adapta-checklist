"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Gauge,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCalibrationStatus,
  type CalibrationItem,
  type CalibrationStatus,
} from "@/services/fleetAdherenceService";

const STATUS_META: Record<
  CalibrationStatus,
  { label: string; badge: string; card: string; icon: typeof TriangleAlert }
> = {
  VENCIDO: {
    label: "Vencido",
    badge: "bg-red-100 text-red-700",
    card: "border-red-300 bg-red-50",
    icon: ShieldAlert,
  },
  VENCENDO: {
    label: "Vencendo",
    badge: "bg-amber-100 text-amber-700",
    card: "border-amber-300 bg-amber-50",
    icon: TriangleAlert,
  },
  EM_DIA: {
    label: "Em dia",
    badge: "bg-green-100 text-green-700",
    card: "border-border bg-surface",
    icon: CheckCircle2,
  },
};

// Ordena os mais críticos primeiro.
const STATUS_ORDER: Record<CalibrationStatus, number> = {
  VENCIDO: 0,
  VENCENDO: 1,
  EM_DIA: 2,
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function CalibragemPage() {
  const router = useRouter();
  const [items, setItems] = useState<CalibrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCalibrationStatus()
      .then(setItems)
      .catch(() =>
        setError("Não foi possível carregar o status de calibragem."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
      ),
    [items],
  );

  const alertas = useMemo(
    () => sorted.filter((c) => c.status !== "EM_DIA"),
    [sorted],
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-2 hover:bg-surface-muted"
        >
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text">Calibragem de pneus</h1>
          <p className="text-xs text-text-muted">
            Alerta por veículo (periodicidade padrão: 10 dias).
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-text-muted">Carregando status…</p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={load}>
            Tentar de novo
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center">
          <Gauge className="mb-3 h-10 w-10 text-text-muted" />
          <p className="font-semibold text-text">Nenhum veículo</p>
          <p className="text-sm text-text-muted">
            Sem dados de calibragem no momento.
          </p>
        </div>
      ) : (
        <>
          {/* Resumo de alertas */}
          {alertas.length > 0 ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <TriangleAlert className="h-6 w-6 shrink-0 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                {alertas.length}{" "}
                {alertas.length === 1
                  ? "veículo precisa"
                  : "veículos precisam"}{" "}
                de atenção na calibragem.
              </p>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-green-300 bg-green-50 p-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Todos os veículos estão em dia. ✅
              </p>
            </div>
          )}

          <ul className="space-y-2">
            {sorted.map((c) => {
              const meta = STATUS_META[c.status];
              const Icon = meta.icon;
              return (
                <li
                  key={`${c.vehicleId}-${c.plate}`}
                  className={`rounded-2xl border p-4 ${meta.card}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-text-muted" />
                      <div>
                        <p className="font-semibold text-text">{c.plate}</p>
                        <p className="text-xs text-text-muted">
                          Última: {fmtDate(c.ultimaCalibragem)}
                          {c.diasDesde != null
                            ? ` · há ${c.diasDesde} ${c.diasDesde === 1 ? "dia" : "dias"}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Periodicidade: a cada {c.periodicidadeDias} dias
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
