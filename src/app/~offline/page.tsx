"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 shadow-lg">
          <WifiOff className="h-10 w-10 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Você está offline</h1>
          <p className="text-gray-600">
            Essa página ainda não foi salva pra uso offline. Conecte-se à
            internet e tente novamente.
          </p>
        </div>

        <Button
          onClick={() => window.location.reload()}
          className="h-14 w-full text-base font-semibold shadow-lg transition-all hover:shadow-xl"
          size="lg"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
