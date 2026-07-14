import { type ChatResult, type SendChatMessageParams, type Source } from '../types'

function parseStreamChunk(accumulated: string): ChatResult {
  const sourcesIdx = accumulated.indexOf('\n\n__SOURCES__')
  if (sourcesIdx === -1) return { content: accumulated }

  const content = accumulated.slice(0, sourcesIdx)
  let sources: Source[] | undefined
  try {
    sources = JSON.parse(accumulated.slice(sourcesIdx + 13))
  } catch {
  }
  return { content, sources }
}

/**
 * Chama /api/chat e produz o conteúdo incrementalmente conforme chega —
 * seja de uma vez (resposta JSON não-streamada) seja aos pedaços (stream de texto).
 */
export async function* sendChatMessage(params: SendChatMessageParams): AsyncGenerator<ChatResult> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: params.messages,
      userName: params.userName,
      provider: params.provider,
      apiKeys: params.apiKeys,
    }),
    signal: params.signal,
  })

  if (!res.ok) throw new Error('Falha ao chamar a API')

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = (await res.json()) as { message?: string; sources?: Source[] }
    yield { content: payload.message ?? 'Sem resposta no momento.', sources: payload.sources }
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    accumulated += decoder.decode(value, { stream: true })
    yield parseStreamChunk(accumulated)
  }

  yield parseStreamChunk(accumulated)
}
