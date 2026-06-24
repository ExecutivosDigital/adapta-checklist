"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChecklistFill } from "@/components/checklist/ChecklistFill";
import { getChecklist } from "@/services/checklistService";
import type { FleetChecklist } from "@/types/checklist.types";

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

  const readOnly = checklist?.status === "CONCLUIDO";

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/")} className="rounded-lg p-2 hover:bg-surface-muted">
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">
          {readOnly ? "Checklist (concluído)" : "Continuar checklist"}
        </h1>
      </header>

      {loading ? (
        <p className="text-text-muted">Carregando…</p>
      ) : !checklist ? (
        <p className="text-text-muted">Checklist não encontrado.</p>
      ) : (
        <ChecklistFill
          checklist={checklist}
          readOnly={readOnly}
          onDone={() => router.push("/")}
        />
      )}
    </div>
  );
}
