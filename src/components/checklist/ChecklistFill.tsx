"use client";

import { useMemo, useState } from "react";
import { Camera, Check, CircleSlash, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoCaptureView } from "@/components/camera/PhotoCaptureView";
import {
  concludeChecklist,
  uploadItemPhoto,
} from "@/services/checklistService";
import type {
  FleetChecklist,
  FleetChecklistItemStatus,
  SaveChecklistItemInput,
} from "@/types/checklist.types";

const STATUS_BTN: {
  status: FleetChecklistItemStatus;
  label: string;
  icon: typeof Check;
  on: string;
}[] = [
  { status: "CONFORME", label: "OK", icon: Check, on: "bg-green-600 text-white" },
  { status: "NAO_CONFORME", label: "Não", icon: X, on: "bg-red-600 text-white" },
  { status: "NAO_APLICAVEL", label: "N/A", icon: CircleSlash, on: "bg-gray-500 text-white" },
];

interface ChecklistFillProps {
  checklist: FleetChecklist;
  readOnly?: boolean;
  onDone: () => void;
}

export function ChecklistFill({ checklist, readOnly, onDone }: ChecklistFillProps) {
  const [answers, setAnswers] = useState<Record<string, SaveChecklistItemInput>>(
    () =>
      Object.fromEntries(
        checklist.itens.map((i) => [
          i.id,
          {
            id: i.id,
            status: i.status,
            observacoes: i.observacoes ?? undefined,
            fotoUrl: i.fotoUrl ?? undefined,
            valorAtual: i.valorAtual ?? undefined,
          },
        ]),
      ),
  );
  const [km, setKm] = useState(checklist.odometer ? String(checklist.odometer) : "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ bloqueantes: string[] } | null>(null);
  /** Id do item que está com a câmera aberta (null = câmera fechada). */
  const [cameraItemId, setCameraItemId] = useState<string | null>(null);
  /** Ids de itens com foto enfileirada/subindo. */
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  function setItem(id: string, patch: Partial<SaveChecklistItemInput>) {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, id } }));
  }

  async function handlePhotoCapture(itemId: string, photoDataUrl: string) {
    setCameraItemId(null);
    // Preview otimista imediato (data URL da captura).
    setItem(itemId, { fotoUrl: photoDataUrl });
    setUploadingIds((prev) => new Set(prev).add(itemId));
    try {
      // Enfileira o upload (offline-safe). A URL real é persistida no item
      // quando a fila drenar; aqui só guardamos a preview otimista.
      const url = await uploadItemPhoto(checklist.id, itemId, photoDataUrl);
      setItem(itemId, { fotoUrl: url });
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  const respondidos = useMemo(
    () => Object.values(answers).filter((a) => a.status !== "PENDENTE").length,
    [answers],
  );

  async function handleConclude() {
    setBusy(true);
    try {
      await concludeChecklist(checklist.id, {
        itens: Object.values(answers).filter((a) => a.status !== "PENDENTE"),
        odometer: km ? Number(km) : undefined,
      });
      const bloqueantes = checklist.itens
        .filter((i) => i.bloqueante && answers[i.id]?.status === "NAO_CONFORME")
        .map((i) => i.titulo);
      setResult({ bloqueantes });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {!readOnly && (
        <div className="mb-4">
          <label className="text-sm text-text-muted">Cont/Km</label>
          <Input
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))}
            placeholder="Odômetro atual"
          />
        </div>
      )}

      <ul className="space-y-3">
        {checklist.itens.map((item) => {
          const a = answers[item.id];
          return (
            <li key={item.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-text">{item.titulo}</span>
                {item.bloqueante && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    bloqueante
                  </span>
                )}
              </div>

              {item.descricao && (
                <p className="mb-2 text-sm text-text-muted">{item.descricao}</p>
              )}

              {item.tipoCampo === "NUMERO" && (
                <div className="mb-2">
                  {item.valorMeta != null && (
                    <p className="mb-1 text-xs font-medium text-primary">
                      Necessário: {item.valorMeta}
                      {item.unidade ? ` ${item.unidade}` : ""}
                    </p>
                  )}
                  {!readOnly ? (
                    <Input
                      inputMode="decimal"
                      value={a?.valorAtual != null ? String(a.valorAtual) : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".");
                        const num = raw === "" ? undefined : Number(raw);
                        setItem(item.id, {
                          valorAtual: num != null && !Number.isNaN(num) ? num : undefined,
                        });
                      }}
                      placeholder={`Valor atual${item.unidade ? ` (${item.unidade})` : ""}`}
                    />
                  ) : (
                    <p className="text-sm text-text">
                      Valor: {a?.valorAtual != null ? a.valorAtual : "—"}
                      {item.unidade && a?.valorAtual != null ? ` ${item.unidade}` : ""}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {STATUS_BTN.map((b) => {
                  const Icon = b.icon;
                  const active = a?.status === b.status;
                  return (
                    <button
                      key={b.status}
                      disabled={readOnly}
                      onClick={() => setItem(item.id, { status: b.status })}
                      className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-sm font-semibold transition disabled:opacity-70 ${
                        active ? b.on : "border-border text-text-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {b.label}
                    </button>
                  );
                })}
              </div>

              {!readOnly && !!a?.status && a.status !== "PENDENTE" && (
                <Input
                  className="mt-2"
                  value={a.observacoes ?? ""}
                  onChange={(e) => setItem(item.id, { observacoes: e.target.value })}
                  placeholder="Observação (opcional)"
                />
              )}

              {!readOnly &&
                (() => {
                  const naoConforme = a?.status === "NAO_CONFORME";
                  return (
                    <button
                      type="button"
                      onClick={() => setCameraItemId(item.id)}
                      className={`mt-2 flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                        naoConforme
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-border text-text-muted"
                      }`}
                    >
                      {uploadingIds.has(item.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {a?.fotoUrl ? "Trocar foto" : "Anexar foto"}
                      {naoConforme && !a?.fotoUrl && (
                        <span className="text-xs font-semibold">(recomendado)</span>
                      )}
                    </button>
                  );
                })()}

              {a?.fotoUrl && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.fotoUrl}
                    alt="evidência"
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  {uploadingIds.has(item.id) && (
                    <p className="mt-1 text-xs text-text-muted">Enviando foto…</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!readOnly && (
        <div className="sticky bottom-2 mt-4">
          <Button className="w-full" disabled={busy || respondidos === 0} onClick={handleConclude}>
            {busy ? "Concluindo…" : `Concluir (${respondidos}/${checklist.itens.length})`}
          </Button>
        </div>
      )}

      {cameraItemId && (
        <div className="fixed inset-0 z-[60] bg-black">
          <PhotoCaptureView
            overlayMode="document-rectangle"
            title="Foto da evidência"
            onCapture={(dataUrl) => void handlePhotoCapture(cameraItemId, dataUrl)}
            onClose={() => setCameraItemId(null)}
          />
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 text-center">
            {result.bloqueantes.length > 0 ? (
              <>
                <TriangleAlert className="mx-auto mb-2 h-10 w-10 text-red-600" />
                <p className="text-lg font-bold text-text">Veículo indisponível</p>
                <p className="mt-1 text-sm text-text-muted">
                  Itens bloqueantes reprovados — o veículo vai para manutenção:
                </p>
                <ul className="mt-2 text-sm font-medium text-red-700">
                  {result.bloqueantes.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <Check className="mx-auto mb-2 h-10 w-10 text-green-600" />
                <p className="text-lg font-bold text-text">Checklist concluído</p>
                <p className="mt-1 text-sm text-text-muted">
                  Sem itens bloqueantes — veículo segue disponível.
                </p>
              </>
            )}
            <Button className="mt-5 w-full" onClick={onDone}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
