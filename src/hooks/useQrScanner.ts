"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseQrScannerOptions {
  onScanSuccess: (decodedText: string) => void;
}

interface UseQrScannerReturn {
  scannerContainerId: string;
  isScanning: boolean;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => Promise<void>;
}

export function useQrScanner({
  onScanSuccess,
}: UseQrScannerOptions): UseQrScannerReturn {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(
    "qr-scanner-" + Math.random().toString(36).slice(2),
  );
  const onScanSuccessRef = useRef(onScanSuccess);
  const isMountedRef = useRef(true);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopScanning = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Scanner may already be stopped
    }
    scannerRef.current = null;
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  const startScanning = useCallback(async () => {
    // Ensure previous instance is cleaned up
    if (scannerRef.current) {
      await stopScanning();
    }

    // Wait for DOM element to be available
    const container = document.getElementById(containerId.current);
    if (!container) {
      console.error("Scanner container not found:", containerId.current);
      return;
    }

    const scanner = new Html5Qrcode(containerId.current);
    scannerRef.current = scanner;
    setError(null);

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            return { width: Math.floor(size), height: Math.floor(size) };
          },
          disableFlip: false,
        },
        (decodedText) => {
          onScanSuccessRef.current(decodedText);
        },
        () => {
          // Frame without QR — expected, ignore
        },
      );

      if (isMountedRef.current) {
        setIsScanning(true);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao iniciar scanner";
      console.error("Erro ao iniciar scanner QR:", msg);
      if (isMountedRef.current) {
        setError(msg);
        setIsScanning(false);
      }
    }
  }, [stopScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          if (scanner.isScanning) {
            scanner.stop();
          }
          scanner.clear();
        } catch {
          // Cleanup error — ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return {
    scannerContainerId: containerId.current,
    isScanning,
    error,
    startScanning,
    stopScanning,
  };
}
