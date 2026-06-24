export function soDigitos(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

export function aplicarMascaraCpf(value: string): string {
  const d = soDigitos(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function aplicarMascaraCnpj(value: string): string {
  const d = soDigitos(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export type TipoDocumento = "cpf" | "cnpj";

export function detectarTipoDocumento(value: string): TipoDocumento {
  return soDigitos(value).length > 11 ? "cnpj" : "cpf";
}

export function aplicarMascaraDocumento(value: string): string {
  return detectarTipoDocumento(value) === "cnpj"
    ? aplicarMascaraCnpj(value)
    : aplicarMascaraCpf(value);
}

/**
 * Validação minimalista por tamanho. Suficiente para POC —
 * a SEFAZ não valida DV do recebedor no evento de entrega.
 */
export function isDocumentoValido(value: string): boolean {
  const d = soDigitos(value);
  return d.length === 11 || d.length === 14;
}
