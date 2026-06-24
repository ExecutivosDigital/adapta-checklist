"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CircleSlash, Link2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MOCK_CONJUNTO,
  MOCK_CONJUNTO_ITENS,
  MOCK_LIBERACAO,
  type LiberacaoViagem,
} from "@/services/frotaGrMock";

type ItemStatus = "PENDENTE" | "OK" | "NC" | "NA";

export default function GrPage() {
  const router = useRouter();
  const [liberacao, setLiberacao] = useState<LiberacaoViagem>(MOCK_LIBERACAO);
  const [conjuntoOk, setConjuntoOk] = useState(MOCK_CONJUNTO.status === "VALIDA");
  const [capturando, setCapturando] = useState(false);
  const [itens, setItens] = useState<Record<string, ItemStatus>>(
    Object.fromEntries(MOCK_CONJUNTO_ITENS.map((i) => [i.codigo, "PENDENTE"])),
  );

  const liberada = useMemo(
    () =>
      liberacao.pesquisaRdo &&
      liberacao.checklistManual &&
      liberacao.checklistGerenciadora &&
      liberacao.sm,
    [liberacao],
  );

  const respondidos = Object.values(itens).filter((s) => s !== "PENDENTE").length;

  function registrarVistoria() {
    setConjuntoOk(true);
    setLiberacao((l) => ({ ...l, checklistManual: true }));
    setCapturando(false);
  }

  if (capturando) {
    return (
      <div className="p-4">
        <Header onBack={() => setCapturando(false)} title="Vistoria do conjunto" />
        <p className="mb-3 text-sm text-text-muted">
          {MOCK_CONJUNTO.cavalo} + {MOCK_CONJUNTO.carreta}
        </p>
        <ul className="space-y-3">
          {MOCK_CONJUNTO_ITENS.map((item) => (
            <li key={item.codigo} className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 font-medium text-text">{item.titulo}</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { s: "OK", label: "OK", icon: Check, on: "bg-green-600 text-white" },
                    { s: "NC", label: "Não", icon: X, on: "bg-red-600 text-white" },
                    { s: "NA", label: "N/A", icon: CircleSlash, on: "bg-gray-500 text-white" },
                  ] as { s: ItemStatus; label: string; icon: typeof Check; on: string }[]
                ).map((b) => {
                  const Icon = b.icon;
                  const active = itens[item.codigo] === b.s;
                  return (
                    <button
                      key={b.s}
                      onClick={() => setItens((p) => ({ ...p, [item.codigo]: b.s }))}
                      className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-sm font-semibold transition ${
                        active ? b.on : "border-border text-text-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        <Button
          className="mt-4 w-full"
          disabled={respondidos < MOCK_CONJUNTO_ITENS.length}
          onClick={registrarVistoria}
        >
          Registrar vistoria
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Header onBack={() => router.push("/")} title="Liberação da viagem" />

      {/* Status geral */}
      <div
        className={`mb-4 rounded-2xl border p-4 ${
          liberada ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-6 w-6 ${liberada ? "text-green-600" : "text-amber-600"}`} />
          <p className="font-bold text-text">
            {liberada ? "Viagem liberada" : "Viagem pendente"}
          </p>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          A liberação depende dos itens abaixo (a SM fecha quando todos estão OK).
        </p>
      </div>

      <ul className="mb-6 space-y-2">
        <ReqRow label="Pesquisa / RDO" ok={liberacao.pesquisaRdo} />
        <ReqRow label="Checklist manual do conjunto" ok={liberacao.checklistManual} />
        <ReqRow label="Checklist da gerenciadora" ok={liberacao.checklistGerenciadora} hint="import manual (GR)" />
        <ReqRow label="SM (monitoramento)" ok={liberacao.sm} hint="depende dos itens acima" />
      </ul>

      {/* Conjunto */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-1 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-text-muted" />
          <p className="font-semibold text-text">Conjunto cavalo + carreta</p>
        </div>
        <p className="text-sm text-text-muted">
          {MOCK_CONJUNTO.cavalo} + {MOCK_CONJUNTO.carreta} —{" "}
          {conjuntoOk ? (
            <span className="font-semibold text-green-600">vistoria registrada</span>
          ) : (
            <span className="font-semibold text-amber-600">sem vistoria válida</span>
          )}
        </p>
        {!conjuntoOk && (
          <Button className="mt-3 w-full" onClick={() => setCapturando(true)}>
            Fazer vistoria do conjunto
          </Button>
        )}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        O app captura o checklist <b>manual</b> do conjunto. O da <b>gerenciadora</b> e a
        <b> SM</b> são do GR (import manual por ora) — aqui o motorista só acompanha.
      </p>
    </div>
  );
}

function ReqRow({ label, ok, hint }: { label: string; ok: boolean; hint?: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      {ok ? (
        <Check className="h-5 w-5 text-green-600" />
      ) : (
        <X className="h-5 w-5 text-red-500" />
      )}
      <div className="flex-1">
        <p className="font-medium text-text">{label}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    </li>
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
