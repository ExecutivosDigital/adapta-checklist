"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import {
  Check,
  ClipboardList,
  Lock,
  LockOpen,
  LogOut,
  Plus,
  Trash2,
  Truck,
  TruckIcon,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { MOCK_TEMPLATES } from "@/services/checklistMock";
import {
  MOCK_AFAZER,
  MOCK_DISPONIBILIDADE,
  MOCK_GERENCIADORA,
  STATUS_VEICULO_LABEL,
  type AFazerItem,
  type DisponVeiculo,
  type GerenciadoraPendente,
} from "@/services/frotaGrMock";
import type {
  FleetChecklistTemplate,
  FleetChecklistTipo,
} from "@/types/checklist.types";

type Tab = "chegadas" | "afazer" | "dispon" | "gerenc" | "templates";

const TABS: { id: Tab; label: string }[] = [
  { id: "chegadas", label: "Chegadas" },
  { id: "afazer", label: "A fazer" },
  { id: "dispon", label: "Disponibilidade" },
  { id: "gerenc", label: "Gerenciadora" },
  { id: "templates", label: "Templates" },
];

const STATUS_COLOR: Record<DisponVeiculo["status"], string> = {
  DISPONIVEL: "bg-green-100 text-green-700",
  EM_VIAGEM: "bg-blue-100 text-blue-700",
  MANUTENCAO: "bg-amber-100 text-amber-700",
  BLOQUEADO: "bg-red-100 text-red-700",
};

const TIPO_LABEL: Record<FleetChecklistTipo, string> = {
  DIARIO: "Diário",
  INSPECAO_TOTAL: "Inspeção total",
  CALIBRAGEM: "Calibragem",
  OUTRO: "Outro",
};

const CHEGADAS = [
  { id: "ch-1", motorista: "Luiz Eduardo Reitz", placa: "KAF2D34", hora: "08:40", viagemId: "8321", checklistId: "chk-chegada-1" },
  { id: "ch-2", motorista: "Marcos Antônio Rodrigues", placa: "AVC9F66", hora: "10:15", viagemId: "8344", checklistId: "chk-chegada-2" },
];

export default function FrotaPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("chegadas");

  const [afazer, setAfazer] = useState<AFazerItem[]>(MOCK_AFAZER);
  const [dispon, setDispon] = useState<DisponVeiculo[]>(MOCK_DISPONIBILIDADE);
  const [gerenc, setGerenc] = useState<GerenciadoraPendente[]>(MOCK_GERENCIADORA);
  const [templates, setTemplates] = useState<FleetChecklistTemplate[]>(MOCK_TEMPLATES);

  // Modais
  const [regAlvo, setRegAlvo] = useState<GerenciadoraPendente | null>(null);
  const [novoTpl, setNovoTpl] = useState(false);
  const [verTpl, setVerTpl] = useState<FleetChecklistTemplate | null>(null);

  function decide(id: string, status: AFazerItem["status"]) {
    setAfazer((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function travar(placa: string) {
    setDispon((p) =>
      p.map((v) =>
        v.placa === placa
          ? {
              ...v,
              status: v.status === "BLOQUEADO" ? "DISPONIVEL" : "BLOQUEADO",
              obs: v.status === "BLOQUEADO" ? undefined : "Travado pela Frota",
            }
          : v,
      ),
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background">
      <header className="flex items-center justify-between border-b border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-text">Frota — ADM</p>
            <p className="text-xs text-text-muted">{user?.name ?? "Administrador"}</p>
          </div>
        </div>
        <button onClick={() => logout()} className="rounded-lg p-2 hover:bg-surface-muted">
          <LogOut className="h-5 w-5 text-text-muted" />
        </button>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "chegadas" && (
          <ul className="space-y-2">
            {CHEGADAS.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{c.motorista}</span>
                  <span className="text-xs text-text-muted">{c.hora}</span>
                </div>
                <p className="text-sm text-text-muted">{c.placa} · viagem {c.viagemId}</p>
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => router.push(`/checklist/${c.checklistId}`)}
                >
                  Fazer checklist junto
                </Button>
              </li>
            ))}
          </ul>
        )}

        {tab === "afazer" && (
          <ul className="space-y-2">
            {afazer.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{a.placa}</span>
                  <span className="text-xs text-text-muted">{a.quando}</span>
                </div>
                <p className="text-sm text-text">{a.descricao}</p>
                {a.status === "PENDENTE" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button onClick={() => decide(a.id, "APROVADO")}>
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button variant="danger" onClick={() => decide(a.id, "REJEITADO")}>
                      <X className="mr-1 h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                ) : (
                  <p className={`mt-2 text-sm font-semibold ${a.status === "APROVADO" ? "text-green-600" : "text-red-600"}`}>
                    {a.status === "APROVADO" ? "Aprovado → vira OS" : "Rejeitado"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === "dispon" && (
          <ul className="space-y-2">
            {dispon.map((v) => (
              <li key={v.placa} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TruckIcon className="h-5 w-5 text-text-muted" />
                    <div>
                      <p className="font-semibold text-text">{v.placa}</p>
                      <p className="text-xs text-text-muted">
                        {v.tipo}
                        {v.obs ? ` · ${v.obs}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[v.status]}`}>
                    {STATUS_VEICULO_LABEL[v.status]}
                  </span>
                </div>
                {(v.status === "DISPONIVEL" || v.status === "BLOQUEADO") && (
                  <Button
                    variant={v.status === "BLOQUEADO" ? "outline" : "danger"}
                    className="mt-2 w-full"
                    onClick={() => travar(v.placa)}
                  >
                    {v.status === "BLOQUEADO" ? (
                      <>
                        <LockOpen className="mr-1 h-4 w-4" /> Liberar para operação
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1 h-4 w-4" /> Travar para operação
                      </>
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {tab === "gerenc" && (
          <ul className="space-y-2">
            {gerenc.map((g) => (
              <li key={`${g.cavalo}-${g.carreta}`} className="rounded-xl border border-border bg-surface p-4">
                <p className="font-semibold text-text">{g.cavalo} + {g.carreta}</p>
                <p className="text-sm text-text-muted">Gerenciadora: {g.gerenciadora}</p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => setRegAlvo(g)}>
                  <Wrench className="mr-1 h-4 w-4" /> Registrar checklist (import)
                </Button>
              </li>
            ))}
            {gerenc.length === 0 && <p className="text-text-muted">Sem pendências. ✅</p>}
          </ul>
        )}

        {tab === "templates" && (
          <>
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setVerTpl(t)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-5 w-5 text-text-muted" />
                      <div>
                        <p className="font-semibold text-text">{t.nome}</p>
                        <p className="text-xs text-text-muted">
                          {t.itens.length} itens
                          {t.periodicidadeDias ? ` · a cada ${t.periodicidadeDias}d` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-primary">ver</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setNovoTpl(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo template
            </Button>
          </>
        )}
      </div>

      {/* Modal: registrar checklist da gerenciadora */}
      {regAlvo && (
        <RegistrarGerenciadora
          alvo={regAlvo}
          onClose={() => setRegAlvo(null)}
          onConfirm={() => {
            setGerenc((p) => p.filter((x) => !(x.cavalo === regAlvo.cavalo && x.carreta === regAlvo.carreta)));
            setRegAlvo(null);
          }}
        />
      )}

      {/* Modal: ver template */}
      {verTpl && (
        <Modal title={verTpl.nome} onClose={() => setVerTpl(null)}>
          <p className="mb-3 text-sm text-text-muted">{TIPO_LABEL[verTpl.tipo]}</p>
          <ul className="space-y-1">
            {verTpl.itens.map((it) => (
              <li key={it.codigo} className="flex items-center justify-between text-sm">
                <span className="text-text">{it.titulo}</span>
                {it.bloqueante && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    bloqueante
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {/* Modal: novo template */}
      {novoTpl && (
        <NovoTemplate
          onClose={() => setNovoTpl(false)}
          onCreate={(t) => {
            setTemplates((p) => [...p, t]);
            setNovoTpl(false);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Modais ─────────────────────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-text">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-muted">
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RegistrarGerenciadora({
  alvo,
  onClose,
  onConfirm,
}: {
  alvo: GerenciadoraPendente;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [validade, setValidade] = useState("");
  const [protocolo, setProtocolo] = useState("");
  return (
    <Modal title="Checklist da gerenciadora" onClose={onClose}>
      <p className="mb-3 text-sm text-text-muted">
        {alvo.cavalo} + {alvo.carreta} · {alvo.gerenciadora}
      </p>
      <label className="text-sm text-text-muted">Protocolo / laudo</label>
      <Input className="mb-3 mt-1" value={protocolo} onChange={(e) => setProtocolo(e.target.value)} placeholder="Nº do protocolo" />
      <label className="text-sm text-text-muted">Validade</label>
      <Input className="mb-4 mt-1" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
      <Button className="w-full" disabled={!protocolo || !validade} onClick={onConfirm}>
        Registrar
      </Button>
    </Modal>
  );
}

function NovoTemplate({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (t: FleetChecklistTemplate) => void;
}) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<FleetChecklistTipo>("DIARIO");
  const [itens, setItens] = useState<{ titulo: string; bloqueante: boolean }[]>([]);
  const [itemTitulo, setItemTitulo] = useState("");
  const [itemBloq, setItemBloq] = useState(false);

  function addItem() {
    if (!itemTitulo.trim()) return;
    setItens((p) => [...p, { titulo: itemTitulo.trim(), bloqueante: itemBloq }]);
    setItemTitulo("");
    setItemBloq(false);
  }

  function criar() {
    onCreate({
      id: uuid(),
      tipo,
      nome: nome.trim(),
      periodicidadeDias: tipo === "DIARIO" ? 1 : tipo === "CALIBRAGEM" ? 10 : null,
      itens: itens.map((it, i) => ({
        codigo: `IT${i + 1}`,
        titulo: it.titulo,
        bloqueante: it.bloqueante,
      })),
    });
  }

  return (
    <Modal title="Novo template" onClose={onClose}>
      <label className="text-sm text-text-muted">Nome</label>
      <Input className="mb-3 mt-1" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Diário" />

      <label className="text-sm text-text-muted">Tipo</label>
      <div className="mb-3 mt-1 flex flex-wrap gap-2">
        {(["DIARIO", "INSPECAO_TOTAL", "CALIBRAGEM", "OUTRO"] as FleetChecklistTipo[]).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted"
            }`}
          >
            {TIPO_LABEL[t]}
          </button>
        ))}
      </div>

      <label className="text-sm text-text-muted">Itens</label>
      <ul className="mb-2 mt-1 space-y-1">
        {itens.map((it, i) => (
          <li key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span className="text-text">
              {it.titulo}
              {it.bloqueante && <span className="ml-2 text-xs text-red-600">bloqueante</span>}
            </span>
            <button onClick={() => setItens((p) => p.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-text-muted" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Input value={itemTitulo} onChange={(e) => setItemTitulo(e.target.value)} placeholder="Novo item" />
        <button
          onClick={() => setItemBloq((b) => !b)}
          className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
            itemBloq ? "border-red-400 bg-red-50 text-red-700" : "border-border text-text-muted"
          }`}
          title="Item bloqueante"
        >
          bloq
        </button>
        <Button variant="outline" onClick={addItem}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Button className="mt-4 w-full" disabled={!nome.trim() || itens.length === 0} onClick={criar}>
        Criar template
      </Button>
    </Modal>
  );
}
