/** Chave de busca: sem acento, minúscula, espaços colapsados (mesma ideia do backend para nomes). */
export function searchKey(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
