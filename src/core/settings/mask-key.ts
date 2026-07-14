/**
 * Mascara uma API key pra exibição na UI (ex.: "AIza************kIjDs").
 * Número de asteriscos é fixo, não varia com o tamanho real da chave, pra
 * não vazar informação sobre o comprimento dela.
 */
export function maskKey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 6) return '•'.repeat(8)

  const prefix = trimmed.slice(0, 4)
  const suffix = trimmed.slice(-4)
  return `${prefix}${'*'.repeat(12)}${suffix}`
}
