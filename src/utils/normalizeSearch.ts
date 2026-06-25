/**
 * Normalização para busca "esperta" de veículo/motorista (placa/nome).
 *
 * Ignora acento, traço, espaço, pontuação e maiúscula/minúscula, deixando
 * apenas caracteres alfanuméricos em minúsculo. Assim a busca por substring
 * funciona de forma tolerante:
 *   normalizeForSearch("MGY-3388") === "mgy3388"
 *   normalizeForSearch("João")     === "joao"
 */
export function normalizeForSearch(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    // remove diacríticos (acentos)
    .replace(/[̀-ͯ]/g, "")
    // remove tudo que não for alfanumérico (traços, espaços, pontos, etc.)
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Testa se `needle` aparece como substring de `haystack`, após normalizar
 * ambos os lados. Needle vazio dá match (comportamento de "sem filtro").
 *
 *   matchesSearch("MGY-3388", "mgy")     === true
 *   matchesSearch("MGY-3388", "mgy3388") === true
 *   matchesSearch("João",     "joao")    === true
 */
export function matchesSearch(haystack: string, needle: string): boolean {
  const n = normalizeForSearch(needle);
  if (!n) return true;
  return normalizeForSearch(haystack).includes(n);
}
