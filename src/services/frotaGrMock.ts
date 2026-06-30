// Dados mock para os fluxos de GR (conjunto/SM) e do perfil Frota (ADM).
// Tudo demo — sem backend. Tipos leves, só pra UX.

// ── GR: vistoria do conjunto cavalo+carreta ──
export type ConjuntoStatus = "VALIDA" | "VENCIDA" | "PENDENTE";

export interface ConjuntoVistoria {
  cavalo: string;
  carreta: string;
  status: ConjuntoStatus;
  validadeAte: string | null; // ISO
}

export const MOCK_CONJUNTO: ConjuntoVistoria = {
  cavalo: "KAF2D34",
  carreta: "MGY3388",
  status: "PENDENTE",
  validadeAte: null,
};

export const MOCK_CONJUNTO_ITENS = [
  { codigo: "FREIOS", titulo: "Freios do conjunto" },
  { codigo: "LONA", titulo: "Lona de freio" },
  { codigo: "PNEUS_CAR", titulo: "Pneus da carreta" },
  { codigo: "SINAL", titulo: "Sinalização / lanternas" },
  { codigo: "ENGATE", titulo: "Engate / quinta roda" },
];

// ── GR: status de liberação da viagem (SM) ──
export interface LiberacaoViagem {
  pesquisaRdo: boolean;
  checklistManual: boolean;
  checklistGerenciadora: boolean;
  sm: boolean;
}
export const MOCK_LIBERACAO: LiberacaoViagem = {
  pesquisaRdo: true,
  checklistManual: false, // falta capturar
  checklistGerenciadora: false, // import manual no GR
  sm: false,
};

// ── Frota: chegadas de motorista ──
export interface Chegada {
  id: string;
  motorista: string;
  placa: string;
  hora: string;
  viagemId: string;
}
export const MOCK_CHEGADAS: Chegada[] = [
  { id: "ch-1", motorista: "Luiz Eduardo Reitz", placa: "KAF2D34", hora: "08:40", viagemId: "8321" },
  { id: "ch-2", motorista: "Marcos Antônio Rodrigues", placa: "AVC9F66", hora: "10:15", viagemId: "8344" },
];

// ── Frota: "a fazer" lançados pelos motoristas (voz) ──
export interface AFazerItem {
  id: string;
  placa: string;
  descricao: string;
  quando: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
}
export const MOCK_AFAZER: AFazerItem[] = [
  { id: "af-1", placa: "AVC9F66", descricao: "Lâmpada do farol direito queimou", quando: "hoje 09:12", status: "PENDENTE" },
  { id: "af-2", placa: "KAF2D34", descricao: "Ar-condicionado não está gelando", quando: "ontem 16:30", status: "PENDENTE" },
];

// ── Frota: disponibilidade dos veículos ──
export interface DisponVeiculo {
  placa: string;
  tipo: string;
  status: "DISPONIVEL" | "MANUTENCAO" | "EM_VIAGEM" | "BLOQUEADO";
  obs?: string;
}
export const MOCK_DISPONIBILIDADE: DisponVeiculo[] = [
  { placa: "KAF2D34", tipo: "Cavalo", status: "DISPONIVEL" },
  { placa: "MGY3388", tipo: "Carreta", status: "DISPONIVEL" },
  { placa: "AVC9F66", tipo: "Cavalo", status: "EM_VIAGEM", obs: "Viagem 8344" },
  { placa: "AUJ9028", tipo: "Cavalo", status: "MANUTENCAO", obs: "Troca de embreagem" },
  { placa: "AUG9690", tipo: "Carreta", status: "BLOQUEADO", obs: "Sinistro — pequena monta" },
];

export const STATUS_VEICULO_LABEL: Record<DisponVeiculo["status"], string> = {
  DISPONIVEL: "Disponível",
  MANUTENCAO: "Manutenção",
  EM_VIAGEM: "Em viagem",
  BLOQUEADO: "Bloqueado",
};
