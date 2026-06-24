"use client";

import { cn } from "@/lib/utils"; // Assumindo que você tem essa util (padrão shadcn)
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react"; // Usando lucide-react padrão
import { Fragment } from "react";

type ModalProps = {
  className?: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string; // Adicionei título opcional para facilitar
  description?: string;
  hideCloseButton?: boolean; // Prop para esconder o botão de fechar
};

const Modal = ({
  className,
  visible,
  onClose,
  children,
  title,
  description,
  hideCloseButton = false,
}: ModalProps) => {
  return (
    <Transition show={visible} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={hideCloseButton ? () => {} : onClose}
      >
        {/* OVERLAY (Fundo escuro) */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        {/* CONTAINER DO MODAL (Centralização) */}
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            {/* PAINEL (O Cartão Branco) */}
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "relative transform overflow-hidden rounded-xl border border-slate-200 bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full",
                  className || "sm:max-w-lg", // Permite sobrescrever a largura (ex: max-w-3xl), padrão é max-w-lg
                )}
              >
                {/* Botão de Fechar Absoluto */}
                {!hideCloseButton && (
                  <button
                    type="button"
                    className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4 text-slate-500" />
                    <span className="sr-only">Fechar</span>
                  </button>
                )}

                {/* Conteúdo */}
                <div className="p-6">
                  {/* Renderiza título padrão se passado via prop, ou deixa o children cuidar disso */}
                  {(title || description) && (
                    <div className="mb-4">
                      {title && (
                        <Dialog.Title className="text-lg leading-none font-semibold tracking-tight">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="text-muted-foreground mt-1.5 text-sm">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                  )}

                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
