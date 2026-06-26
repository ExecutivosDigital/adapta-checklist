"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  History,
  Mic,
  Plus,
  Radio,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { listChecklists } from "@/services/checklistService";
import { MOCK_CALIBRAGEM } from "@/services/checklistMock";
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
const STATUS_LABEL: Record<FleetChecklistStatus, string> = {
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
};

export default function ChecklistsHomePage() {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<FleetChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listChecklists()
      .then((d) => active && setChecklists(d))
      .catch(() => active && setError("Não foi possível carregar (offline?)."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const calibragemVencida = MOCK_CALIBRAGEM.filter((c) => c.diasDesde >= 10);

  return (
    <div className="p-4">
      <header className="mb-4 pt-2">
        <h1 className="text-2xl font-bold text-text">
          Olá{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-text-muted">Seus checklists</p>
      </header>

      {/* Diário de hoje pendente */}
      <Link href="/novo">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          <div className="flex-1">
            <p className="font-semibold text-text">Checklist diário de hoje</p>
            <p className="text-sm text-text-muted">Água, óleo, luz, pneus — pendente</p>
          </div>
          <Plus className="h-5 w-5 text-primary" />
        </div>
      </Link>

      {/* Alerta de calibragem */}
      {calibragemVencida.map((c) => (
        <div
          key={c.plate}
          className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4"
        >
          <TriangleAlert className="h-6 w-6 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-text">Calibragem de pneu — {c.plate}</p>
            <p className="text-sm text-text-muted">
              {c.diasDesde} dias desde a última (limite 10)
            </p>
          </div>
        </div>
      ))}

      {/* Ações */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Link href="/novo">
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Novo checklist
          </Button>
        </Link>
        <Link href="/a-fazer">
          <Button variant="outline" className="w-full">
            <Mic className="mr-2 h-4 w-4" />
            A fazer (voz)
          </Button>
        </Link>
      </div>

      {/* Atalhos */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <Shortcut href="/macros" icon={Radio} label="Macros" />
        <Shortcut href="/calendario" icon={CalendarDays} label="Calendário" />
        <Shortcut href="/historico" icon={History} label="Histórico" />
        <Shortcut href="/gr" icon={ShieldCheck} label="Liberação" />
        {/* T3.2 — Aderência + Calibragem (ADM) */}
        <Shortcut href="/aderencia" icon={CalendarCheck} label="Aderência" />
        <Shortcut href="/calibragem" icon={Gauge} label="Calibragem" />
        {/* T7.2 — Gastos da viagem + acerto/saldo */}
        <Shortcut href="/acerto" icon={Wallet} label="Gastos" />
      </div>

      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-muted">
        <ClipboardList className="h-4 w-4" /> Recentes
      </h2>
      {loading ? (
        <p className="text-text-muted">Carregando…</p>
      ) : error ? (
        <p className="text-amber-600">{error}</p>
      ) : checklists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface p-10 text-center">
          <ClipboardCheck className="mb-3 h-10 w-10 text-text-muted" />
          <p className="font-semibold text-text">Nenhum checklist ainda</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {checklists.map((c) => (
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
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <span>{new Date(c.createdAt).toLocaleString("pt-BR")}</span>
                  {c.odometer != null && (
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" /> {c.odometer.toLocaleString("pt-BR")} km
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Shortcut({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-3 text-center transition hover:border-primary/40"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-xs font-medium text-text">{label}</span>
    </Link>
  );
}
