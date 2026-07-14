import { GoogleGenerativeAI } from '@google/generative-ai';

import { formatConversationHistory } from '@/core/rag';

import { GenerateResult, LLMParams } from './types';

const CHAT_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
].filter(Boolean) as string[];

function isModelNotFoundError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message ?? '');
  return (
    status === 404 ||
    message.includes('is not found for API version') ||
    message.includes('is not supported for generateContent')
  );
}

function isQuotaOrRateLimitError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  return (
    status === 429 ||
    message.includes('quota') ||
    message.includes('too many requests') ||
    message.includes('rate limit')
  );
}

export function extractRetryDelaySeconds(error: unknown): number | null {
  const details = (error as { errorDetails?: Array<{ retryDelay?: string }> })?.errorDetails;
  if (!Array.isArray(details)) return null;

  for (const item of details) {
    const delay = item?.retryDelay;
    if (!delay) continue;

    const seconds = parseInt(delay.replace(/[^0-9]/g, ''), 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds;
    }
  }

  return null;
}

export async function runGeminiChat(params: LLMParams): Promise<GenerateResult> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  let result: { stream: AsyncIterable<{ text(): string }> } | null = null;
  let lastError: unknown;
  let rateLimitError: unknown;

  for (const modelName of CHAT_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: params.systemPrompt,
      });

      const chat = model.startChat({
        history: formatConversationHistory(params.history),
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 900,
        },
      });

      result = await chat.sendMessageStream(params.userMessage);
      break;
    } catch (error) {
      lastError = error;
      if (isQuotaOrRateLimitError(error)) {
        rateLimitError = error;
        continue;
      }
      if (!isModelNotFoundError(error)) {
        throw error;
      }
    }
  }

  if (!result) {
    if (rateLimitError) {
      return { stream: (async function* () {})(), rateLimitError };
    }
    throw lastError ?? new Error('No compatible Gemini chat model available');
  }

  const geminiStream = result.stream;
  const stringStream = (async function* () {
    for await (const chunk of geminiStream) {
      yield chunk.text();
    }
  })();

  return { stream: stringStream };
}
