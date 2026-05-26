'use client'

import { type Provider } from '@/core/providers'
import { Google, ChatGPT } from 'developer-icons'
import { LlamaIcon } from './LlamaIcon'

export function ProviderIcon({ provider }: { provider: Provider }) {
  const iconProps = { size: 16 }

  switch (provider) {
    case 'gemini':
      return <Google {...iconProps} />
    case 'openai':
      return <ChatGPT {...iconProps} />
    case 'ollama':
      return <LlamaIcon size={15} />
    default:
      return null
  }
}
