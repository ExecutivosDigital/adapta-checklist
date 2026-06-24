"use client";

import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_STORAGE_KEY = "adapta-driver-install-dismissed-at";
// Quanto tempo respeitar o "dismiss" do usuário antes de mostrar de novo.
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
// Espera antes de mostrar o banner depois de pronto pra prompt — evita popup
// imediato logo após login.
const SHOW_DELAY_MS = 3000;

function isDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_COOLDOWN_MS;
}

function markDismissed() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
}

export function InstallBanner() {
  const { isStandalone, isIOS, canPrompt, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);

  useEffect(() => {
    if (isStandalone) return; // já instalado
    if (isDismissedRecently()) return;

    // Só mostra se tem caminho de instalação (Android prompt OU iOS)
    const eligible = canPrompt || isIOS;
    if (!eligible) return;

    const id = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [isStandalone, isIOS, canPrompt]);

  if (!visible || isStandalone) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setIosModalOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted" || outcome === "dismissed") {
      // Em ambos os casos somem o banner — "dismissed" entra no cooldown.
      if (outcome === "dismissed") markDismissed();
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    markDismissed();
    setVisible(false);
  };

  return (
    <>
      <div
        role="dialog"
        aria-label="Instalar Adapta Motorista"
        className="fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-40 mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl border border-primary/30 bg-white p-3 shadow-xl sm:bottom-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Instalar Adapta Motorista
            </p>
            <p className="text-xs text-gray-600">
              Acesse direto da tela inicial, sem URL bar.
            </p>
          </div>
          <Button size="sm" className="h-9 shrink-0" onClick={handleInstall}>
            Instalar
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Modal
        visible={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
        title="Instalar no iPhone/iPad"
        description="O Safari permite adicionar o app à sua tela inicial."
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Share className="h-4 w-4" />
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">1.</span> Toque no botão{" "}
              <strong>Compartilhar</strong> (ícone de seta para cima) na barra
              inferior.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SquarePlus className="h-4 w-4" />
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold">2.</span> Role e selecione{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              3
            </div>
            <div className="text-sm text-gray-700">
              Confirme tocando em <strong>Adicionar</strong>. O ícone do app vai
              aparecer na sua tela inicial.
            </div>
          </div>

          <Button
            className="h-11 w-full"
            onClick={() => {
              setIosModalOpen(false);
              markDismissed();
              setVisible(false);
            }}
          >
            Entendi
          </Button>
        </div>
      </Modal>
    </>
  );
}
