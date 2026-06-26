import { v4 as uuid } from "uuid";
import { api } from "@/lib/api";
import { MOCK } from "@/services/checklistMock";
import { enqueueMutation } from "@/lib/offline-queue";
import type {
  CreateExpenseInput,
  DriverExpense,
  DriverSettlement,
  ExpenseTipo,
} from "@/types/expenses.types";

/**
 * ETAPA 7 (T7.2) — Gastos da viagem e acerto, lado MOTORISTA.
 *
 * Rotas driver-scoped do monolito (autorizadas pelo CPF do token, injetado
 * pelo interceptor em `src/lib/api.ts`). Leituras vão online; o lançamento de
 * gasto passa pela fila offline (`enqueueMutation`) com `clientId` (uuid) e,
 * quando há comprovante, sobe a foto no `POST /file` ao reconectar (mesmo fluxo
 * da foto do checklist — T1.3).
 *
 * Com `NEXT_PUBLIC_MOCK_DATA=1` (modo DEMO) tudo responde com dados de exemplo,
 * sem backend/auth/banco.
 */
const BASE = "/driver/expenses";
const SETTLEMENT = "/driver/settlement/atual";
const FILE_UPLOAD_ENDPOINT = "/file";

/** Regra de acerto por tipo — usada na UI e no mock do agrupamento. */
export function descontaSaldo(
  tipo: ExpenseTipo,
  hasComprovante: boolean,
): boolean {
  // Diária/adiantamento nunca desconta. Com-comprovante SEM foto desconta
  // (o gasto vira responsabilidade do motorista). Demais descontam sempre.
  if (tipo === "DIARIA") return false;
  if (tipo === "COM_COMPROVANTE") return !hasComprovante;
  return true;
}

// ---------------------------------------------------------------------------
// MOCK (DEMO) — guarda lançamentos em memória só pra validar a UX standalone.
// ---------------------------------------------------------------------------
const mockExpenses: DriverExpense[] = [
  {
    id: "exp-1",
    tipo: "DIARIA",
    valor: 120,
    data: new Date().toISOString().slice(0, 10),
    tripId: "trip-1",
    desconta: false,
    pending: false,
  },
  {
    id: "exp-2",
    tipo: "COM_COMPROVANTE",
    valor: 230.5,
    data: new Date().toISOString().slice(0, 10),
    tripId: "trip-1",
    comprovanteUrl: "https://mock.local/uploads/posto.jpg",
    desconta: false,
    notes: "Abastecimento",
    pending: false,
  },
  {
    id: "exp-3",
    tipo: "AJUDANTE",
    valor: 80,
    data: new Date().toISOString().slice(0, 10),
    tripId: "trip-2",
    desconta: true,
    pending: false,
  },
];

function buildMockSettlement(): DriverSettlement {
  const groups = new Map<string | null, DriverExpense[]>();
  for (const e of mockExpenses) {
    const key = e.tripId ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  let totalDesconta = 0;
  let totalNaoDesconta = 0;
  const porViagem = [...groups.entries()].map(([tripId, expenses]) => {
    let gDesc = 0;
    let gNao = 0;
    for (const e of expenses) {
      if (e.desconta) gDesc += e.valor;
      else gNao += e.valor;
    }
    totalDesconta += gDesc;
    totalNaoDesconta += gNao;
    return {
      tripId,
      tripLabel: tripId ? `Viagem ${tripId}` : "Sem viagem",
      totalDesconta: gDesc,
      totalNaoDesconta: gNao,
      expenses,
    };
  });
  return {
    totalGastos: totalDesconta + totalNaoDesconta,
    totalDesconta,
    totalNaoDesconta,
    // Saldo parcial demo: começa com um "a receber" fixo e abate o que desconta.
    saldoParcial: 500 - totalDesconta,
    porViagem,
  };
}

// ---------------------------------------------------------------------------
// Leituras (online)
// ---------------------------------------------------------------------------
export async function listExpenses(tripId?: string): Promise<DriverExpense[]> {
  if (MOCK) return mockExpenses.filter((e) => !tripId || e.tripId === tripId);
  const { data } = await api.get<DriverExpense[]>(BASE, {
    params: tripId ? { tripId } : undefined,
  });
  return data;
}

export async function getCurrentSettlement(): Promise<DriverSettlement> {
  if (MOCK) return buildMockSettlement();
  const { data } = await api.get<DriverSettlement>(SETTLEMENT);
  return data;
}

// ---------------------------------------------------------------------------
// Lançamento de gasto (offline-safe)
// ---------------------------------------------------------------------------
interface CreateExpenseResult {
  clientId: string;
  /** Preview otimista para a UI (data URL no offline; URL fake no MOCK). */
  comprovantePreview?: string;
  /** Marca se desconta — pra refletir otimista. */
  desconta: boolean;
}

/**
 * Lança um gasto. Sempre passa pela fila offline (`enqueueMutation`) com um
 * `clientId` (uuid) para reconciliar o lançamento otimista com o servidor e
 * garantir idempotência. Se houver `comprovanteDataUrl`, a foto entra na fila
 * (igual T1.3): sobe no `POST /file` ao reconectar e a URL retornada é injetada
 * em `body.comprovanteUrl` antes do request principal.
 */
export async function createExpense(
  input: CreateExpenseInput,
  comprovanteDataUrl?: string,
): Promise<CreateExpenseResult> {
  const clientId = input.clientId ?? uuid();
  const hasComprovante = Boolean(comprovanteDataUrl || input.comprovanteUrl);
  const desconta = descontaSaldo(input.tipo, hasComprovante);

  if (MOCK) {
    mockExpenses.unshift({
      id: `exp-${clientId.slice(0, 8)}`,
      tipo: input.tipo,
      valor: input.valor,
      data: input.data,
      tripId: input.tripId ?? null,
      comprovanteUrl:
        comprovanteDataUrl ?? input.comprovanteUrl ?? null,
      notes: input.notes ?? null,
      clientId,
      desconta,
      pending: false,
    });
    return {
      clientId,
      comprovantePreview: comprovanteDataUrl,
      desconta,
    };
  }

  const body: CreateExpenseInput = {
    tipo: input.tipo,
    valor: input.valor,
    data: input.data,
    tripId: input.tripId,
    notes: input.notes,
    clientId,
    // comprovanteUrl é preenchido pelo upload (urlField) quando há foto na fila;
    // se a foto já tiver URL (raro), preserva.
    comprovanteUrl: comprovanteDataUrl ? undefined : input.comprovanteUrl,
  };

  await enqueueMutation({
    endpoint: BASE,
    method: "POST",
    body,
    kind: "expense.create",
    upload: comprovanteDataUrl
      ? {
          endpoint: FILE_UPLOAD_ENDPOINT,
          field: "file",
          dataUrl: comprovanteDataUrl,
          fileName: `comprovante-${clientId}.jpg`,
          mimeType: "image/jpeg",
          urlField: "comprovanteUrl",
        }
      : undefined,
  });

  return {
    clientId,
    comprovantePreview: comprovanteDataUrl,
    desconta,
  };
}
