"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAFazer, listDriverVehicles } from "@/services/checklistService";
import type { DriverVehicle } from "@/types/checklist.types";

/** Reconhecimento de fala do navegador (Web Speech API) — sem chave externa. */
function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function AFazerPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [search, setSearch] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [description, setDescription] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    listDriverVehicles()
      .then(setVehicles)
      .catch(() => setError("Falha ao carregar veículos (offline?)."));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return q ? vehicles.filter((v) => v.plate.toUpperCase().includes(q)) : vehicles.slice(0, 30);
  }, [vehicles, search]);

  const speechAvailable = useMemo(() => getSpeechRecognition() != null, []);

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setDescription((prev) => (prev ? `${prev} ${text}` : text).trim());
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function handleSubmit() {
    if (!vehicleId || !description.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createAFazer({
        vehicleId,
        description: description.trim(),
        voiceTranscript: description.trim(),
      });
      router.push("/");
    } catch {
      setError("Falha ao enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3 pt-2">
        <button onClick={() => router.push("/")} className="rounded-lg p-2 hover:bg-surface-muted">
          <ArrowLeft className="h-5 w-5 text-text" />
        </button>
        <h1 className="text-xl font-bold text-text">A fazer (voz)</h1>
      </header>
      {error && <p className="mb-3 text-red-600">{error}</p>}

      <label className="text-sm text-text-muted">Veículo (placa)</label>
      <Input
        className="mt-1"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar placa…"
      />
      <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
        {filtered.map((v) => (
          <li key={v.id}>
            <button
              onClick={() => setVehicleId(v.id)}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                vehicleId === v.id ? "border-primary bg-primary/10" : "border-border"
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

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm text-text-muted">O que precisa ser feito</label>
          {speechAvailable && (
            <button
              onClick={toggleMic}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                listening ? "bg-red-600 text-white" : "bg-primary/10 text-primary"
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? "Parar" : "Falar"}
            </button>
          )}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Ex.: a luz do farol direito queimou, o ar não está gelando…"
          className="w-full rounded-lg border border-border bg-surface p-3 text-text outline-none focus:border-primary"
        />
      </div>

      <Button
        className="mt-6 w-full"
        disabled={busy || !vehicleId || !description.trim()}
        onClick={handleSubmit}
      >
        {busy ? "Enviando…" : "Enviar para a Frota"}
      </Button>
    </div>
  );
}
