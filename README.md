# Nixa AI

Assistente de chat com RAG para a documentação NICE/CXone.

🔗 **Demo:** [nixa-ai.vercel.app](https://nixa-ai.vercel.app)

## Sobre o projeto

O Nixa AI nasceu para resolver um problema simples: encontrar respostas na documentação do NICE/CXone costuma significar navegar por dezenas de páginas e menus até chegar na informação certa. Aqui, o usuário faz uma pergunta em linguagem natural e recebe uma resposta direta, contextualizada e baseada no conteúdo oficial da plataforma.

Por trás da experiência existe uma arquitetura de **RAG (Retrieval-Augmented Generation)**: a documentação é crawleada, dividida em chunks e indexada para busca semântica. A cada pergunta, o sistema localiza os trechos mais relevantes da base e os usa como contexto para a geração da resposta — aumentando a precisão e reduzindo alucinações.

O projeto é **multi-LLM**: dá para alternar entre Gemini, OpenAI e Ollama (100% local, sem custo) conforme a necessidade, sem acoplamento a um único provedor.

## Stack

- **Frontend/API**: Next.js 16 (App Router) · React 19 · TypeScript · SCSS Modules
- **LLMs**: Gemini · OpenAI · Ollama
- **RAG**: crawler próprio (Cheerio) · vector store em JSON local · busca híbrida (semântica + léxica) com re-rank · expansão de query PT→EN
- **Segurança**: API keys criptografadas (AES-256-GCM) e guardadas só no servidor — nunca trafegam de volta pro navegador nem aparecem em `/api/chat`

> Ollama funciona rodando o projeto localmente (o servidor precisa alcançar o `localhost` da sua máquina). Na [demo hospedada](https://nixa-ai.vercel.app), use Gemini ou OpenAI.

## Como configurar

> Requisitos: Node 18+ e pnpm 9+ (`npm i -g pnpm`). O projeto só aceita instalação via pnpm.

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Crie o `.env.local` (baseado no `.env.local.example`):

   ```env
   SETTINGS_ENCRYPTION_KEY=uma-chave-forte   # openssl rand -base64 48
   GEMINI_API_KEY=...                        # opcional — fallback compartilhado; https://aistudio.google.com/app/apikey
   ```

   `SETTINGS_ENCRYPTION_KEY` é obrigatória: é dela que deriva a chave AES-256-GCM usada pra criptografar as API keys salvas em disco.

3. (Opcional) Para rodar 100% local com Ollama:

   ```bash
   ollama serve
   ollama pull llama3.2:1b
   ollama pull all-minilm
   ```

## Como usar

1. Suba o app:

   ```bash
   pnpm dev
   ```

2. Acesse `http://localhost:3000` e complete o **onboarding** (escolha do provider e chave de API).

3. Indexe a documentação — pela interface (sidebar → **Indexar documentação**) ou via CLI:

   ```bash
   pnpm index-docs
   ```

4. Comece a conversar. As respostas citam as fontes da documentação usadas como contexto.

As chaves de API são gerenciadas pela interface, em **LLM / Chaves** na sidebar. O fluxo:

1. Você salva a chave uma vez em **Configurações**.
2. O servidor criptografa (AES-256-GCM) e grava em `data/settings.enc.json` (fora do git).
3. Dali em diante, o navegador nunca mais vê nem reenvia a chave — `/api/chat` recebe só `{ provider, messages }` e o servidor busca a chave internamente. A interface mostra apenas uma versão mascarada (ex.: `AIza************kIjDs`).

> **Limitação em serverless sem disco persistente** (ex.: Vercel): o arquivo `data/settings.enc.json` não sobrevive entre cold starts nessas plataformas, então a chave salva pode "sumir" depois de um tempo sem uso. Isso é inerente a rodar num FS efêmero, não um bug da aplicação. Pra produção nessas plataformas, troque `settings-store.ts` por um backend persistente (Vercel KV, Upstash Redis, um banco) — a lógica de criptografia (`core/settings/crypto.ts`) continua igual. Rodando local ou num servidor com disco próprio (Docker, VPS, Railway, etc.), a persistência funciona normalmente.

---

Desenvolvido por Yasmin Lopes.
