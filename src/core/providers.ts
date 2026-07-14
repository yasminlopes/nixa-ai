export type Provider = 'gemini' | 'openai' | 'ollama';

export interface ProviderConfig {
  label: string;
  hint: string;
  color: string;
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  gemini: {
    label: 'Gemini',
    hint: 'Rápido e estável',
    color: '#4285F4',
  },
  openai: {
    label: 'OpenAI',
    hint: 'GPT para tasks gerais',
    color: '#10A37F',
  },
  ollama: {
    label: 'Ollama (local)',
    hint: 'Roda 100% local, sem custos',
    color: '#FF6B35',
  },
};
