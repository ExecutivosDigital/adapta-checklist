"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { MOCK_ADERENCIA_DIARIO } from "@/services/checklistMock";

export default function CalendarioPage() {
  const router = useRouter();
  const dias = MOCK_ADERENCIA_DIARIO;
  const feitos = dias.filter((d) => d.feito).length;

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/")} className="rounded-lg p-2 hover:bg-surface-muted">
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">Diário — aderência</h1>
      </header>

      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-text-muted">Últimos {dias.length} dias úteis</p>
        <p className="text-2xl font-bold text-text">
          {feitos}/{dias.length}{" "}
          <span className="text-base font-medium text-text-muted">feitos</span>
        </p>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dias.map((d) => {
          const day = new Date(d.date + "T00:00:00").getDate();
          return (
            <div
              key={d.date}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm ${
                d.feito
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-red-300 bg-red-50 text-red-700"
              }`}
              title={d.date}
            >
              <span className="text-xs">{day}</span>
              {d.feito ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        Verde = diário feito; vermelho = faltou. (A Frota usa isso pra cobrar a aderência.)
      </p>
    </div>
  );
}
