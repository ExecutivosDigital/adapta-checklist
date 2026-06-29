"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ClipboardList,
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
import { extractApiError } from "@/lib/api";
import {
  MOCK_GERENCIADORA,
  type GerenciadoraPendente,
} from "@/services/frotaGrMock";
import {
  approveMaintenanceRequest,
  createTemplateAdmin,
  updateTemplateAdmin,
  listChecklistsEmAndamento,
  listMaintenanceRequests,
  listTemplatesAdmin,
  listVehicleAvailability,
  rejectMaintenanceRequest,
  resolveAdminTenant,
  type MaintenanceRequest,
  type VehicleAvailability,
  type VehicleStatus,
} from "@/services/frotaAdmService";
import type {
  FleetChecklist,
  FleetChecklistTemplate,
  FleetChecklistTipo,
  FleetChecklistTipoCampo,
} from "@/types/checklist.types";

type Tab = "chegadas" | "afazer" | "dispon" | "gerenc" | "templates";

const TABS: { id: Tab; label: string }[] = [
  { id: "chegadas", label: "Chegadas" },
  { id: "afazer", label: "A fazer" },
  { id: "dispon", label: "Disponibilidade" },
  { id: "gerenc", label: "Gerenciadora" },
  { id: "templates", label: "Templates" },
];

const STATUS_COLOR: Record<VehicleStatus, string> = {
  DISPONIVEL: "bg-green-100 text-green-700",
  EM_VIAGEM: "bg-blue-100 text-blue-700",
  MANUTENCAO: "bg-amber-100 text-amber-700",
  BLOQUEADO: "bg-red-100 text-red-700",
  ACIDENTE: "bg-red-100 text-red-700",
  INATIVO: "bg-gray-200 text-gray-600",
};

const STATUS_VEICULO_LABEL: Record<VehicleStatus, string> = {
  DISPONIVEL: "Disponível",
  EM_VIAGEM: "Em viagem",
  MANUTENCAO: "Manutenção",
  BLOQUEADO: "Bloqueado",
  ACIDENTE: "Acidente",
  INATIVO: "Inativo",
};

const TIPO_LABEL: Record<FleetChecklistTipo, string> = {
  DIARIO: "Diário",
  INSPECAO_TOTAL: "Inspeção total",
  CALIBRAGEM: "Calibragem",
  OUTRO: "Outro",
};

export default function FrotaPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("chegadas");

  // Tenant ADM (x-tenant-id) — resolvido uma vez antes de carregar as abas.
  const [tenantReady, setTenantReady] = useState(false);

  // Dados reais por aba.
  const [chegadas, setChegadas] = useState<FleetChecklist[]>([]);
  const [afazer, setAfazer] = useState<MaintenanceRequest[]>([]);
  const [dispon, setDispon] = useState<VehicleAvailability[]>([]);
  const [templates, setTemplates] = useState<FleetChecklistTemplate[]>([]);

  // Gerenciadora: ainda mock (depende da feature de conjunto/GR — Etapa 8).
  const [gerenc] = useState<GerenciadoraPendente[]>(MOCK_GERENCIADORA);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  // Modais
  const [regAlvo, setRegAlvo] = useState<GerenciadoraPendente | null>(null);
  const [novoTpl, setNovoTpl] = useState(false);
  const [verTpl, setVerTpl] = useState<FleetChecklistTemplate | null>(null);
  const [editTpl, setEditTpl] = useState<FleetChecklistTemplate | null>(null);

  useEffect(() => {
    void resolveAdminTenant().finally(() => setTenantReady(true));
  }, []);

  const carregar = useCallback(
    async (which: Tab) => {
      if (!tenantReady) return;
      setErro(null);
      setLoading(true);
      try {
        if (which === "chegadas") {
          setChegadas(await listChecklistsEmAndamento());
        } else if (which === "afazer") {
          setAfazer(await listMaintenanceRequests({ status: "PENDING" }));
        } else if (which === "dispon") {
          setDispon(await listVehicleAvailability());
        } else if (which === "templates") {
          setTemplates(await listTemplatesAdmin());
        }
      } catch (e) {
        setErro(extractApiError(e, "Não foi possível carregar os dados."));
      } finally {
        setLoading(false);
      }
    },
    [tenantReady],
  );

  useEffect(() => {
    void carregar(tab);
  }, [tab, carregar]);

  async function decide(id: string, aprovar: boolean) {
    setAcaoId(id);
    try {
      const updated = aprovar
        ? await approveMaintenanceRequest(id)
        : await rejectMaintenanceRequest(id);
      setAfazer((p) => p.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    } catch (e) {
      setErro(extractApiError(e, "Não foi possível registrar a decisão."));
    } finally {
      setAcaoId(null);
    }
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
        {erro && tab !== "gerenc" && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
        )}
        {loading && tab !== "gerenc" && (
          <p className="mb-3 text-sm text-text-muted">Carregando…</p>
        )}

        {tab === "chegadas" && !loading && (
          <ul className="space-y-2">
            {chegadas.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{TIPO_LABEL[c.tipo]}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-text-muted">
                  Checklist em andamento · {c.itens.length} itens
                </p>
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => router.push(`/checklist/${c.id}`)}
                >
                  Fazer checklist junto
                </Button>
              </li>
            ))}
            {chegadas.length === 0 && (
              <p className="text-text-muted">Nenhum checklist em andamento.</p>
            )}
          </ul>
        )}

        {tab === "afazer" && !loading && (
          <ul className="space-y-2">
            {afazer.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">
                    {a.vehicle?.plate ?? "Veículo"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-text">{a.description ?? a.title}</p>
                {a.status === "PENDING" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button disabled={acaoId === a.id} onClick={() => decide(a.id, true)}>
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button
                      variant="danger"
                      disabled={acaoId === a.id}
                      onClick={() => decide(a.id, false)}
                    >
                      <X className="mr-1 h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                ) : (
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      a.status === "APPROVED" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {a.status === "APPROVED" ? "Aprovado → vira OS" : "Rejeitado"}
                  </p>
                )}
              </li>
            ))}
            {afazer.length === 0 && (
              <p className="text-text-muted">Sem requisições pendentes. ✅</p>
            )}
          </ul>
        )}

        {tab === "dispon" && !loading && (
          <ul className="space-y-2">
            {dispon.map((v) => (
              <li key={v.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TruckIcon className="h-5 w-5 text-text-muted" />
                    <div>
                      <p className="font-semibold text-text">{v.plate}</p>
                      <p className="text-xs text-text-muted">
                        {v.tipo}
                        {v.motivo ? ` · ${v.motivo}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[v.status]}`}>
                    {STATUS_VEICULO_LABEL[v.status]}
                  </span>
                </div>
              </li>
            ))}
            {dispon.length === 0 && (
              <p className="text-text-muted">Nenhum veículo encontrado.</p>
            )}
          </ul>
        )}

        {tab === "gerenc" && (
          <>
            {/* TODO(Etapa 8): ligar no backend quando a feature de conjunto/GR
                (vistoria cavalo+carreta + import do laudo da gerenciadora)
                existir. Hoje é mock — não há endpoint real. */}
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Em breve — integração da gerenciadora chega na Etapa 8 (conjunto/GR).
              Os dados abaixo são de demonstração.
            </div>
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
          </>
        )}

        {tab === "templates" && !loading && (
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
              {templates.length === 0 && (
                <p className="text-text-muted">Nenhum template cadastrado.</p>
              )}
            </ul>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setNovoTpl(true)}>
              <Plus className="mr-1 h-4 w-4" /> Novo template
            </Button>
          </>
        )}
      </div>

      {/* Modal: registrar checklist da gerenciadora (mock — Etapa 8) */}
      {regAlvo && (
        <RegistrarGerenciadora
          alvo={regAlvo}
          onClose={() => setRegAlvo(null)}
          onConfirm={() => setRegAlvo(null)}
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
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => {
              setEditTpl(verTpl);
              setVerTpl(null);
            }}
          >
            Editar template
          </Button>
        </Modal>
      )}

      {/* Modal: novo / editar template */}
      {(novoTpl || editTpl) && (
        <NovoTemplate
          editing={editTpl}
          onClose={() => {
            setNovoTpl(false);
            setEditTpl(null);
          }}
          onSaved={(t) => {
            setTemplates((p) =>
              editTpl ? p.map((x) => (x.id === t.id ? t : x)) : [...p, t],
            );
            setNovoTpl(false);
            setEditTpl(null);
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

/** Rascunho de item no editor — valorMeta como string até o submit. */
interface TemplateItemDraft {
  titulo: string;
  bloqueante: boolean;
  tipoCampo: FleetChecklistTipoCampo;
  descricao: string;
  unidade: string;
  valorMeta: string;
}

function NovoTemplate({
  onClose,
  onSaved,
  editing,
}: {
  onClose: () => void;
  onSaved: (t: FleetChecklistTemplate) => void;
  editing?: FleetChecklistTemplate | null;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [tipo, setTipo] = useState<FleetChecklistTipo>(editing?.tipo ?? "DIARIO");
  const [itens, setItens] = useState<TemplateItemDraft[]>(
    editing?.itens.map((it) => ({
      titulo: it.titulo,
      bloqueante: !!it.bloqueante,
      tipoCampo: it.tipoCampo ?? "BOOLEAN",
      descricao: it.descricao ?? "",
      unidade: it.unidade ?? "",
      valorMeta: it.valorMeta != null ? String(it.valorMeta) : "",
    })) ?? [],
  );
  const [itemTitulo, setItemTitulo] = useState("");
  const [itemBloq, setItemBloq] = useState(false);
  const [itemTipoCampo, setItemTipoCampo] = useState<FleetChecklistTipoCampo>("BOOLEAN");
  const [itemDescricao, setItemDescricao] = useState("");
  const [itemUnidade, setItemUnidade] = useState("");
  const [itemValorMeta, setItemValorMeta] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function addItem() {
    if (!itemTitulo.trim()) return;
    setItens((p) => [
      ...p,
      {
        titulo: itemTitulo.trim(),
        bloqueante: itemBloq,
        tipoCampo: itemTipoCampo,
        descricao: itemDescricao.trim(),
        unidade: itemTipoCampo === "NUMERO" ? itemUnidade.trim() : "",
        valorMeta: itemTipoCampo === "NUMERO" ? itemValorMeta.trim() : "",
      },
    ]);
    setItemTitulo("");
    setItemBloq(false);
    setItemTipoCampo("BOOLEAN");
    setItemDescricao("");
    setItemUnidade("");
    setItemValorMeta("");
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const payload = {
        tipo,
        nome: nome.trim(),
        periodicidadeDias: tipo === "DIARIO" ? 1 : tipo === "CALIBRAGEM" ? 10 : undefined,
        itens: itens.map((it, i) => {
          const numero = it.tipoCampo === "NUMERO";
          const meta = numero && it.valorMeta.trim() ? Number(it.valorMeta) : undefined;
          return {
            codigo: `IT${i + 1}`,
            titulo: it.titulo,
            bloqueante: it.bloqueante,
            tipoCampo: it.tipoCampo,
            descricao: it.descricao.trim() || undefined,
            unidade: numero && it.unidade.trim() ? it.unidade.trim() : undefined,
            valorMeta: meta != null && !Number.isNaN(meta) ? meta : undefined,
          };
        }),
      };
      const saved = editing
        ? await updateTemplateAdmin(editing.id, payload)
        : await createTemplateAdmin(payload);
      onSaved(saved);
    } catch (e) {
      setErro(
        extractApiError(
          e,
          editing
            ? "Não foi possível salvar o template."
            : "Não foi possível criar o template.",
        ),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal title={editing ? "Editar template" : "Novo template"} onClose={onClose}>
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
          <li key={i} className="flex items-start justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="text-text">
                {it.titulo}
                {it.bloqueante && <span className="ml-2 text-xs text-red-600">bloqueante</span>}
                {it.tipoCampo === "NUMERO" && (
                  <span className="ml-2 text-xs text-primary">
                    valor{it.valorMeta ? ` · meta ${it.valorMeta}${it.unidade ? ` ${it.unidade}` : ""}` : ""}
                  </span>
                )}
              </span>
              {it.descricao && (
                <p className="mt-0.5 truncate text-xs text-text-muted">{it.descricao}</p>
              )}
            </div>
            <button onClick={() => setItens((p) => p.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-text-muted" />
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-border p-3">
        <div className="flex items-center gap-2">
          <Input value={itemTitulo} onChange={(e) => setItemTitulo(e.target.value)} placeholder="Novo item" />
          <button
            onClick={() => setItemBloq((b) => !b)}
            className={`shrink-0 rounded-lg border px-2 py-2 text-xs font-semibold ${
              itemBloq ? "border-red-400 bg-red-50 text-red-700" : "border-border text-text-muted"
            }`}
            title="Item bloqueante"
          >
            bloq
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          {(
            [
              ["BOOLEAN", "Conforme/Não"],
              ["NUMERO", "Valor numérico"],
            ] as [FleetChecklistTipoCampo, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setItemTipoCampo(val)}
              className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                itemTipoCampo === val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {itemTipoCampo === "NUMERO" && (
          <div className="mt-2 flex gap-2">
            <Input
              value={itemUnidade}
              onChange={(e) => setItemUnidade(e.target.value)}
              placeholder="Unidade (ex.: psi)"
            />
            <Input
              inputMode="numeric"
              value={itemValorMeta}
              onChange={(e) => setItemValorMeta(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="Valor meta"
            />
          </div>
        )}

        <Input
          className="mt-2"
          value={itemDescricao}
          onChange={(e) => setItemDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
        />

        <Button variant="outline" className="mt-2 w-full" onClick={addItem} disabled={!itemTitulo.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar item
        </Button>
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      <Button
        className="mt-4 w-full"
        disabled={!nome.trim() || itens.length === 0 || salvando}
        onClick={salvar}
      >
        {salvando
          ? "Salvando…"
          : editing
            ? "Salvar alterações"
            : "Criar template"}
      </Button>
    </Modal>
  );
}
