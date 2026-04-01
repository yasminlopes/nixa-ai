import { Message } from '@/shared/types'
import { LLMParams } from './types'

function toFlatHistory(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .slice(-10)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
}

export async function* runGroqChat(params: LLMParams): AsyncIterable<string> {
  const model = process.env.GROQ_MODEL ?? 'mixtral-8x7b-32768'
  console.log(`[GROQ] 🚀 Starting Groq chat with model: ${model}`)
  
  const messages = [
    { role: 'system', content: params.systemPrompt },
    ...toFlatHistory(params.history),
    { role: 'user', content: params.userMessage },
  ]
  console.log(`[GROQ] 📝 Built ${messages.length} messages (system + history + user)`)

  console.log('[GROQ] 🌐 Sending request to Groq API...')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

  console.log(`[GROQ] 📬 Response status: ${res.status}`)

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    const errMsg = data.error?.message ?? `Groq request failed (${res.status})`
    console.error(`[GROQ] ❌ Error: ${errMsg}`)
    throw new Error(errMsg)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    console.error('[GROQ] ❌ No response body available')
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let lineCount = 0
  let chunkCount = 0

  try {
    console.log('[GROQ] 📡 Starting to read stream...')
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log(`[GROQ] ✅ Stream ended. Processed ${lineCount} lines, yielded ${chunkCount} chunks`)
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
            console.log('[GROQ] 🏁 Received [DONE] signal')
            continue
          }
          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              chunkCount++
              console.log(`[GROQ] 📦 Chunk ${chunkCount}: "${content.substring(0, 30)}..."`)
              yield content
            }
          } catch (e) {
            console.warn(`[GROQ] ⚠️ Failed to parse JSON at line ${lineCount}:`, e)
          }
        }
      }
    }
  } catch (e) {
    console.error('[GROQ] ❌ Stream reading error:', e)
    throw e
  } finally {
    console.log('[GROQ] 🔓 Releasing reader lock')
    reader.releaseLock()
  }
}
