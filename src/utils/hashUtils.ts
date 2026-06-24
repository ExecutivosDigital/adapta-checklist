/**
 * Hash utilities para o evento de Comprovante de Entrega (tpEvento 110180).
 *
 * Por que SHA-1 e não SHA-256?
 *
 * O PDF do projeto Integra idealiza "SHA-256 em hex", mas o schema oficial do
 * CT-e event (`evCECTe/hashEntrega`) exige **SHA-1 em base64 (28 chars)**.
 * O schema do PR rejeita qualquer outro formato com cStat=215.
 */

async function digestToBase64(
  algorithm: "SHA-1" | "SHA-256",
  input: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest(algorithm, bytes);
  let binary = "";
  const arr = new Uint8Array(hash);
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/**
 * SHA-1 em base64 de uma string arbitrária.
 */
export function sha1Base64(input: string): Promise<string> {
  return digestToBase64("SHA-1", input);
}

/**
 * Calcula o `hashEntrega` para o evento 110180.
 *
 * Seguindo a NT CT-e, o hash deve representar chCTe + conteúdo dos anexos
 * (foto do canhoto e assinatura digitalizada). Na POC, concatenamos o payload
 * base64 dos dois data URLs; o receptor do hash não precisa saber essa ordem
 * — ele só recalcula e compara.
 */
export async function calcularHashEntrega(input: {
  chaveCte: string;
  fotoDataUrl?: string;
  assinaturaDataUrl?: string;
}): Promise<string> {
  const fotoBase64 = input.fotoDataUrl
    ? (input.fotoDataUrl.split(",")[1] ?? "")
    : "";
  const assinaturaBase64 = input.assinaturaDataUrl
    ? (input.assinaturaDataUrl.split(",")[1] ?? "")
    : "";
  return sha1Base64(input.chaveCte + fotoBase64 + assinaturaBase64);
}
