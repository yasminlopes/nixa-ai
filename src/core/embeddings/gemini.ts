import { GoogleGenerativeAI } from '@google/generative-ai';

import { EmbeddingResult } from './types';

// Ordem de fallback fixa. text-embedding-004 (768 dims) primeiro: funciona em
// chaves free e é estável. Trocar o modelo default exige re-indexar (dimensões
// diferentes) — por isso não é mais um toggle de ambiente.
const EMBEDDING_CANDIDATE_MODELS = [
  process.env.GEMINI_EMBEDDING_MODEL,
  'text-embedding-004',
  'gemini-embedding-001',
  'embedding-001',
].filter(Boolean) as string[];

function isEmbeddingUnavailableError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message ?? '');
  return (
    status === 404 ||
    message.includes('not supported for embedContent') ||
    message.includes('is not found for API version')
  );
}

function isRateLimitError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  const message = String((error as { message?: string })?.message ?? '');
  return (
    status === 429 ||
    message.includes('429') ||
    message.includes('Too Many Requests') ||
    message.includes('quota')
  );
}

function parseRetryDelay(error: unknown, attempt: number): number {
  const message = String((error as { message?: string })?.message ?? '');
  const match = message.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i);

  if (match) {
    const serverDelay = Math.ceil(parseFloat(match[1])) * 1000;
    return serverDelay;
  }

  const exponentialDelay = (attempt + 1) * 30_000;
  return Math.min(exponentialDelay, 120_000);
}

export async function getGeminiEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void,
): Promise<EmbeddingResult> {
  const safe = text.slice(0, 2000);
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastErr: unknown;

  for (const model of EMBEDDING_CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const generativeModel = genAI.getGenerativeModel({ model });
        const response = await generativeModel.embedContent(safe);
        return { embedding: response.embedding.values, model, cached: false };
      } catch (error) {
        lastErr = error;

        if (isRateLimitError(error)) {
          const wait = parseRetryDelay(error, attempt);
          if (onWarning)
            onWarning(
              `Gemini rate limit (429). Aguardando ${Math.round(wait / 1000)}s... (tentativa ${attempt + 1}/4)`,
            );
          await new Promise((resolve) => setTimeout(resolve, wait));
          continue;
        }

        if (!isEmbeddingUnavailableError(error)) throw error;

        if (onWarning)
          onWarning(`Modelo de embedding Gemini "${model}" indisponível. Tentando próximo...`);
        break;
      }
    }
  }

  throw lastErr ?? new Error('GEMINI_EMBEDDINGS_UNAVAILABLE');
}
