import { NextRequest } from 'next/server'
import { Message } from '@/shared/types'
import { type Provider } from '@/core/providers'
import { type ApiKeyMap } from '@/core/settings/provider-key-service'
import { askNixa, selectCitedSources, type ChatSource } from '@/server/ai'

export const runtime = 'nodejs'

function encodeSources(sources: ChatSource[]): string {
  return sources.length > 0 ? `\n\n__SOURCES__${JSON.stringify(sources)}` : ''
}

export async function POST(req: NextRequest) {
  const {
    messages,
    userName,
    provider,
    apiKeys,
  }: {
    messages: Message[]
    userName?: string
    provider?: Provider
    apiKeys?: ApiKeyMap
  } = await req.json()

  if (!messages?.length) {
    return new Response('Messages required', { status: 400 })
  }

  const result = await askNixa({ messages, userName, provider, apiKeys })

  if (result.kind === 'message') {
    return Response.json(
      {
        message: result.message,
        sources: result.sources,
        ...(result.retryAfterSeconds != null ? { retryAfterSeconds: result.retryAfterSeconds } : {}),
      },
      {
        status: result.status ?? 200,
        headers: {
          ...(result.retryAfterSeconds != null ? { 'Retry-After': String(result.retryAfterSeconds) } : {}),
        },
      }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let answer = ''
      for await (const chunk of result.stream) {
        answer += chunk
        controller.enqueue(encoder.encode(chunk))
      }
      const citedSources = selectCitedSources(answer, result.sources)
      const encodedSources = encodeSources(citedSources)
      if (encodedSources) controller.enqueue(encoder.encode(encodedSources))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
