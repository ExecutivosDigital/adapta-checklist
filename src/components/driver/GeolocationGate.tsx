"use client";

/**
 * GeolocationGate — originalmente bloqueava a UI até ter permissão de GPS.
 *
 * Mudado para não-bloqueante na POC do evento 110180: o GPS ainda é
 * capturado em background via `GeolocationContext`, mas a navegação segue
 * sem esperar. Se no momento de emitir o evento a localização estiver null,
 * o `DeliveryFlowModal` usa coordenadas mock como fallback.
 *
 * Comportamento antigo (spinner + telas de permissão) removido porque
 * alguns browsers mobile travam em loading quando o site é servido via
 * URLs customizadas (ex.: cloudflared tunnel).
 */
interface GeolocationGateProps {
  children: React.ReactNode;
}

export function GeolocationGate({ children }: GeolocationGateProps) {
  return <>{children}</>;
}
