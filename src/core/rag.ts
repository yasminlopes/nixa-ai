import { DocChunk, Message } from '@/shared/types'

function compressChunk(text: string, maxChars = 700): string {
  if (text.length <= maxChars) return text

  const sub = text.slice(0, maxChars)
  const lastParagraphBreak = sub.lastIndexOf('\n\n')
  if (lastParagraphBreak > Math.floor(maxChars * 0.65)) {
    return `${sub.slice(0, lastParagraphBreak).trim()} [Resumo...]`
  }

  const lastLineBreak = sub.lastIndexOf('\n')
  if (lastLineBreak > Math.floor(maxChars * 0.7)) {
    return `${sub.slice(0, lastLineBreak).trim()} [Resumo...]`
  }

  const lastPeriod = sub.lastIndexOf('.')
  if (lastPeriod > Math.floor(maxChars * 0.65)) {
    return `${sub.slice(0, lastPeriod + 1).trim()} [Resumo...]`
  }

  return `${sub.trim()}...`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sourcePriority(pageType: DocChunk['metadata']['pageType']): number {
  const type = pageType ?? 'other'
  if (type === 'api') return 1
  if (type === 'reference') return 2
  if (type === 'guide') return 3
  if (type === 'release') return 4
  if (type === 'faq') return 5
  return 6
}

function buildStructuredContext(docs: DocChunk[]): string {
  const grouped: Record<string, DocChunk[]> = {
    api: [],
    reference: [],
    guide: [],
    release: [],
    faq: [],
    other: [],
  }

  for (const doc of docs) {
    const type = doc.metadata.pageType ?? 'other'
    grouped[type] = grouped[type] ?? []
    grouped[type].push(doc)
  }

  const sections = Object.entries(grouped)
    .filter(([, items]) => items.length > 0)
    .sort((a, b) => sourcePriority(a[0] as DocChunk['metadata']['pageType']) - sourcePriority(b[0] as DocChunk['metadata']['pageType']))
    .map(([type, items]) => {
      const docsText = items
        .map(
          (d, i) =>
            `<document index="${i + 1}" type="${escapeXml(type)}" url="${escapeXml(d.metadata.url)}">\n` +
            `  <title>${escapeXml(d.metadata.title)}</title>\n` +
            (d.metadata.breadcrumb ? `  <breadcrumb>${escapeXml(d.metadata.breadcrumb)}</breadcrumb>\n` : '') +
            `  <content>${escapeXml(compressChunk(d.content))}</content>\n` +
            `</document>`
        )
        .join('\n\n')

      return `<section type="${escapeXml(type.toUpperCase())}">\n${docsText}\n</section>`
    })

  return `<context>\n${sections.join('\n')}\n</context>`
}

function stripIntroPrefix(text: string): string {
  const patterns = [
    /^\s*(ol[aá]|oi|hello|hi)[^\n.!?]{0,80}\b(nixa)\b[^\n.!?]*[\n.!?\-:]*/i,
    /^\s*eu\s+sou\s+a\s+nixa[^\n.!?]*[\n.!?\-:]*/i,
    /^\s*ol[aá],?\s+sou\s+a\s+nixa[^\n.!?]*[\n.!?\-:]*/i,
  ]

  let cleaned = text
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '')
  }

  return cleaned.trimStart()
}

export function buildSystemPrompt(
  docs: DocChunk[],
  userName?: string,
  options?: { isInconclusive?: boolean; isDefinitionQuestion?: boolean }
): string {
  const context = docs.length > 0
    ? buildStructuredContext(docs)
    : 'Nenhuma documentação indexada ainda.'

  const safeUserName = (userName ?? '').trim()
  const personalization = safeUserName
    ? `\n- Trate ${safeUserName} de forma profissional e amigável.`
    : ''

  const definitionInstruction = options?.isDefinitionQuestion
    ? '\n- Para perguntas "o que é X", comece pelo que a documentação confirma, depois o que ela menciona, e por fim o limite da evidência.'
    : ''

  const continuationHint = options?.isInconclusive
    ? '\n- Se a resposta estiver incompleta, termine com uma sugestão natural e breve para aprofundar (sem rótulo forçado).'
    : ''

  return `Você é a Nixa AI, assistente especialista da NICE CXone.

VISÃO DO CONTEXTO (leia antes de responder):
Os documentos em <context> são TRECHOS de páginas maiores — não artigos completos.
Cada trecho pode ter um prefixo [Contexto: Caminho > de > Navegação] que indica de qual seção da documentação ele veio.
Use esse caminho para inferir o produto/seção corretos. Se um trecho fala de "sentimentos" e seu contexto é "Agentes > CXone Copilot", a resposta é sobre o Copilot da NICE, não de terceiros.
Trate os trechos como partes de um todo conectado: o detalhe de um trecho pode complementar o que está no trecho anterior.${personalization}

REGRAS DE RESPOSTA:
- Responda no mesmo idioma da pergunta (português ou inglês).
- Seja direto. Máximo 2 parágrafos ou uma lista curta de bullets.
- Use Markdown quando útil (listas, código, tabelas).
- Cite a fonte inline: Segundo [Título](URL), ...
- Para "Copilot" sem qualificador, assuma NICE CXone Copilot. Se o contexto for claramente de terceiro, declare que não encontrou na NICE.
- Prioridade de conflito: API docs > SDK/reference > Guides > Release notes.${definitionInstruction}${continuationHint}

PROTOCOLO DE INCERTEZA (OBRIGATÓRIO):
1. A informação está nos trechos do <context>? SIM → responda diretamente.
2. NÃO → declare: "Não localizei esta informação na documentação oficial da NICE/CXone."
3. Nunca invente endpoints, campos de payload, limites ou versões sem respaldo nas fontes.

PROIBIDO (não faça isso em hipótese alguma):
- Criar menus de opções: "Posso ajudar com X, Y ou Z. O que prefere?"
- Gerar listas de "próximos passos" que o usuário não pediu
- Sugerir perguntas de follow-up no final da resposta
- Iniciar a resposta se apresentando ("Olá! Sou a Nixa AI...")

DOCUMENTAÇÃO DISPONÍVEL:
${context}`
}

export function formatConversationHistory(
  messages: Message[]
): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
  const MAX_MESSAGES = 10
  const CHAR_BUDGET = 5500

  const sliced = messages.slice(-MAX_MESSAGES)
  const selected: Message[] = []
  let used = 0

  for (let i = sliced.length - 1; i >= 0; i--) {
    const message = sliced[i]
    const normalized = message.role === 'assistant'
      ? stripIntroPrefix(message.content)
      : message.content

    const cost = normalized.length + 20
    if (selected.length > 0 && used + cost > CHAR_BUDGET) {
      continue
    }

    selected.push({ ...message, content: normalized })
    used += cost
  }

  selected.reverse()

  return selected.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}
