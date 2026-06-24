"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listChecklists } from "@/services/checklistService";
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
  CONCLUIDO: "Concluído",
};

export default function HistoricoPage() {
  const router = useRouter();
  const [all, setAll] = useState<FleetChecklist[]>([]);
  const [tipo, setTipo] = useState<FleetChecklistTipo | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listChecklists()
      .then(setAll)
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(
    () => (tipo === "all" ? all : all.filter((c) => c.tipo === tipo)),
    [all, tipo],
  );

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/")} className="rounded-lg p-2 hover:bg-surface-muted">
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">Histórico</h1>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
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

      {loading ? (
        <p className="text-text-muted">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="text-text-muted">Nada por aqui.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/checklist/${c.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{TIPO_LABEL[c.tipo]}</span>
                  <span
                    className={`text-xs font-semibold ${
                      c.status === "CONCLUIDO" ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <p className="text-sm text-text-muted">
                  {new Date(c.createdAt).toLocaleString("pt-BR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
