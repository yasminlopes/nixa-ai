import { Message } from '@/shared/types'
import { LLMParams } from './types'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'llama3.2:1b'

function getBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function getModel(): string {
  return process.env.OLLAMA_MODEL ?? DEFAULT_MODEL
}

function toFlatHistory(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .slice(-10)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
}

export async function* runOllamaChat(params: LLMParams): AsyncIterable<string> {
  const baseUrl = getBaseUrl()
  const model = getModel()

  const messages = [
    { role: 'system', content: params.systemPrompt },
    ...toFlatHistory(params.history),
    { role: 'user', content: params.userMessage },
  ]

  console.log(`[OLLAMA] 🦙 ${baseUrl}/api/chat (model: ${model}, ${messages.length} messages)`)

  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: { temperature: 0.3, num_predict: 900 },
      }),
      signal: AbortSignal.timeout(120000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      throw new Error(`Ollama não responde em ${baseUrl}. Rode "ollama serve" e "ollama pull ${model}".`)
    }
    throw err
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Ollama chat failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body from Ollama')

  const decoder = new TextDecoder()
  let buffer = ''
  let chunkCount = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const json = JSON.parse(trimmed) as {
            message?: { content?: string }
            done?: boolean
            error?: string
          }
          if (json.error) throw new Error(`Ollama: ${json.error}`)
          const content = json.message?.content
          if (content) {
            chunkCount++
            yield content
          }
          if (json.done) {
            console.log(`[OLLAMA] ✅ stream done (${chunkCount} chunks)`)
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('Ollama:')) throw e
          console.warn(`[OLLAMA] ⚠️ malformed line ignored: ${trimmed.slice(0, 80)}`)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
