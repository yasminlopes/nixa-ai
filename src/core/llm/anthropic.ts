import { Message } from '@/shared/types'
import { LLMParams } from './types'

function toFlatHistory(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .slice(-10)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
}

export async function* runAnthropicChat(params: LLMParams): AsyncIterable<string> {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest'
  console.log(`[ANTHROPIC] 🚀 Starting Anthropic chat with model: ${model}`)
  
  const messages = [
    ...toFlatHistory(params.history),
    { role: 'user', content: params.userMessage },
  ]
  console.log(`[ANTHROPIC] 📝 Built ${messages.length} messages (history + user)`)

  console.log('[ANTHROPIC] 🌐 Sending request to Anthropic API...')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      temperature: 0.3,
      system: params.systemPrompt,
      messages,
      stream: true,
    }),
    signal: AbortSignal.timeout(15000),
  })

  console.log(`[ANTHROPIC] 📬 Response status: ${res.status}`)

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    const errMsg = data.error?.message ?? `Anthropic request failed (${res.status})`
    console.error(`[ANTHROPIC] ❌ Error: ${errMsg}`)
    throw new Error(errMsg)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    console.error('[ANTHROPIC] ❌ No response body available')
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let lineCount = 0
  let chunkCount = 0

  try {
    console.log('[ANTHROPIC] 📡 Starting to read stream...')
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log(`[ANTHROPIC] ✅ Stream ended. Processed ${lineCount} lines, yielded ${chunkCount} chunks`)
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        lineCount++
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            console.log('[ANTHROPIC] 🏁 Received [DONE] signal')
            continue
          }
          try {
            const json = JSON.parse(data)
            const delta = json.delta?.text
            if (delta) {
              chunkCount++
              console.log(`[ANTHROPIC] 📦 Chunk ${chunkCount}: "${delta.substring(0, 30)}..."`)
              yield delta
            }
          } catch (e) {
            console.warn(`[ANTHROPIC] ⚠️ Failed to parse JSON at line ${lineCount}:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.error('[ANTHROPIC] ❌ Stream reading error:', e)
    throw e
  } finally {
    console.log('[ANTHROPIC] 🔓 Releasing reader lock')
    reader.releaseLock()
  }
}
