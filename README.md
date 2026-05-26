# Nixa AI

Assistente de chat com RAG para documentacao NICE/CXone. Suporta multiplos LLMs (Gemini, OpenAI, Anthropic, Groq, Hugging Face, Ollama).

## Como rodar

```bash
bun install
bun dev
```

Acesse `http://localhost:3000`.

## Configuracao

Crie um arquivo `.env.local` com:

```env
GEMINI_API_KEY=...
LLM_SETTINGS_MASTER_KEY=uma-chave-forte
FREE_TIER=true
```

Gerar chave forte: `openssl rand -base64 48`

As outras API keys (OpenAI, Anthropic, etc.) sao configuradas pela interface em **LLM / Chaves** na sidebar.

## Uso

1. Abra a sidebar e clique em **Indexar documentacao**.
2. Comece a conversar.

---

Desenvolvido por yasmin lopes.
