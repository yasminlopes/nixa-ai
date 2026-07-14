'use client';

import { ChatGPT, Google } from 'developer-icons';

import { type Provider } from '@/core/providers';

import { LlamaIcon } from '../llama-icon';

export function ProviderIcon({ provider }: { provider: Provider }) {
  const iconProps = { size: 16 };

  switch (provider) {
    case 'gemini':
      return <Google {...iconProps} />;
    case 'openai':
      return <ChatGPT {...iconProps} />;
    case 'ollama':
      return <LlamaIcon size={15} />;
    default:
      return null;
  }
}
