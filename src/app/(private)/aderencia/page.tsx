"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Filter, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdherence,
  type AdherenceRow,
} from "@/services/fleetAdherenceService";

/** YYYY-MM-DD em horário local (sem pular dia por timezone). */
function toIso(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function defaultRange(): { inicio: string; fim: string } {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 29); // ~30 dias
  return { inicio: toIso(inicio), fim: toIso(fim) };
}

function dayLabel(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return String(d.getDate());
}

export default function AderenciaPage() {
  const router = useRouter();
  const initial = useMemo(defaultRange, []);
  const [inicio, setInicio] = useState(initial.inicio);
  const [fim, setFim] = useState(initial.fim);
  const [vehicleId, setVehicleId] = useState("");
  const [motoristaDoc, setMotoristaDoc] = useState("");

  const [rows, setRows] = useState<AdherenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!inicio || !fim) return;
    setLoading(true);
    setError(null);
    getAdherence({
      inicio,
      fim,
      vehicleId: vehicleId.trim() || undefined,
      motoristaDoc: motoristaDoc.trim() || undefined,
    })
      .then((res) => setRows(res.rows))
      .catch(() =>
        setError("Não foi possível carregar a aderência. Tente novamente."),
      )
      .finally(() => setLoading(false));
  }, [inicio, fim, vehicleId, motoristaDoc]);

  useEffect(() => {
    load();
    // Só na carga inicial; depois é via botão "Aplicar".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-2 hover:bg-surface-muted"
        >
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text">Aderência do diário</h1>
          <p className="text-xs text-text-muted">
            Dias em que o checklist diário foi feito, por veículo/motorista.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-muted">Início</label>
            <Input
              type="date"
              className="mt-1"
              value={inicio}
              max={fim || undefined}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Fim</label>
            <Input
              type="date"
              className="mt-1"
              value={fim}
              min={inicio || undefined}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">
              Veículo (id) — opcional
            </label>
            <Input
              className="mt-1"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="Filtrar por veículo"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">
              Motorista (CPF) — opcional
            </label>
            <Input
              className="mt-1"
              value={motoristaDoc}
              onChange={(e) => setMotoristaDoc(e.target.value)}
              placeholder="Filtrar por CPF"
            />
          </div>
        </div>
        <Button
          className="mt-3 w-full"
          onClick={load}
          disabled={loading || !inicio || !fim}
        >
          <Filter className="mr-2 h-4 w-4" />
          Aplicar período
        </Button>
      </div>

      {/* Estados */}
      {loading ? (
        <p className="text-text-muted">Carregando aderência…</p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">{error}</p>
          <Button variant="outline" className="mt-3" onClick={load}>
            Tentar de novo
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center">
          <Truck className="mb-3 h-10 w-10 text-text-muted" />
          <p className="font-semibold text-text">Sem dados no período</p>
          <p className="text-sm text-text-muted">
            Ajuste o período ou os filtros acima.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <AderenciaRowCard key={`${row.vehicleId}-${row.plate}`} row={row} />
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Verde = diário feito; vermelho = faltou. A Frota usa isso pra cobrar a
        aderência.
      </p>
    </div>
  );
}

function AderenciaRowCard({ row }: { row: AdherenceRow }) {
  const pct =
    row.total > 0 ? Math.round((row.feitos / row.total) * 100) : 0;
  const pctColor =
    pct >= 90
      ? "text-green-600"
      : pct >= 60
        ? "text-amber-600"
        : "text-red-600";

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-text-muted" />
          <div>
            <p className="font-semibold text-text">{row.plate}</p>
            {row.motorista && (
              <p className="text-xs text-text-muted">{row.motorista}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${pctColor}`}>
            {row.feitos}/{row.total}
          </p>
          <p className="text-xs text-text-muted">fez {pct}% dos dias</p>
        </div>
      </div>

      {row.days.length === 0 ? (
        <p className="text-xs text-text-muted">Sem dias no período.</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {row.days.map((d, i) => (
            <div
              key={d.date || i}
              title={`${d.date}${d.feito ? " · feito" : " · faltou"}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-md border text-[10px] ${
                d.feito
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              <span>{dayLabel(d.date)}</span>
              {d.feito ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
