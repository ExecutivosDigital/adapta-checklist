"use client";

import { useEffect, useRef } from "react";
import { CameraOverlayMode } from "@/types/driver.types";
import { CameraOverlay } from "./CameraOverlay";

interface CameraViewProps {
  stream: MediaStream | null;
  overlayMode: CameraOverlayMode;
  children?: React.ReactNode;
}

export function CameraView({ stream, overlayMode, children }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked — user interaction will retry
      });
    }
  }, [stream]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <CameraOverlay mode={overlayMode} />
      {children}
    </div>
  );
}
