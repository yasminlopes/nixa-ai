# Nixa AI

Assistente de chat com **RAG** para a documentação NICE/CXone. Faça uma pergunta em linguagem natural e receba uma resposta direta, contextualizada e fundamentada na documentação oficial da plataforma — com as fontes citadas.

🔗 **Demo:** [nixa-ai.vercel.app](https://nixa-ai.vercel.app)

---

## Sobre

Encontrar respostas na documentação do NICE/CXone costuma significar navegar por dezenas de páginas e menus. O Nixa AI resolve isso: você pergunta, ele responde com base no conteúdo oficial.

Por trás da experiência existe uma arquitetura de **RAG (Retrieval-Augmented Generation)**. A documentação é crawleada, dividida em chunks e indexada para busca semântica. A cada pergunta, o sistema localiza os trechos mais relevantes da base e os usa como contexto para gerar a resposta — aumentando a precisão e reduzindo alucinações.

O projeto é **multi-LLM**: alterne entre Gemini, OpenAI e Ollama (100% local, sem custo) sem acoplamento a um único provedor.

### Destaques

- **Busca híbrida** — combina similaridade semântica (embeddings) com busca léxica, seguida de re-rank por autoridade da fonte, tipo de página e recência.
- **Embedding fixo por índice** — a busca sempre usa o mesmo modelo de embedding com que a base foi indexada, independente do LLM de chat escolhido.
- **Fontes reais** — as respostas citam apenas as fontes efetivamente usadas.
- **Chaves seguras** — API keys criptografadas (AES-256-GCM), guardadas só no servidor; nunca voltam ao navegador.

---

## Stack

| Camada | Tecnologias |
|---|---|
| **Frontend / API** | Next.js 16 (App Router) · React 19 · TypeScript · SCSS Modules |
| **LLMs** | Gemini · OpenAI · Ollama |
| **RAG** | Crawler próprio (Cheerio) · vector store em JSON local · busca híbrida com re-rank · expansão de query PT→EN |
| **Segurança** | AES-256-GCM para as API keys |

---

## Arquitetura

```
Usuário → /api/chat → askNixa()
                          │
        ┌─────────────────┼──────────────────┐
   retrieval          prompt              providers
  (busca docs)   (monta contexto)     (Gemini/OpenAI/Ollama)
```

A API nunca conhece detalhes do provedor de IA — ela apenas chama `askNixa()`, que orquestra retrieval → prompt → geração. Trocar de modelo é mexer só na camada `providers/`.

### Estrutura de pastas

```
src/
├── app/                  App Router: páginas + API routes (/api/chat, /api/index-docs, /api/settings)
├── server/ai/            Orquestração de IA
│   ├── ai.service.ts     askNixa(): orquestrador único
│   ├── retrieval.service.ts   busca + expansão de query
│   ├── prompt.service.ts      montagem do contexto
│   └── providers/        implementações isoladas de LLM
├── core/                 Núcleo sem UI
│   ├── vectorstore.ts    busca híbrida, embeddings, storage
│   ├── crawler.ts        crawl + chunking + metadata
│   ├── embeddings/       providers de embedding
│   ├── rag.ts            system prompt + montagem de contexto
│   └── settings/         criptografia e storage das chaves
├── features/             telas (chat, sidebar, settings, onboarding, ...)
└── shared/               componentes, hooks, contexts, types reutilizáveis
```

---

## Como rodar localmente

> **Requisitos:** Node 18+ e pnpm 9+ (`npm i -g pnpm`). O projeto só aceita instalação via pnpm.

**1. Instale as dependências**

```bash
pnpm install
```

**2. (Opcional) Configure o ambiente**

Nenhuma variável é obrigatória — as chaves de API são salvas pela UI e ficam no navegador. Só crie um `.env.local` se for usar Ollama ou trocar o provider de embedding (veja [Variáveis de ambiente](#variáveis-de-ambiente)).

**3. Suba o app**

```bash
pnpm dev
```

Acesse `http://localhost:3000`, complete o **onboarding** (provider + chave), indexe a documentação (sidebar → **Indexar documentação**) e comece a conversar.

**Ollama (opcional, 100% local):**

```bash
ollama serve
ollama pull llama3.2:1b
ollama pull all-minilm
```

> Ollama só funciona rodando o projeto localmente (o servidor precisa alcançar o `localhost` da sua máquina). Na demo hospedada, use Gemini ou OpenAI.

### Variáveis de ambiente

O app **não usa nenhuma variável de ambiente para chaves de API** — elas ficam cifradas no navegador (ver a seção abaixo). Todas as variáveis são opcionais:

| Variável | Descrição |
|---|---|
| `NIXA_EMBEDDING_PROVIDER` | Provider de embedding do índice (`gemini` \| `openai` \| `ollama`). Default `gemini`. Trocar exige re-indexar. |
| `OLLAMA_BASE_URL` | Default `http://localhost:11434`. |
| `OLLAMA_MODEL` | Default `llama3.2:1b`. |
| `RAG_DEBUG` | `true` loga um trace de retrieval por request (query, scores, confiança). |

### Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe o app em desenvolvimento. |
| `pnpm build` | Build de produção. |
| `pnpm start` | Sobe o build de produção. |

---

## Como as chaves são tratadas

1. Você salva a chave uma vez em **Configurações**.
2. Ela é cifrada e guardada **no seu navegador** (`react-secure-storage`) — nunca vai para o disco do servidor.
3. A cada request (`/api/chat`, `/api/index-docs`), o navegador envia a chave no body, sobre HTTPS; o servidor a usa na hora e não persiste nada. A interface mostra só uma versão mascarada (ex.: `AIza************kIjDs`).

> **Por que assim:** funciona em serverless sem disco persistente (ex.: Vercel) sem precisar de nenhuma env de chave nem de um banco. A chave é sua e vive no seu navegador — some se você limpar os dados do site (a Zona de perigo faz isso de propósito).

---

## Como contribuir

Contribuições são bem-vindas! O projeto é open source.

1. Faça um **fork** e crie uma branch a partir da `main`:

   ```bash
   git checkout -b feat/minha-melhoria
   ```

2. Rode o projeto localmente (seção acima) e faça suas mudanças.

3. Antes de abrir o PR, garanta que o build passa:

   ```bash
   pnpm build
   ```

4. Abra um **Pull Request** descrevendo o que mudou e por quê.

### Convenções

- **TypeScript** em tudo; sem `any` desnecessário.
- **Nomes descritivos** — evite variáveis de uma letra (`const response`, não `const r`).
- **Arquitetura**: `shared/ui` para componentes reutilizáveis, `features/` para telas específicas, `core/` sem dependência de UI, `server/ai/` para orquestração de IA.
- **Estilos** via SCSS Modules + tokens do design system (sem `!important`, sem cores hardcoded).
- **Commits** claros e no imperativo.

---

Desenvolvido por [Yasmin Lopes](https://yasminlopes.dev).
