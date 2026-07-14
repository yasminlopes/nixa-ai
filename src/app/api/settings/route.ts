import { NextRequest } from 'next/server'
import {
  getPublicLLMSettings,
  LLMProvider,
  saveLLMSettings,
} from '@/core/settings'

const ALLOWED: LLMProvider[] = ['gemini', 'openai', 'ollama']

export async function GET() {
  try {
    const settings = await getPublicLLMSettings()
    return Response.json(settings)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settings'
    return Response.json({ message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      defaultProvider?: LLMProvider
      apiKeys?: Partial<Record<LLMProvider, string>>
    }

    if (!body.defaultProvider || !ALLOWED.includes(body.defaultProvider)) {
      return Response.json({ message: 'defaultProvider invalid' }, { status: 400 })
    }

    const saved = await saveLLMSettings({
      defaultProvider: body.defaultProvider,
      apiKeys: body.apiKeys,
    })

    return Response.json(saved)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings'
    return Response.json({ message }, { status: 500 })
  }
}
