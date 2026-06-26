"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoCaptureView } from "@/components/camera/PhotoCaptureView";
import { listDriverVehicles } from "@/services/checklistService";
import {
  createExpense,
  descontaSaldo,
  getCurrentSettlement,
} from "@/services/driverExpensesService";
import type { DriverVehicle } from "@/types/checklist.types";
import type {
  DriverExpense,
  DriverSettlement,
  ExpenseTipo,
} from "@/types/expenses.types";
import { matchesSearch } from "@/utils/normalizeSearch";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TIPOS: {
  tipo: ExpenseTipo;
  label: string;
  hint: string;
}[] = [
  { tipo: "DIARIA", label: "Diária", hint: "Não desconta do seu saldo" },
  { tipo: "AJUDANTE", label: "Ajudante", hint: "Desconta do seu saldo" },
  {
    tipo: "COM_COMPROVANTE",
    label: "Com comprovante",
    hint: "Sem foto, desconta do seu saldo",
  },
  { tipo: "OUTRO", label: "Outro", hint: "Desconta do seu saldo" },
];

const TIPO_LABEL: Record<ExpenseTipo, string> = {
  DIARIA: "Diária",
  AJUDANTE: "Ajudante",
  COM_COMPROVANTE: "Com comprovante",
  OUTRO: "Outro",
};

const today = () => new Date().toISOString().slice(0, 10);

type Tab = "lancar" | "acerto";

export default function AcertoPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("lancar");

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-2 hover:bg-surface-muted"
        >
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">Gastos & Acerto</h1>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1">
        <TabBtn active={tab === "lancar"} onClick={() => setTab("lancar")}>
          <Receipt className="h-4 w-4" /> Lançar gasto
        </TabBtn>
        <TabBtn active={tab === "acerto"} onClick={() => setTab("acerto")}>
          <Wallet className="h-4 w-4" /> Acerto / Saldo
        </TabBtn>
      </div>

      {tab === "lancar" ? (
        <LancarTab onLancado={() => setTab("acerto")} />
      ) : (
        <AcertoTab />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition ${
        active ? "bg-surface text-primary shadow-sm" : "text-text-muted"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Aba: Lançar gasto
// ---------------------------------------------------------------------------
function LancarTab({ onLancado }: { onLancado: () => void }) {
  const [tipo, setTipo] = useState<ExpenseTipo>("COM_COMPROVANTE");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(today());
  const [notes, setNotes] = useState("");

  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [vehSearch, setVehSearch] = useState("");
  const [tripId, setTripId] = useState("");

  const [comprovante, setComprovante] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ desconta: boolean } | null>(null);

  useEffect(() => {
    listDriverVehicles()
      .then(setVehicles)
      .catch(() => {
        /* offline — viagem é opcional, segue sem lista */
      });
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = vehSearch.trim();
    return q
      ? vehicles.filter(
          (v) =>
            matchesSearch(v.plate, q) ||
            matchesSearch(v.brand ?? "", q) ||
            matchesSearch(v.model ?? "", q),
        )
      : vehicles.slice(0, 20);
  }, [vehicles, vehSearch]);

  // Reflexo otimista da regra de acerto.
  const desconta = descontaSaldo(tipo, Boolean(comprovante));

  const valorNumber = useMemo(() => {
    const cleaned = valor.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }, [valor]);

  async function handleSubmit() {
    if (valorNumber <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createExpense(
        {
          tipo,
          valor: valorNumber,
          data,
          tripId: tripId || undefined,
          notes: notes.trim() || undefined,
        },
        comprovante ?? undefined,
      );
      setDone({ desconta: res.desconta });
    } catch {
      setError("Falha ao lançar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center">
        <Check className="mb-2 h-10 w-10 text-green-600" />
        <p className="text-lg font-bold text-text">Gasto lançado</p>
        <p className="mt-1 text-sm text-text-muted">
          {done.desconta
            ? "Este gasto desconta do seu saldo."
            : "Este gasto não desconta do seu saldo."}
        </p>
        <p className="mt-1 text-xs text-text-subtle">
          Se estiver offline, ele sobe automaticamente ao reconectar.
        </p>
        <div className="mt-5 grid w-full grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setValor("");
              setNotes("");
              setComprovante(null);
            }}
          >
            Lançar outro
          </Button>
          <Button onClick={onLancado}>Ver acerto</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-red-600">{error}</p>}

      {/* Tipo */}
      <label className="text-sm text-text-muted">Tipo do gasto</label>
      <div className="mb-1 mt-1 grid grid-cols-2 gap-2">
        {TIPOS.map((t) => (
          <button
            key={t.tipo}
            onClick={() => setTipo(t.tipo)}
            className={`rounded-xl border px-3 py-2 text-left transition ${
              tipo === t.tipo
                ? "border-primary bg-primary/10"
                : "border-border"
            }`}
          >
            <span className="block text-sm font-semibold text-text">
              {t.label}
            </span>
            <span className="block text-xs text-text-muted">{t.hint}</span>
          </button>
        ))}
      </div>
      <div
        className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
          desconta
            ? "bg-amber-50 text-amber-700"
            : "bg-green-50 text-green-700"
        }`}
      >
        {desconta ? (
          <>
            <TriangleAlert className="h-4 w-4" /> Desconta do seu saldo
          </>
        ) : (
          <>
            <Check className="h-4 w-4" /> Não desconta do seu saldo
          </>
        )}
      </div>

      {/* Valor */}
      <label className="text-sm text-text-muted">Valor (R$)</label>
      <Input
        className="mt-1"
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
        placeholder="0,00"
      />

      {/* Data */}
      <label className="mt-4 block text-sm text-text-muted">Data</label>
      <Input
        className="mt-1"
        type="date"
        value={data}
        max={today()}
        onChange={(e) => setData(e.target.value)}
      />

      {/* Viagem (opcional) */}
      <label className="mt-4 block text-sm text-text-muted">
        Viagem / veículo (opcional)
      </label>
      <Input
        className="mt-1"
        value={vehSearch}
        onChange={(e) => setVehSearch(e.target.value)}
        placeholder="Buscar placa…"
      />
      {tripId && (
        <button
          onClick={() => setTripId("")}
          className="mt-1 text-xs font-semibold text-primary"
        >
          Limpar seleção
        </button>
      )}
      {filteredVehicles.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
          {filteredVehicles.map((v) => (
            <li key={v.id}>
              <button
                onClick={() => setTripId(v.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                  tripId === v.id
                    ? "border-primary bg-primary/10"
                    : "border-border"
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
      )}

      {/* Comprovante (foto) */}
      <label className="mt-4 block text-sm text-text-muted">
        Foto do comprovante
        {tipo === "COM_COMPROVANTE" && (
          <span className="ml-1 text-xs font-semibold text-amber-600">
            (sem foto, desconta de você)
          </span>
        )}
      </label>
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-text-muted transition active:scale-95"
        >
          <Camera className="h-4 w-4" />
          {comprovante ? "Trocar foto" : "Tirar foto"}
        </button>
        {/* Fallback: anexar de arquivo/galeria (mesmo fluxo, vira data URL). */}
        <label className="cursor-pointer text-sm font-medium text-primary">
          Anexar arquivo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () =>
                setComprovante(String(reader.result ?? ""));
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>
      {comprovante && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={comprovante}
            alt="comprovante"
            className="h-20 w-20 rounded-lg object-cover"
          />
          <button
            onClick={() => setComprovante(null)}
            className="text-sm font-medium text-red-600"
          >
            Remover
          </button>
        </div>
      )}

      {/* Notas */}
      <label className="mt-4 block text-sm text-text-muted">
        Observação (opcional)
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Ex.: pedágio, abastecimento, refeição…"
        className="mt-1 w-full rounded-2xl border border-border bg-surface p-3 text-text outline-none focus:border-primary"
      />

      <Button
        className="mt-6 w-full"
        disabled={busy || valorNumber <= 0}
        onClick={handleSubmit}
      >
        {busy ? "Lançando…" : "Lançar gasto"}
      </Button>

      {cameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black">
          <PhotoCaptureView
            overlayMode="document-rectangle"
            title="Foto do comprovante"
            onCapture={(dataUrl) => {
              setComprovante(dataUrl);
              setCameraOpen(false);
            }}
            onClose={() => setCameraOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Acerto / Saldo
// ---------------------------------------------------------------------------
function AcertoTab() {
  const [settlement, setSettlement] = useState<DriverSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getCurrentSettlement()
      .then((s) => {
        setSettlement(s);
        setError(null);
      })
      .catch(() => setError("Não foi possível carregar o acerto (offline?)."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-text-muted">Carregando…</p>;
  if (error) return <p className="text-amber-600">{error}</p>;
  if (!settlement) return null;

  const saldoPositivo = settlement.saldoParcial >= 0;

  return (
    <div className="space-y-4">
      {/* Saldo */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-text-muted">Saldo parcial do acerto</p>
        <p
          className={`text-3xl font-bold ${
            saldoPositivo ? "text-green-600" : "text-red-600"
          }`}
        >
          {brl(settlement.saldoParcial)}
        </p>
        <p className="text-xs text-text-subtle">
          {saldoPositivo ? "A receber" : "A pagar"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Desconta</p>
            <p className="font-bold text-amber-700">
              {brl(settlement.totalDesconta)}
            </p>
          </div>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-green-700">Não desconta</p>
            <p className="font-bold text-green-700">
              {brl(settlement.totalNaoDesconta)}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Total de gastos em aberto: {brl(settlement.totalGastos)}
        </p>
      </div>

      {/* Por viagem */}
      <h2 className="text-sm font-semibold text-text-muted">Por viagem</h2>
      {settlement.porViagem.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-8 text-center">
          <Receipt className="mx-auto mb-2 h-8 w-8 text-text-muted" />
          <p className="font-semibold text-text">Nenhum gasto em aberto</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {settlement.porViagem.map((g) => (
            <li
              key={g.tripId ?? "sem-viagem"}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-text">
                  {g.tripLabel ?? (g.tripId ? "Viagem" : "Sem viagem")}
                </span>
                <span className="text-xs text-text-muted">
                  Desconta {brl(g.totalDesconta)}
                </span>
              </div>
              <ul className="space-y-1">
                {g.expenses.map((e) => (
                  <ExpenseRow key={e.id} expense={e} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseRow({ expense: e }: { expense: DriverExpense }) {
  const desconta = e.desconta ?? false;
  return (
    <li className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
      <div>
        <span className="font-medium text-text">{TIPO_LABEL[e.tipo]}</span>
        {e.notes && (
          <span className="ml-1 text-xs text-text-muted">— {e.notes}</span>
        )}
        {e.pending && (
          <span className="ml-1 inline-flex items-center gap-1 text-xs text-amber-600">
            <Loader2 className="h-3 w-3 animate-spin" /> enviando
          </span>
        )}
        <span
          className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            desconta
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {desconta ? "desconta" : "não desconta"}
        </span>
      </div>
      <span className="font-semibold text-text">{brl(e.valor)}</span>
    </li>
  );
}
