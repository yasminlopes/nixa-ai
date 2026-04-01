import { HfInference } from '@huggingface/inference'
import { Message } from '@/shared/types'
import { LLMParams } from './types'

// Use a model that works with free Hugging Face API
const DEFAULT_MODEL = 'microsoft/Phi-3-mini-4k-instruct'

export async function* runHuggingFaceChat(params: LLMParams): AsyncGenerator<string> {
  console.log('[HUGGINGFACE] 🚀 Starting Hugging Face chat')
  
  const hf = new HfInference(params.apiKey)
  const model = process.env.HUGGINGFACE_MODEL || DEFAULT_MODEL
  
  console.log(`[HUGGINGFACE] 🔄 Using model: ${model}`)
  
  // Format messages for chat completion API
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: params.systemPrompt }
  ]
  
  // Add conversation history
  for (const msg of params.history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })
  }
  
  // Add current user message
  messages.push({
    role: 'user',
    content: params.userMessage
  })
  
  try {
    const stream = hf.chatCompletionStream({
      model,
      messages,
      max_tokens: 900,
      temperature: 0.3,
      top_p: 0.95,
    })
    
    let chunkCount = 0
    console.log('[HUGGINGFACE] 📡 Starting to stream chunks...')
    
    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const delta = chunk.choices[0].delta
        if (delta.content) {
          chunkCount++
          const text = delta.content
          console.log(`[HUGGINGFACE] 📦 Chunk ${chunkCount}: "${text.substring(0, 30)}..."`)
          yield text
        }
      }
    }
    
    console.log(`[HUGGINGFACE] ✅ Finished streaming ${chunkCount} chunks`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[HUGGINGFACE] ❌ Error:', errMsg)
    throw error
  }
}
