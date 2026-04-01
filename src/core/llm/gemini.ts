import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message } from '@/shared/types'
import { LLMParams } from './types'
import { formatConversationHistory } from '@/core/rag'

const CHAT_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
].filter(Boolean) as string[]

function isModelNotFoundError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  const message = String((error as { message?: string })?.message ?? '')
  return (
    status === 404 ||
    message.includes('is not found for API version') ||
    message.includes('is not supported for generateContent')
  )
}

function isQuotaOrRateLimitError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  const message = String((error as { message?: string })?.message ?? '').toLowerCase()
  return (
    status === 429 ||
    message.includes('quota') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  )
}

export function extractRetryDelaySeconds(error: unknown): number | null {
  const details = (error as { errorDetails?: Array<{ retryDelay?: string }> })?.errorDetails
  if (!Array.isArray(details)) return null

  for (const item of details) {
    const delay = item?.retryDelay
    if (!delay) continue

    const seconds = parseInt(delay.replace(/[^0-9]/g, ''), 10)
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds
    }
  }

  return null
}

export interface GeminiChatResult {
  stream: AsyncIterable<string>
  rateLimitError?: unknown
}

export async function runGeminiChat(params: LLMParams): Promise<GeminiChatResult> {
  console.log('[GEMINI] 🚀 Starting Gemini chat')
  const genAI = new GoogleGenerativeAI(params.apiKey)
  let result: { stream: AsyncIterable<{ text(): string }> } | null = null
  let lastError: unknown
  let rateLimitError: unknown

  for (const modelName of CHAT_MODEL_CANDIDATES) {
    console.log(`[GEMINI] 🔄 Trying model: ${modelName}`)
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: params.systemPrompt,
      })

      const chat = model.startChat({
        history: formatConversationHistory(params.history),
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 900,
        },
      })

      result = await chat.sendMessageStream(params.userMessage)
      console.log(`[GEMINI] ✅ Successfully got stream from ${modelName}`)
      break
    } catch (error) {
      lastError = error
      const errMsg = error instanceof Error ? error.message : String(error)
      console.log(`[GEMINI] ⚠️ Model ${modelName} failed: ${errMsg}`)
      
      if (isQuotaOrRateLimitError(error)) {
        console.warn(`[GEMINI] 🚫 Rate limit detected, trying next model...`)
        rateLimitError = error
        continue
      }
      if (!isModelNotFoundError(error)) {
        console.error(`[GEMINI] ❌ Non-recoverable error:`, errMsg)
        throw error
      }
    }
  }

  if (!result) {
    if (rateLimitError) {
      console.error('[GEMINI] ❌ All models failed due to rate limit')
      return { stream: (async function* () {})(), rateLimitError }
    }

    const err = lastError instanceof Error ? lastError.message : String(lastError)
    console.error('[GEMINI] ❌ No compatible model available:', err)
    throw lastError ?? new Error('No compatible Gemini chat model available')
  }

  // Convert Gemini stream to string stream
  const stringStream = (async function* () {
    let chunkCount = 0
    console.log('[GEMINI] 📡 Starting to stream chunks...')
    for await (const chunk of result.stream) {
      chunkCount++
      const text = chunk.text()
      console.log(`[GEMINI] 📦 Chunk ${chunkCount}: "${text.substring(0, 30)}..."`)
      yield text
    }
    console.log(`[GEMINI] ✅ Finished streaming ${chunkCount} chunks`)
  })()

  return { stream: stringStream }
}
