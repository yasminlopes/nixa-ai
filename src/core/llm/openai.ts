import { Message } from '@/shared/types'
import { LLMParams } from './types'

function toFlatHistory(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .slice(-10)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
}

export async function* runOpenAIChat(params: LLMParams): AsyncIterable<string> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  console.log(`[OPENAI] 🚀 Starting OpenAI chat with model: ${model}`)
  
  const messages = [
    { role: 'system', content: params.systemPrompt },
    ...toFlatHistory(params.history),
    { role: 'user', content: params.userMessage },
  ]
  console.log(`[OPENAI] 📝 Built ${messages.length} messages (system + history + user)`)

  console.log('[OPENAI] 🌐 Sending request to OpenAI API...')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 900,
      stream: true,
    }),
    signal: AbortSignal.timeout(15000),
  })

  console.log(`[OPENAI] 📬 Response status: ${res.status}`)

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    const errMsg = data.error?.message ?? `OpenAI request failed (${res.status})`
    console.error(`[OPENAI] ❌ Error: ${errMsg}`)
    throw new Error(errMsg)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    console.error('[OPENAI] ❌ No response body available')
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let lineCount = 0
  let chunkCount = 0

  try {
    console.log('[OPENAI] 📡 Starting to read stream...')
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log(`[OPENAI] ✅ Stream ended. Processed ${lineCount} lines, yielded ${chunkCount} chunks`)
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
            console.log('[OPENAI] 🏁 Received [DONE] signal')
            continue
          }
          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              chunkCount++
              console.log(`[OPENAI] 📦 Chunk ${chunkCount}: "${content.substring(0, 30)}..."`)
              yield content
            }
          } catch (e) {
            console.warn(`[OPENAI] ⚠️ Failed to parse JSON at line ${lineCount}:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.error('[OPENAI] ❌ Stream reading error:', e)
    throw e
  } finally {
    console.log('[OPENAI] 🔓 Releasing reader lock')
    reader.releaseLock()
  }
}
