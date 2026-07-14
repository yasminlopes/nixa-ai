# Nixa AI

Assistente de chat com RAG para a documentação NICE/CXone.

## Sobre o projeto

O Nixa AI nasceu para resolver um problema simples: encontrar respostas na documentação do NICE/CXone costuma significar navegar por dezenas de páginas e menus até chegar na informação certa. Aqui, o usuário faz uma pergunta em linguagem natural e recebe uma resposta direta, contextualizada e baseada no conteúdo oficial da plataforma.

Por trás da experiência existe uma arquitetura de **RAG (Retrieval-Augmented Generation)**: a documentação é crawleada, dividida em chunks e indexada para busca semântica. A cada pergunta, o sistema localiza os trechos mais relevantes da base e os usa como contexto para a geração da resposta — aumentando a precisão e reduzindo alucinações.

O projeto é **multi-LLM**: dá para alternar entre Gemini, OpenAI e Ollama (100% local, sem custo) conforme a necessidade, sem acoplamento a um único provedor.

## Stack

- **Frontend/API**: Next.js 14 (App Router) · TypeScript · Tailwind
- **LLMs**: Gemini · OpenAI · Ollama
- **RAG**: crawler próprio (Cheerio) · vector store em JSON local · busca híbrida (semântica + léxica) com re-rank · expansão de query PT→EN
- **Segurança**: API keys criptografadas com AES-256-GCM

## Como configurar

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Crie o `.env.local` (baseado no `.env.local.example`):

   ```env
   LLM_SETTINGS_MASTER_KEY=uma-chave-forte   # openssl rand -base64 48
   GEMINI_API_KEY=...                        # https://aistudio.google.com/app/apikey
   ```

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

As chaves de API também podem ser gerenciadas depois pela interface, em **LLM / Chaves** na sidebar.

---

Desenvolvido por Yasmin Lopes.
