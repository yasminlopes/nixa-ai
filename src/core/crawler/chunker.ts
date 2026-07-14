/**
 * Divide texto em chunks semânticos com sobreposição.
 *
 * O conteúdo retornado é LIMPO — sem prefixo de breadcrumb/contexto. O breadcrumb
 * é metadata e entra no PROMPT, não no texto que vira embedding (misturar
 * navegação com conteúdo degrada o vetor semântico).
 *
 * A sobreposição é feita por FRASE inteira (não por corte de N chars), então o
 * início de um chunk nunca começa no meio de uma palavra/frase.
 */
export function chunkText(text: string, maxSize = 900, overlap = 200): string[] {
  const paragraphs = text.split(/\n\n+/)
  const rawChunks: string[] = []
  let current = ''
  let pendingHeading = ''

  const isHeadingLike = (candidate: string) =>
    candidate.length > 2 && candidate.length < 120 && /^[A-ZÀ-Ú0-9][^\n]{1,119}$/.test(candidate)

  const overlapTail = (chunk: string): string => {
    const sentences = chunk.split(/(?<=[.!?])\s+/).filter(Boolean)
    let tail = ''
    for (let i = sentences.length - 1; i >= 0; i--) {
      const candidate = tail ? `${sentences[i]} ${tail}` : sentences[i]
      if (candidate.length > overlap && tail) break
      tail = candidate
    }
    return tail
  }

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    if (isHeadingLike(trimmed)) {
      pendingHeading = trimmed
      continue
    }

    const sectionText = pendingHeading ? `${pendingHeading}\n${trimmed}` : trimmed
    pendingHeading = ''

    if (current.length + sectionText.length + 2 > maxSize && current.length > 0) {
      rawChunks.push(current.trim())
      const tail = overlapTail(current)
      current = tail ? `${tail}\n\n${sectionText}` : sectionText
    } else {
      current += (current ? '\n\n' : '') + sectionText
    }
  }

  if (current.trim().length > 80) rawChunks.push(current.trim())

  return rawChunks
}
