"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import {
  ArrowLeft,
  Check,
  CircleSlash,
  CloudOff,
  Link2,
  Loader2,
  ShieldCheck,
  ShieldQuestion,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  VISTORIA_CONJUNTO_ITENS,
  confirmarVistoriaConjunto,
  getVistoriaConjunto,
} from "@/services/vistoriaConjuntoService";
import type {
  GerenciadoraInfo,
  VistoriaConjuntoStatus,
  VistoriaItemResposta,
  VistoriaItemStatus,
} from "@/types/vistoriaConjunto.types";

const STATUS_OPTIONS: {
  s: VistoriaItemStatus;
  label: string;
  icon: typeof Check;
  on: string;
}[] = [
  { s: "CONFORME", label: "Conforme", icon: Check, on: "bg-green-600 text-white" },
  { s: "NAO_CONFORME", label: "Não conf.", icon: X, on: "bg-red-600 text-white" },
  { s: "NAO_APLICAVEL", label: "N/A", icon: CircleSlash, on: "bg-gray-500 text-white" },
];

const GERENCIADORA_LABEL: Record<string, string> = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PENDENTE: "Pendente",
  VENCIDO: "Vencido",
};

export default function ConjuntoPage() {
  const router = useRouter();
  const { online } = useNetworkStatus();

  const [status, setStatus] = useState<VistoriaConjuntoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [capturando, setCapturando] = useState(false);
  const [respostas, setRespostas] = useState<
    Record<string, { status: VistoriaItemStatus | null; observacao: string }>
  >(() =>
    Object.fromEntries(
      VISTORIA_CONJUNTO_ITENS.map((i) => [
        i.codigo,
        { status: null, observacao: "" },
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Sem seleção de veículo nesta tela: usa o conjunto vigente do motorista
      // (em DEMO, o conjunto do mock). Quando integrado ao fluxo GR, passar
      // vehicleSetId / placas reais aqui.
      const data = await getVistoriaConjunto({});
      setStatus(data);
    } catch {
      setError("Não foi possível carregar o conjunto (offline?).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respondidos = useMemo(
    () => Object.values(respostas).filter((r) => r.status !== null).length,
    [respostas],
  );
  const todosRespondidos = respondidos === VISTORIA_CONJUNTO_ITENS.length;

  function setItemStatus(codigo: string, s: VistoriaItemStatus) {
    setRespostas((p) => ({ ...p, [codigo]: { ...p[codigo], status: s } }));
  }
  function setItemObs(codigo: string, observacao: string) {
    setRespostas((p) => ({ ...p, [codigo]: { ...p[codigo], observacao } }));
  }

  /**
   * Confirma a vistoria manual. Monta os itens respondidos, enfileira
   * (offline-safe, idempotente por clientId) e reflete OTIMISTICAMENTE:
   * o conjunto passa a "vistoria válida" localmente mesmo sem rede.
   */
  async function handleConfirmar() {
    if (!status || !todosRespondidos || saving) return;
    setSaving(true);
    setError(null);
    try {
      const clientId = uuid();
      const itens: VistoriaItemResposta[] = VISTORIA_CONJUNTO_ITENS.map((def) => {
        const r = respostas[def.codigo];
        return {
          codigo: def.codigo,
          titulo: def.titulo,
          status: r.status as VistoriaItemStatus,
          observacao: r.observacao.trim() || undefined,
        };
      });

      await confirmarVistoriaConjunto({
        vehicleSetId: status.conjunto.vehicleSetId ?? undefined,
        cavalo: status.conjunto.cavalo,
        carreta: status.conjunto.carreta,
        itens,
        clientId,
      });

      // Otimismo: conjunto passa a válido localmente (reflete na rede ao drenar).
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              vistoriaValida: true,
              ultimaVistoria: {
                id: `local-${clientId}`,
                data: new Date().toISOString(),
                status: "CONFORME",
              },
            }
          : prev,
      );
      setCapturando(false);
    } catch {
      setError("Não foi possível confirmar a vistoria.");
    } finally {
      setSaving(false);
    }
  }

  // ── Captura item a item ──
  if (capturando && status) {
    return (
      <div className="p-4">
        <Header onBack={() => setCapturando(false)} title="Vistoria do conjunto" />
        <p className="mb-3 text-sm text-text-muted">
          {status.conjunto.cavalo} + {status.conjunto.carreta}
        </p>
        {!online && (
          <p className="mb-3 flex items-center gap-1 text-xs font-semibold text-amber-600">
            <CloudOff className="h-4 w-4" /> Offline — a confirmação será enviada ao reconectar.
          </p>
        )}
        <ul className="space-y-3">
          {VISTORIA_CONJUNTO_ITENS.map((item) => {
            const r = respostas[item.codigo];
            return (
              <li
                key={item.codigo}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <p className="mb-2 font-medium text-text">{item.titulo}</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((b) => {
                    const Icon = b.icon;
                    const active = r.status === b.s;
                    return (
                      <button
                        key={b.s}
                        onClick={() => setItemStatus(item.codigo, b.s)}
                        className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-xs font-semibold transition ${
                          active ? b.on : "border-border text-text-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {b.label}
                      </button>
                    );
                  })}
                </div>
                {r.status === "NAO_CONFORME" && (
                  <textarea
                    value={r.observacao}
                    onChange={(e) => setItemObs(item.codigo, e.target.value)}
                    placeholder="Observação (o que está em não conformidade?)"
                    rows={2}
                    className="mt-2 w-full resize-none rounded-lg border border-border bg-surface p-2 text-sm text-text outline-none focus:border-primary/40"
                  />
                )}
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-3 text-sm text-amber-600">{error}</p>}
        <Button
          className="mt-4 w-full"
          disabled={!todosRespondidos || saving}
          onClick={handleConfirmar}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar vistoria ({respondidos}/{VISTORIA_CONJUNTO_ITENS.length})
        </Button>
      </div>
    );
  }

  // ── Visão geral do conjunto ──
  return (
    <div className="p-4">
      <Header onBack={() => router.push("/")} title="Conjunto" />

      {loading ? (
        <p className="text-text-muted">Carregando…</p>
      ) : error && !status ? (
        <p className="text-amber-600">{error}</p>
      ) : status ? (
        <>
          {/* Badge vistoria válida */}
          <div
            className={`mb-4 rounded-2xl border p-4 ${
              status.vistoriaValida
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={`h-6 w-6 ${
                  status.vistoriaValida ? "text-green-600" : "text-red-600"
                }`}
              />
              <p className="font-bold text-text">
                {status.vistoriaValida
                  ? "Vistoria válida"
                  : "Sem vistoria válida"}
              </p>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {status.ultimaVistoria
                ? `Última: ${new Date(
                    status.ultimaVistoria.data,
                  ).toLocaleString("pt-BR")} — ${status.ultimaVistoria.status}`
                : "Nenhuma vistoria manual registrada para este conjunto."}
            </p>
          </div>

          {/* Conjunto */}
          <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
            <div className="mb-1 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-text-muted" />
              <p className="font-semibold text-text">Cavalo + carreta</p>
            </div>
            <p className="text-sm text-text-muted">
              {status.conjunto.cavalo} + {status.conjunto.carreta}
            </p>
          </div>

          {/* Gerenciadora (read-only) */}
          <GerenciadoraCard gerenciadora={status.gerenciadora} />

          {error && <p className="mt-3 text-sm text-amber-600">{error}</p>}

          <Button className="mt-4 w-full" onClick={() => setCapturando(true)}>
            {status.vistoriaValida ? "Refazer vistoria manual" : "Fazer vistoria manual"}
          </Button>

          <p className="mt-4 text-xs text-text-muted">
            O app captura o checklist <b>manual</b> do conjunto. O da{" "}
            <b>gerenciadora</b> é registrado no GR — aqui o motorista só acompanha.
          </p>
        </>
      ) : null}
    </div>
  );
}

function GerenciadoraCard({
  gerenciadora,
}: {
  gerenciadora: GerenciadoraInfo | null;
}) {
  const status = gerenciadora?.status ?? "PENDENTE";
  const aprovado = status === "APROVADO";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2">
        <ShieldQuestion className="h-5 w-5 text-text-muted" />
        <p className="font-semibold text-text">Checklist da gerenciadora</p>
        <span className="ml-auto text-xs font-semibold text-text-muted">
          somente leitura
        </span>
      </div>
      {gerenciadora ? (
        <p className="text-sm text-text-muted">
          Status:{" "}
          <span
            className={`font-semibold ${
              aprovado ? "text-green-600" : "text-amber-600"
            }`}
          >
            {GERENCIADORA_LABEL[String(status)] ?? String(status)}
          </span>
          {gerenciadora.validade && (
            <> — válido até {new Date(gerenciadora.validade).toLocaleDateString("pt-BR")}</>
          )}
        </p>
      ) : (
        <p className="text-sm text-text-muted">
          Sem registro da gerenciadora para este conjunto.
        </p>
      )}
    </div>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="mb-4 flex items-center gap-3 pt-2">
      <button
        onClick={onBack}
        className="rounded-lg p-2 hover:bg-surface-muted"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5 text-text" />
      </button>
      <h1 className="text-xl font-bold text-text">{title}</h1>
    </header>
  );
}
