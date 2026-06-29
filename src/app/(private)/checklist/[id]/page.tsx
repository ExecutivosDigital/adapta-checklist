"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Gauge, Truck, User } from "lucide-react";
import { ChecklistFill } from "@/components/checklist/ChecklistFill";
import { Badge } from "@/components/ui/badge";
import { getChecklist } from "@/services/checklistService";
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

export default function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [checklist, setChecklist] = useState<FleetChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChecklist(id)
      .then(setChecklist)
      .finally(() => setLoading(false));
  }, [id]);

  // Editável apenas enquanto EM_ANDAMENTO. Concluído, aguardando aprovação ou
  // reprovado abrem em modo leitura (a Frota confere os itens antes de decidir).
  const readOnly = !!checklist && checklist.status !== "EM_ANDAMENTO";

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/")} className="rounded-lg p-2 hover:bg-surface-muted">
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">
          {checklist && readOnly
            ? `Checklist (${STATUS_LABEL[checklist.status].toLowerCase()})`
            : "Continuar checklist"}
        </h1>
      </header>

      {loading ? (
        <p className="text-text-muted">Carregando…</p>
      ) : !checklist ? (
        <p className="text-text-muted">Checklist não encontrado.</p>
      ) : (
        <>
          <ChecklistHeader checklist={checklist} />
          <ChecklistFill
            checklist={checklist}
            readOnly={readOnly}
            onDone={() => router.push("/")}
          />
        </>
      )}
    </div>
  );
}

function ChecklistHeader({ checklist: c }: { checklist: FleetChecklist }) {
  const plate = c.vehicle?.plate ?? c.vehicleId;
  const model = c.vehicle?.model ?? null;
  const dateIso = c.concluidoEm ?? c.createdAt;

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-text">
            {plate}
            {model ? (
              <span className="font-normal text-text-muted"> · {model}</span>
            ) : null}
          </p>
          <p className="text-sm text-text-muted">{TIPO_LABEL[c.tipo]}</p>
        </div>
        <Badge
          variant={STATUS_VARIANT[c.status]}
          className="shrink-0"
        >
          {STATUS_LABEL[c.status]}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <InfoRow icon={User} label="Motorista" value={c.motoristaNome ?? "—"} />
        <InfoRow icon={Truck} label="Veículo" value={plate} />
        <InfoRow
          icon={CalendarDays}
          label={c.concluidoEm ? "Concluído em" : "Aberto em"}
          value={new Date(dateIso).toLocaleString("pt-BR")}
        />
        <InfoRow
          icon={Gauge}
          label="Odômetro"
          value={c.odometer != null ? `${c.odometer.toLocaleString("pt-BR")} km` : "—"}
        />
      </dl>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <dt className="text-xs text-text-muted">{label}</dt>
        <dd className="truncate font-medium text-text">{value}</dd>
      </div>
    </div>
  );
}
