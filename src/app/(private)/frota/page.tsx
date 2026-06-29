"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  aprovarChecklist,
  createTemplateAdmin,
  updateTemplateAdmin,
  listChecklistsAguardandoAprovacao,
  listChecklistsEmAndamento,
  listMaintenanceRequests,
  listTemplatesAdmin,
  listVehicleAvailability,
  rejectMaintenanceRequest,
  reprovarChecklist,
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

type Tab =
  | "chegadas"
  | "aprovacoes"
  | "afazer"
  | "dispon"
  | "gerenc"
  | "templates";

const TABS: { id: Tab; label: string }[] = [
  { id: "chegadas", label: "Chegadas" },
  { id: "aprovacoes", label: "Aprovações" },
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

/** Data local (YYYY-MM-DD) de um ISO, no fuso do dispositivo — base do filtro por dia. */
function localDay(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function FrotaPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("chegadas");

  // Tenant ADM (x-tenant-id) — resolvido uma vez antes de carregar as abas.
  const [tenantReady, setTenantReady] = useState(false);

  // Dados reais por aba.
  const [chegadas, setChegadas] = useState<FleetChecklist[]>([]);
  const [aprovacoes, setAprovacoes] = useState<FleetChecklist[]>([]);
  const [afazer, setAfazer] = useState<MaintenanceRequest[]>([]);
  const [dispon, setDispon] = useState<VehicleAvailability[]>([]);
  const [templates, setTemplates] = useState<FleetChecklistTemplate[]>([]);

  // Gerenciadora: ainda mock (depende da feature de conjunto/GR — Etapa 8).
  const [gerenc] = useState<GerenciadoraPendente[]>(MOCK_GERENCIADORA);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  // Filtros da aba "Chegadas".
  const [chDay, setChDay] = useState("");
  const [chVehicle, setChVehicle] = useState("all");
  const [chMotorista, setChMotorista] = useState("all");

  // Modais
  const [regAlvo, setRegAlvo] = useState<GerenciadoraPendente | null>(null);
  const [reprovarAlvo, setReprovarAlvo] = useState<FleetChecklist | null>(null);
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
        } else if (which === "aprovacoes") {
          setAprovacoes(await listChecklistsAguardandoAprovacao());
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

  async function aprovar(id: string) {
    setErro(null);
    setAcaoId(id);
    try {
      await aprovarChecklist(id);
      setAprovacoes((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      setErro(extractApiError(e, "Não foi possível aprovar o checklist."));
    } finally {
      setAcaoId(null);
    }
  }

  async function reprovar(id: string, nota?: string) {
    setErro(null);
    setAcaoId(id);
    try {
      await reprovarChecklist(id, nota);
      setAprovacoes((p) => p.filter((c) => c.id !== id));
      setReprovarAlvo(null);
    } catch (e) {
      setErro(extractApiError(e, "Não foi possível reprovar o checklist."));
    } finally {
      setAcaoId(null);
    }
  }

  // Opções de filtro derivadas das chegadas carregadas.
  const chVehicleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of chegadas) map.set(c.vehicleId, c.vehicle?.plate ?? c.vehicleId);
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [chegadas]);

  const chMotoristaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of chegadas) if (c.motoristaNome?.trim()) set.add(c.motoristaNome.trim());
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [chegadas]);

  const chegadasFiltradas = useMemo(
    () =>
      chegadas
        .filter((c) => chVehicle === "all" || c.vehicleId === chVehicle)
        .filter((c) => chMotorista === "all" || c.motoristaNome === chMotorista)
        .filter((c) => !chDay || localDay(c.createdAt) === chDay),
    [chegadas, chVehicle, chMotorista, chDay],
  );

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
          <>
            {/* Filtros: dia, veículo e motorista */}
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Dia</label>
                <Input type="date" value={chDay} onChange={(e) => setChDay(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Veículo</label>
                <select
                  value={chVehicle}
                  onChange={(e) => setChVehicle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary"
                >
                  <option value="all">Todos</option>
                  {chVehicleOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Motorista</label>
                <select
                  value={chMotorista}
                  onChange={(e) => setChMotorista(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary"
                >
                  <option value="all">Todos</option>
                  {chMotoristaOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {chDay && (
              <button
                onClick={() => setChDay("")}
                className="mb-3 text-xs font-medium text-primary hover:underline"
              >
                Limpar dia
              </button>
            )}

            <ul className="space-y-2">
              {chegadasFiltradas.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">
                      {c.vehicle?.plate ?? c.vehicleId}
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {c.motoristaNome ? `${c.motoristaNome} · ` : ""}
                    {TIPO_LABEL[c.tipo]} · {c.itens.length} itens
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
              {chegadasFiltradas.length === 0 && (
                <p className="text-text-muted">
                  {chegadas.length === 0
                    ? "Nenhum checklist em andamento."
                    : "Nenhum checklist para os filtros selecionados."}
                </p>
              )}
            </ul>
          </>
        )}

        {tab === "aprovacoes" && !loading && (
          <ul className="space-y-2">
            {aprovacoes.map((c) => {
              const plate = c.vehicle?.plate ?? c.vehicleId;
              const model = c.vehicle?.model ?? null;
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/checklist/${c.id}`)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-text">
                        {c.motoristaNome ?? "Motorista"}
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {new Date(c.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">
                      {plate}
                      {model ? ` · ${model}` : ""} · {TIPO_LABEL[c.tipo]}
                    </p>
                    <p className="mt-1 text-xs text-primary">
                      Ver itens do checklist
                    </p>
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      disabled={acaoId === c.id}
                      onClick={() => aprovar(c.id)}
                    >
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button
                      variant="danger"
                      disabled={acaoId === c.id}
                      onClick={() => setReprovarAlvo(c)}
                    >
                      <X className="mr-1 h-4 w-4" /> Reprovar
                    </Button>
                  </div>
                </li>
              );
            })}
            {aprovacoes.length === 0 && (
              <p className="text-text-muted">
                Nenhum checklist aguardando aprovação. ✅
              </p>
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

      {/* Modal: reprovar checklist (nota opcional) */}
      {reprovarAlvo && (
        <ReprovarChecklist
          alvo={reprovarAlvo}
          saving={acaoId === reprovarAlvo.id}
          onClose={() => setReprovarAlvo(null)}
          onConfirm={(nota) => reprovar(reprovarAlvo.id, nota)}
        />
      )}

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

function ReprovarChecklist({
  alvo,
  saving,
  onClose,
  onConfirm,
}: {
  alvo: FleetChecklist;
  saving: boolean;
  onClose: () => void;
  onConfirm: (nota?: string) => void;
}) {
  const [nota, setNota] = useState("");
  const plate = alvo.vehicle?.plate ?? alvo.vehicleId;
  return (
    <Modal title="Reprovar checklist" onClose={onClose}>
      <p className="mb-3 text-sm text-text-muted">
        {alvo.motoristaNome ?? "Motorista"} · {plate} · {TIPO_LABEL[alvo.tipo]}
      </p>
      <label className="text-sm text-text-muted">Nota (opcional)</label>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={3}
        placeholder="Motivo da reprovação"
        className="mb-4 mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
      />
      <Button
        variant="danger"
        className="w-full"
        disabled={saving}
        onClick={() => onConfirm(nota.trim() || undefined)}
      >
        {saving ? "Reprovando…" : "Confirmar reprovação"}
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
