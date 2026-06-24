"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChecklistFill } from "@/components/checklist/ChecklistFill";
import {
  createChecklist,
  listChecklistTemplates,
  listDriverVehicles,
} from "@/services/checklistService";
import type {
  DriverVehicle,
  FleetChecklist,
  FleetChecklistTemplate,
} from "@/types/checklist.types";

export default function NovoChecklistPage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [templates, setTemplates] = useState<FleetChecklistTemplate[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [search, setSearch] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [km, setKm] = useState("");

  const [checklist, setChecklist] = useState<FleetChecklist | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listDriverVehicles(), listChecklistTemplates()])
      .then(([v, t]) => {
        setVehicles(v);
        setTemplates(t);
        if (t.length === 1) setTemplateId(t[0].id);
      })
      .catch(() => setError("Falha ao carregar veículos/templates."))
      .finally(() => setLoadingRefs(false));
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q
      ? vehicles.filter((v) => v.plate.toUpperCase().includes(q))
      : vehicles.slice(0, 30);
  }, [vehicles, search]);

  async function handleStart() {
    if (!vehicleId || !templateId) return;
    setBusy(true);
    setError(null);
    try {
      const c = await createChecklist({
        vehicleId,
        templateId,
        clientId: uuid(),
        odometer: km ? Number(km) : undefined,
      });
      setChecklist(c);
    } catch {
      setError("Não foi possível iniciar o checklist.");
    } finally {
      setBusy(false);
    }
  }

  if (checklist) {
    return (
      <div className="p-4">
        <Header onBack={() => setChecklist(null)} title="Preencher checklist" />
        <ChecklistFill checklist={checklist} onDone={() => router.push("/")} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Header onBack={() => router.push("/")} title="Novo checklist" />
      {error && <p className="mb-3 text-red-600">{error}</p>}

      {loadingRefs ? (
        <p className="text-text-muted">Carregando…</p>
      ) : (
        <>
          <label className="text-sm text-text-muted">Tipo de checklist</label>
          <div className="mb-4 mt-1 flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  templateId === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-muted"
                }`}
              >
                {t.nome}
              </button>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-amber-600">
                Nenhum template. Peça à Frota para criar um.
              </p>
            )}
          </div>

          <label className="text-sm text-text-muted">Veículo (placa)</label>
          <Input
            className="mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar placa…"
          />
          <ul className="mt-2 max-h-72 space-y-1 overflow-auto">
            {filteredVehicles.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => setVehicleId(v.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    vehicleId === v.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <span className="font-semibold text-text">{v.plate}</span>
                  <span className="text-xs text-text-muted">
                    {[v.brand, v.model].filter(Boolean).join(" ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <label className="text-sm text-text-muted">Cont/Km (opcional)</label>
            <Input
              inputMode="numeric"
              value={km}
              onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))}
              placeholder="Odômetro atual"
            />
          </div>

          <Button
            className="mt-6 w-full"
            disabled={busy || !vehicleId || !templateId}
            onClick={handleStart}
          >
            {busy ? "Iniciando…" : "Iniciar checklist"}
          </Button>
        </>
      )}
    </div>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="mb-4 flex items-center gap-3 pt-2">
      <button onClick={onBack} className="rounded-lg p-2 hover:bg-surface-muted">
        <ArrowLeft className="h-5 w-5 text-text" />
      </button>
      <h1 className="text-xl font-bold text-text">{title}</h1>
    </header>
  );
}
