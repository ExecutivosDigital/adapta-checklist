"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Loader2, RefreshCw } from "lucide-react";

interface QrScannerViewProps {
  onQrRead: (data: string) => void;
  onClose: () => void;
  title?: string;
}

export function QrScannerView({
  onQrRead,
  onClose,
  title,
}: QrScannerViewProps) {
  const [status, setStatus] = useState<"loading" | "scanning" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerIdRef = useRef(
    "qr-reader-" + Math.random().toString(36).slice(2, 8),
  );
  const onQrReadRef = useRef(onQrRead);
  onQrReadRef.current = onQrRead;
  const didScanRef = useRef(false);

  const cleanup = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* already stopped */
    }
  };

  const start = async () => {
    await cleanup();

    setStatus("loading");
    setErrorMsg("");
    didScanRef.current = false;

    const el = document.getElementById(containerIdRef.current);
    if (!el) {
      setStatus("error");
      setErrorMsg("Container da câmera não encontrado.");
      return;
    }

    // Clear any leftover children from a previous run
    el.innerHTML = "";

    const scanner = new Html5Qrcode(containerIdRef.current);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (didScanRef.current) return;
          didScanRef.current = true;

          // Stop first, then notify parent
          const s = scannerRef.current;
          scannerRef.current = null;
          if (s && s.isScanning) {
            s.stop()
              .then(() => s.clear())
              .catch(() => {})
              .finally(() => onQrReadRef.current(decodedText));
          } else {
            onQrReadRef.current(decodedText);
          }
        },
        () => {
          /* frame without QR — normal */
        },
      );
      setStatus("scanning");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao acessar a câmera";
      console.error("QR Scanner error:", msg);
      setStatus("error");
      setErrorMsg(msg);
    }
  };

  useEffect(() => {
    // Small delay so the container div is in the DOM
    const timer = setTimeout(start, 300);
    return () => {
      clearTimeout(timer);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col bg-black">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-6">
        <h2 className="text-lg font-semibold text-white drop-shadow">
          {title || "Escanear QR Code"}
        </h2>
        <button
          onClick={() => {
            cleanup();
            onClose();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* html5-qrcode renders its video + canvas inside this div */}
      <div
        id={containerIdRef.current}
        className="flex-1"
        style={{ minHeight: "100%" }}
      />

      {/* Loading */}
      {status === "loading" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="text-sm text-white/80">Abrindo câmera...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="rounded-xl bg-red-500/90 px-5 py-3 text-sm text-white">
              {errorMsg || "Não foi possível acessar a câmera."}
            </p>
            <button
              onClick={start}
              className="flex items-center gap-2 rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Instruction hint at bottom */}
      {status === "scanning" && (
        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
          <p className="rounded-full bg-black/60 px-5 py-2 text-center text-sm text-white/90 backdrop-blur-sm">
            Aponte para o QR Code da nota fiscal
          </p>
        </div>
      )}
    </div>
  );
}
