"use client";

import { useCameraContext } from "@/context/CameraContext";
import { QrScannerView } from "./QrScannerView";
import { PhotoCaptureView } from "./PhotoCaptureView";
import { CheckCircle2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraWorkflowModalProps {
  onQrQuickScanResult?: (qrData: string) => void;
}

export function CameraWorkflowModal({
  onQrQuickScanResult,
}: CameraWorkflowModalProps) {
  const {
    isOpen,
    workflowType,
    scannedDocuments,
    currentStep,
    closeWorkflow,
    setQrResult,
    setPhotoResult,
    addAnotherDocument,
    finishWorkflow,
  } = useCameraContext();

  if (!isOpen) return null;

  const getTitle = () => {
    switch (currentStep) {
      case "scanning-qr":
        return workflowType === "qr-quick-scan"
          ? "Escanear Nota Fiscal"
          : `Escanear QR Code (NF ${scannedDocuments.length + 1})`;
      case "capturing-nf-photo":
        return `Fotografar Nota Fiscal ${scannedDocuments.length + 1}`;
      case "capturing-canhoto-photo":
        return `Fotografar Comprovante ${scannedDocuments.length + 1}`;
      default:
        return "";
    }
  };

  const handleQrRead = (data: string) => {
    if (workflowType === "qr-quick-scan") {
      closeWorkflow();
      onQrQuickScanResult?.(data);
      return;
    }
    setQrResult(data);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      {/* Counter badge */}
      {workflowType !== "qr-quick-scan" &&
        currentStep !== "done" &&
        scannedDocuments.length > 0 && (
          <div className="absolute right-4 top-16 z-50">
            <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
              {scannedDocuments.length} escaneado
              {scannedDocuments.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

      {/* QR Scanner */}
      {currentStep === "scanning-qr" && (
        <QrScannerView
          onQrRead={handleQrRead}
          onClose={closeWorkflow}
          title={getTitle()}
        />
      )}

      {/* Photo: Nota Fiscal */}
      {currentStep === "capturing-nf-photo" && (
        <PhotoCaptureView
          overlayMode="qr-square"
          onCapture={setPhotoResult}
          onClose={closeWorkflow}
          title={getTitle()}
        />
      )}

      {/* Photo: Comprovante/Canhoto */}
      {currentStep === "capturing-canhoto-photo" && (
        <PhotoCaptureView
          overlayMode="document-rectangle"
          onCapture={setPhotoResult}
          onClose={closeWorkflow}
          title={getTitle()}
        />
      )}

      {/* Done — add more or finish */}
      {currentStep === "done" && (
        <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>

          <h2 className="text-xl font-bold text-white">
            Documento registrado!
          </h2>

          <p className="text-center text-sm text-text-subtle">
            {scannedDocuments.length} documento
            {scannedDocuments.length > 1 ? "s" : ""} escaneado
            {scannedDocuments.length > 1 ? "s" : ""} nesta sessão.
          </p>

          <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
            <Button
              variant="outline"
              className="h-14 w-full border-2 border-white/30 text-base font-semibold text-white hover:bg-white/10"
              onClick={addAnotherDocument}
            >
              <Plus className="mr-2 h-5 w-5" />
              Escanear outro documento
            </Button>
            <Button
              className="h-14 w-full text-base font-semibold"
              onClick={finishWorkflow}
            >
              <Check className="mr-2 h-5 w-5" />
              Finalizar ({scannedDocuments.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
