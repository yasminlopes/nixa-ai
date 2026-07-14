import { Message } from '@/shared/types';

import { LLMParams } from './types';

function toFlatHistory(
  messages: Message[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.slice(-10).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }));
}

export async function* runOpenAIChat(params: LLMParams): AsyncIterable<string> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const messages = [
    { role: 'system', content: params.systemPrompt },
    ...toFlatHistory(params.history),
    { role: 'user', content: params.userMessage },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? `OpenAI request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}
