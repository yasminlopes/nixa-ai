# Nixa AI

Assistente de chat com RAG para a documentação NICE/CXone.

🔗 **Demo:** [nixa-ai.vercel.app](https://nixa-ai.vercel.app)

## Sobre o projeto

O Nixa AI nasceu para resolver um problema simples: encontrar respostas na documentação do NICE/CXone costuma significar navegar por dezenas de páginas e menus até chegar na informação certa. Aqui, o usuário faz uma pergunta em linguagem natural e recebe uma resposta direta, contextualizada e baseada no conteúdo oficial da plataforma.

Por trás da experiência existe uma arquitetura de **RAG (Retrieval-Augmented Generation)**: a documentação é crawleada, dividida em chunks e indexada para busca semântica. A cada pergunta, o sistema localiza os trechos mais relevantes da base e os usa como contexto para a geração da resposta — aumentando a precisão e reduzindo alucinações.

O projeto é **multi-LLM**: dá para alternar entre Gemini, OpenAI e Ollama (100% local, sem custo) conforme a necessidade, sem acoplamento a um único provedor.

## Stack

- **Frontend/API**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind
- **LLMs**: Gemini · OpenAI · Ollama
- **RAG**: crawler próprio (Cheerio) · vector store em JSON local · busca híbrida (semântica + léxica) com re-rank · expansão de query PT→EN
- **Segurança**: cada visitante guarda a própria API key só no localStorage do navegador — nunca em disco no servidor

> Ollama funciona rodando o projeto localmente (o servidor precisa alcançar o `localhost` da sua máquina). Na [demo hospedada](https://nixa-ai.vercel.app), use Gemini ou OpenAI.

## Como configurar

> Requisitos: Node 18+ e pnpm 9+ (`npm i -g pnpm`). O projeto só aceita instalação via pnpm.

1. Instale as dependências:

   ```bash
   pnpm install
   ```

2. Crie o `.env.local` (baseado no `.env.local.example`) — opcional, só se você quiser um fallback compartilhado do site (visitantes sem chave própria usam essa):

   ```env
   GEMINI_API_KEY=...   # https://aistudio.google.com/app/apikey
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

As chaves de API são gerenciadas pela interface, em **LLM / Chaves** na sidebar, e ficam salvas só no seu navegador (localStorage) — nunca em disco no servidor. Isso evita depender de persistência em ambientes serverless (Vercel, por exemplo, tem filesystem somente leitura) e faz cada visitante usar a própria chave, sem compartilhar configuração com outros usuários do site.

---

Desenvolvido por Yasmin Lopes.
