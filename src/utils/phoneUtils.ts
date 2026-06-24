import { soDigitos } from "./cpfCnpjUtils";

export function aplicarMascaraTelefone(value: string): string {
  const d = soDigitos(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isTelefoneValido(value: string): boolean {
  const d = soDigitos(value);
  return d.length === 10 || d.length === 11;
}

/**
 * Formata para o padrão E.164 BR (+55DDDNNNNNNNN), aceito por
 * `class-validator` `IsPhoneNumber('BR')` no backend.
 */
export function toE164BR(value: string): string {
  const d = soDigitos(value);
  return d.startsWith("55") ? `+${d}` : `+55${d}`;
}
