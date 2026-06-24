export type DriverTab = "checklists" | "profile";
export type TripStatus = "coletando" | "em_transito" | "entregue" | "cancelada";
export type DriverStatus = "disponivel" | "em_transito";
export type DocumentStatus = "pendente" | "qr_lido" | "foto_tirada" | "concluido";
export type GeoPermissionStatus =
  | "prompt"
  | "granted"
  | "denied"
  | "loading"
  | "unavailable";
export type CameraOverlayMode = "qr-square" | "document-rectangle";
export type CameraWorkflowStep =
  | "idle"
  | "scanning-qr"
  | "capturing-nf-photo"
  | "capturing-canhoto-photo"
  | "done";
export type CameraWorkflowType =
  | "envio-documentos"
  | "entrega"
  | "qr-quick-scan";

export interface TripDocument {
  id: string;
  tripId: string;
  notaFiscalId: string;
  numeroNF: string;
  destinatario: string;
  status: DocumentStatus;
  qrCodeData?: string;
  notaFiscalPhotoUri?: string;
  canhotPhotoUri?: string;
  scannedAt?: string;
  photoTakenAt?: string;
  endereco?: string;
  lat?: number;
  lng?: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Trip {
  id: string;
  origem: string;
  destino: string;
  data: string;
  status: TripStatus;
  valorFrete?: number;
  proximaParada?: string;
  etapaAtual: number;
  totalEtapas: number;
  documentos?: TripDocument[];
  /** Chave de acesso do CT-e (44 dígitos). Usada no evento 110180. */
  chaveCte?: string;
  /** Coordenada do ponto de origem/coleta (depot da viagem). */
  origemCoord?: { lat: number; lng: number };
}

export interface Offer {
  id: string;
  origem: string;
  destino: string;
  valor: number;
  km: number;
  tipoVeiculo: string;
  dataColeta: string;
}

export interface Driver {
  nome: string;
  cpf: string;
  telefone: string;
  status: DriverStatus;
  cnh: string;
  cnhValidade: string;
  grStatus: string;
  veiculo: {
    placa: string;
    modelo: string;
    rntrc: string;
  };
  saldoReceber: number;
  ganhosMes: number;
}
