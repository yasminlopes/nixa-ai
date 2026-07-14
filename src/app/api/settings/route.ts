import { NextRequest } from 'next/server'
import { getPublicSettings, saveSettings } from '@/core/settings/settings-store'
import { type Provider } from '@/core/providers'

export const runtime = 'nodejs'

const ALLOWED: Provider[] = ['gemini', 'openai', 'ollama']

// Nunca retornar a API key em texto puro — só defaultProvider, hasKeys e
// maskedKeys (ex.: "AIza************kIjDs"). Ver core/settings/settings-store.ts.

export async function GET() {
  try {
    const settings = await getPublicSettings()
    return Response.json(settings)
  } catch {
    return Response.json({ message: 'Falha ao carregar configurações' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      defaultProvider?: Provider
      apiKeys?: Partial<Record<Provider, string>>
    }

    if (body.defaultProvider && !ALLOWED.includes(body.defaultProvider)) {
      return Response.json({ message: 'defaultProvider inválido' }, { status: 400 })
    }

    const saved = await saveSettings(body)
    return Response.json(saved)
  } catch {
    return Response.json({ message: 'Falha ao salvar configurações' }, { status: 500 })
  }
}
