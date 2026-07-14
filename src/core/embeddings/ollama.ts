import { EmbeddingResult } from './types';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'all-minilm';

const MODEL_CHAR_LIMITS: Record<string, number> = {
  'all-minilm': 700,
  'all-minilm:latest': 700,
  'nomic-embed-text': 6000,
  'mxbai-embed-large': 1400,
  'snowflake-arctic-embed': 1400,
  'bge-large': 1400,
  'bge-base': 1400,
};

function getBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function getModel(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

function getCharLimit(model: string): number {
  const base = model.split(':')[0];
  return MODEL_CHAR_LIMITS[model] ?? MODEL_CHAR_LIMITS[base] ?? 1200;
}

interface OllamaEmbedResponse {
  embedding?: number[];
  embeddings?: number[][];
  error?: string;
}

export async function getOllamaEmbedding(
  text: string,
  _apiKey: string,
  onWarning?: (msg: string) => void,
): Promise<EmbeddingResult> {
  const baseUrl = getBaseUrl();
  const model = getModel();
  const charLimit = getCharLimit(model);

  let safe = text.slice(0, charLimit);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: safe }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        if (attempt === 0 && (body.includes('context length') || body.includes('exceeds'))) {
          safe = safe.slice(0, Math.floor(safe.length / 2));
          continue;
        }
        throw new Error(`Ollama embeddings failed (${response.status}): ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as OllamaEmbedResponse;
      const embedding = data.embedding ?? data.embeddings?.[0];

      if (!embedding || embedding.length === 0) {
        throw new Error(`Ollama returned empty embedding (${data.error ?? 'unknown'})`);
      }

      return { embedding, model, cached: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
        if (onWarning)
          onWarning(
            `Ollama não responde em ${baseUrl}. Rode "ollama serve" e "ollama pull ${model}".`,
          );
      }
      if (attempt === 1) throw error;
      if (message.includes('context length') || message.includes('exceeds')) {
        safe = safe.slice(0, Math.floor(safe.length / 2));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Ollama embedding falhou após retries');
}
