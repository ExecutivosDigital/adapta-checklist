"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOverlayMode } from "@/types/driver.types";
import { CameraOverlay } from "./CameraOverlay";
import { X, Camera, Loader2, RefreshCw } from "lucide-react";

interface PhotoCaptureViewProps {
  overlayMode: CameraOverlayMode;
  onCapture: (photoDataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

export function PhotoCaptureView({
  overlayMode,
  onCapture,
  onClose,
  title,
}: PhotoCaptureViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"loading" | "active" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    cleanup();
    setStatus("loading");
    setErrorMsg("");

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStatus("active");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao acessar a câmera";
      console.error("Camera error:", msg);
      setStatus("error");
      setErrorMsg(msg);
    }
  };

  useEffect(() => {
    startCamera();
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || status !== "active") return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    cleanup();
    onCapture(dataUrl);
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-6">
        <h2 className="text-lg font-semibold text-white drop-shadow">
          {title || "Tirar Foto"}
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

      {/* Video feed — always in DOM so ref is available */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Overlay */}
      {status === "active" && <CameraOverlay mode={overlayMode} />}

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
              onClick={startCamera}
              className="flex items-center gap-2 rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Shutter button */}
      <div className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2">
        <button
          onClick={handleCapture}
          disabled={status !== "active"}
          className="bg-primary flex h-20 w-20 items-center justify-center rounded-full border-4 border-white shadow-2xl transition-transform active:scale-90 disabled:opacity-50"
        >
          <Camera className="h-8 w-8 text-white" />
        </button>
      </div>
    </div>
  );
}
