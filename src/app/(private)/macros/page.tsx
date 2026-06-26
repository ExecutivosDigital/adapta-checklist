"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import {
  ArrowLeft,
  CloudOff,
  Loader2,
  MapPin,
  Radio,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { listDriverVehicles } from "@/services/checklistService";
import { proximasFromType } from "@/services/macrosMock";
import {
  listMacros,
  listProximasMacros,
  passMacro,
} from "@/services/macrosService";
import type { DriverVehicle } from "@/types/checklist.types";
import type { MacroEntry, MacroType } from "@/types/macros.types";
import { matchesSearch } from "@/utils/normalizeSearch";

const MACRO_LABEL: Record<MacroType, string> = {
  RECEBIMENTO_VEICULO: "Recebimento do veículo",
  INICIO_VIAGEM: "Início de viagem",
  PARADA: "Parada",
  REFEICAO: "Refeição",
  ABASTECIMENTO: "Abastecimento",
  PERNOITE: "Pernoite",
  CHEGADA: "Chegada",
  DESCARGA: "Descarga",
  ENGATE: "Engate",
  DESENGATE: "Desengate",
  FIM_VIAGEM: "Fim de viagem",
};

/** Captura a posição atual (best-effort). Resolve `undefined` se negada/indisponível. */
function getPositionOnce(): Promise<{
  latitude: number;
  longitude: number;
} | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

export default function MacrosPage() {
  const router = useRouter();
  const { online } = useNetworkStatus();

  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [search, setSearch] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [proximas, setProximas] = useState<MacroType[]>([]);
  const [last, setLast] = useState<MacroEntry | null>(null);
  const [history, setHistory] = useState<MacroEntry[]>([]);
  const [loadingState, setLoadingState] = useState(false);
  const [passing, setPassing] = useState<MacroType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  useEffect(() => {
    listDriverVehicles()
      .then(setVehicles)
      .catch(() => setError("Falha ao carregar veículos."))
      .finally(() => setLoadingRefs(false));
  }, []);

  const loadState = useCallback(async (vid: string) => {
    setLoadingState(true);
    setError(null);
    try {
      const [prox, hist] = await Promise.all([
        listProximasMacros(vid),
        listMacros({ vehicleId: vid }),
      ]);
      setProximas(prox.proximas);
      setLast(prox.last);
      setHistory(hist);
    } catch {
      setError("Não foi possível carregar o estado das macros (offline?).");
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    if (vehicleId) void loadState(vehicleId);
  }, [vehicleId, loadState]);

  const filteredVehicles = useMemo(() => {
    const q = search.trim();
    return q
      ? vehicles.filter(
          (v) =>
            matchesSearch(v.plate, q) ||
            matchesSearch(v.brand ?? "", q) ||
            matchesSearch(v.model ?? "", q),
        )
      : vehicles.slice(0, 30);
  }, [vehicles, search]);

  /**
   * Passa a macro. Captura `occurredAt` (agora) + localização opcional, enfileira
   * (offline-safe, idempotente por clientId) e reflete OTIMISTICAMENTE o novo
   * estado: insere no histórico como `pending` e recarrega "próximas" — em MOCK
   * o estado é real; offline, atualizamos localmente pra liberar as próximas.
   */
  async function handlePass(tipo: MacroType) {
    if (!vehicleId || passing) return;
    setPassing(tipo);
    setError(null);
    try {
      const clientId = uuid();
      const occurredAt = new Date().toISOString();
      const coords = await getPositionOnce();

      const entry = await passMacro({
        vehicleId,
        tipo,
        occurredAt,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        clientId,
      });

      // Otimismo: adiciona ao histórico e assume `entry` como nova "última".
      setHistory((prev) => [...prev, entry]);
      setLast(entry);

      if (online) {
        // Online: o back já tem (ou terá) a verdade — recarrega as próximas reais.
        void loadState(vehicleId);
      } else {
        // Offline: recalcula as próximas localmente via a máquina de estados
        // pra liberar os botões seguintes mesmo sem rede.
        setProximas(proximasFromType(tipo));
      }
    } catch {
      setError("Não foi possível passar a macro.");
    } finally {
      setPassing(null);
    }
  }

  // ── Seleção de veículo ──
  if (!vehicleId) {
    return (
      <div className="p-4">
        <Header onBack={() => router.push("/")} title="Macros" />
        <p className="mb-3 text-sm text-text-muted">
          Selecione o veículo para passar as macros da viagem.
        </p>
        <Input
          placeholder="Buscar por placa, marca ou modelo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        {loadingRefs ? (
          <p className="text-text-muted">Carregando…</p>
        ) : error ? (
          <p className="text-amber-600">{error}</p>
        ) : (
          <ul className="space-y-2">
            {filteredVehicles.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => setVehicleId(v.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/40"
                >
                  <Truck className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-text">{v.plate}</p>
                    <p className="text-sm text-text-muted">
                      {[v.brand, v.model].filter(Boolean).join(" ") || v.type}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Estado + botões de macro ──
  return (
    <div className="p-4">
      <Header onBack={() => setVehicleId("")} title="Macros" />

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <Truck className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <p className="font-semibold text-text">{selectedVehicle?.plate}</p>
          <p className="text-sm text-text-muted">
            {last
              ? `Estado: ${MACRO_LABEL[last.tipo]}`
              : "Sem macros — inicie a viagem"}
          </p>
        </div>
        {!online && (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
            <CloudOff className="h-4 w-4" /> Offline
          </span>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-amber-600">{error}</p>}

      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-muted">
        <Radio className="h-4 w-4" /> Passar macro
      </h2>
      {loadingState ? (
        <p className="text-text-muted">Carregando estado…</p>
      ) : proximas.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-6 text-center text-text-muted">
          Nenhuma macro disponível a partir do estado atual.
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {proximas.map((tipo) => (
            <Button
              key={tipo}
              onClick={() => handlePass(tipo)}
              disabled={!!passing}
              className="h-auto whitespace-normal py-4 text-sm font-semibold"
            >
              {passing === tipo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {MACRO_LABEL[tipo]}
            </Button>
          ))}
        </div>
      )}

      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-muted">
        Histórico recente
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma macro registrada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {[...history].reverse().map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text">
                  {MACRO_LABEL[m.tipo]}
                </span>
                {m.pending ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                    <CloudOff className="h-3.5 w-3.5" /> Pendente
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-sm text-text-muted">
                <span>{new Date(m.occurredAt).toLocaleString("pt-BR")}</span>
                {m.latitude != null && m.longitude != null && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="mb-4 flex items-center gap-3 pt-2">
      <button
        onClick={onBack}
        className="rounded-full p-2 text-text-muted transition hover:bg-surface-muted"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-xl font-bold text-text">{title}</h1>
    </header>
  );
}
