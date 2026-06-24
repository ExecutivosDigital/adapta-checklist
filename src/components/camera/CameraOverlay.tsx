"use client";

import { CameraOverlayMode } from "@/types/driver.types";

interface CameraOverlayProps {
  mode: CameraOverlayMode;
}

export function CameraOverlay({ mode }: CameraOverlayProps) {
  const isQr = mode === "qr-square";
  const cutoutWidth = isQr ? 250 : 320;
  const cutoutHeight = isQr ? 250 : 200;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Dark overlay with transparent cutout using SVG mask */}
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id={`cutout-mask-${mode}`}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              x="50%"
              y="50%"
              width={cutoutWidth}
              height={cutoutHeight}
              rx="16"
              ry="16"
              fill="black"
              transform={`translate(-${cutoutWidth / 2}, -${cutoutHeight / 2})`}
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask={`url(#cutout-mask-${mode})`}
        />
      </svg>

      {/* Corner decorations */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: cutoutWidth,
          height: cutoutHeight,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Top-left corner */}
        <div className="border-primary absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4" />
        {/* Top-right corner */}
        <div className="border-primary absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4" />
        {/* Bottom-left corner */}
        <div className="border-primary absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4" />
        {/* Bottom-right corner */}
        <div className="border-primary absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-2xl border-b-4 border-r-4" />
      </div>

      {/* Label */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
        <p className="rounded-full bg-black/50 px-4 py-2 text-center text-sm font-medium text-white">
          {isQr
            ? "Centralize o QR Code no quadrado"
            : "Posicione o comprovante no retângulo"}
        </p>
      </div>
    </div>
  );
}
