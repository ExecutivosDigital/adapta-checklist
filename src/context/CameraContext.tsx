"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  TripDocument,
  CameraWorkflowStep,
  CameraWorkflowType,
} from "@/types/driver.types";

type OnCompleteCallback = (docs: TripDocument[]) => void;

interface CameraContextType {
  isOpen: boolean;
  workflowType: CameraWorkflowType | null;
  scannedDocuments: TripDocument[];
  currentStep: CameraWorkflowStep;
  openWorkflow: (
    type: CameraWorkflowType,
    onComplete?: OnCompleteCallback,
  ) => void;
  closeWorkflow: () => void;
  setQrResult: (data: string) => void;
  setPhotoResult: (uri: string) => void;
  addAnotherDocument: () => void;
  finishWorkflow: () => void;
}

const CameraContext = createContext<CameraContextType>({
  isOpen: false,
  workflowType: null,
  scannedDocuments: [],
  currentStep: "idle",
  openWorkflow: () => {},
  closeWorkflow: () => {},
  setQrResult: () => {},
  setPhotoResult: () => {},
  addAnotherDocument: () => {},
  finishWorkflow: () => {},
});

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [workflowType, setWorkflowType] =
    useState<CameraWorkflowType | null>(null);
  const [scannedDocuments, setScannedDocuments] = useState<TripDocument[]>([]);
  const [currentStep, setCurrentStep] = useState<CameraWorkflowStep>("idle");

  // Use refs for values accessed inside callbacks to avoid stale closures
  const workflowTypeRef = useRef<CameraWorkflowType | null>(null);
  const lastQrDataRef = useRef<string | null>(null);
  const onCompleteRef = useRef<OnCompleteCallback | null>(null);
  const scannedDocsRef = useRef<TripDocument[]>([]);

  const openWorkflow = useCallback(
    (type: CameraWorkflowType, onComplete?: OnCompleteCallback) => {
      workflowTypeRef.current = type;
      lastQrDataRef.current = null;
      onCompleteRef.current = onComplete ?? null;
      scannedDocsRef.current = [];

      setWorkflowType(type);
      setScannedDocuments([]);
      setCurrentStep("scanning-qr");
      setIsOpen(true);
    },
    [],
  );

  const closeWorkflow = useCallback(() => {
    workflowTypeRef.current = null;
    lastQrDataRef.current = null;
    onCompleteRef.current = null;
    scannedDocsRef.current = [];

    setIsOpen(false);
    setWorkflowType(null);
    setCurrentStep("idle");
    setScannedDocuments([]);
  }, []);

  const setQrResult = useCallback((data: string) => {
    const nfeKey = data;
    lastQrDataRef.current = nfeKey;

    // Read from ref — always up-to-date, no stale closure
    const type = workflowTypeRef.current;
    if (type === "envio-documentos") {
      setCurrentStep("capturing-nf-photo");
    } else if (type === "entrega") {
      setCurrentStep("capturing-canhoto-photo");
    }
  }, []);

  const setPhotoResult = useCallback((uri: string) => {
    const now = new Date().toISOString();
    const docId =
      "doc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const qrData = lastQrDataRef.current ?? "";
    const nfNumber = qrData.length >= 34 ? qrData.slice(25, 34) : docId.slice(-6);
    const type = workflowTypeRef.current;

    const newDoc: TripDocument = {
      id: docId,
      tripId: "",
      notaFiscalId: qrData,
      numeroNF: nfNumber,
      destinatario: "",
      status: type === "entrega" ? "concluido" : "foto_tirada",
      qrCodeData: qrData,
      notaFiscalPhotoUri: type === "envio-documentos" ? uri : undefined,
      canhotPhotoUri: type === "entrega" ? uri : undefined,
      scannedAt: now,
      photoTakenAt: now,
    };

    scannedDocsRef.current = [...scannedDocsRef.current, newDoc];
    setScannedDocuments(scannedDocsRef.current);
    setCurrentStep("done");
    lastQrDataRef.current = null;
  }, []);

  const addAnotherDocument = useCallback(() => {
    lastQrDataRef.current = null;
    setCurrentStep("scanning-qr");
  }, []);

  const finishWorkflow = useCallback(() => {
    // Grab docs from ref BEFORE clearing state
    const docs = scannedDocsRef.current;
    const cb = onCompleteRef.current;

    // Clear everything
    workflowTypeRef.current = null;
    lastQrDataRef.current = null;
    onCompleteRef.current = null;
    scannedDocsRef.current = [];

    setIsOpen(false);
    setWorkflowType(null);
    setCurrentStep("idle");
    setScannedDocuments([]);

    // Fire callback AFTER clearing — docs are already captured above
    if (cb && docs.length > 0) {
      cb(docs);
    }
  }, []);

  return (
    <CameraContext.Provider
      value={{
        isOpen,
        workflowType,
        scannedDocuments,
        currentStep,
        openWorkflow,
        closeWorkflow,
        setQrResult,
        setPhotoResult,
        addAnotherDocument,
        finishWorkflow,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraContext() {
  return useContext(CameraContext);
}
