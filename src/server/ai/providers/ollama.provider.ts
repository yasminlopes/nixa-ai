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
    .map(message => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content }))
}

export async function* runOllamaChat(params: LLMParams): AsyncIterable<string> {
  const baseUrl = getBaseUrl()
  const model = getModel()

  const messages = [
    { role: 'system', content: params.systemPrompt },
    ...toFlatHistory(params.history),
    { role: 'user', content: params.userMessage },
  ]

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      throw new Error(`Ollama não responde em ${baseUrl}. Rode "ollama serve" e "ollama pull ${model}".`)
    }
    throw error
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Ollama chat failed (${response.status}): ${body.slice(0, 200)}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body from Ollama')

  const decoder = new TextDecoder()
  let buffer = ''

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
          if (content) yield content
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('Ollama:')) throw error
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
