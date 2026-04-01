# Nixa AI

Assistente para documentacao NICE/CXone com RAG, chat e suporte multi-LLM (Gemini, OpenAI, Anthropic, Groq e Hugging Face).

## O que o projeto faz

- Indexa documentacoes e cria uma base local de contexto.
- Responde perguntas usando contexto recuperado (RAG) + historico da conversa.
- Permite trocar o provedor de LLM pela interface.
- Salva chaves de API com criptografia no servidor.
- Suporte a tema claro e escuro com toggle na interface.

## Como iniciar o projeto

### 1. Requisitos

- Node.js 18+
- Bun (recomendado, opcional)

### 2. Instalar dependencias

```bash
bun install
```

Se preferir npm:

```bash
npm install
```

### 3. Configurar variaveis de ambiente

Crie/edite o arquivo `.env.local` na raiz com:

```env
# Google AI Studio (obrigatorio para embeddings e Gemini)
GEMINI_API_KEY=...

# LanceDB Cloud (vector store)
LANCEDB_URI=db://nixa-ai-7iz8e6
LANCEDB_API_KEY=sk_...
LANCEDB_REGION=us-east-1

# Criptografia das chaves salvas no modal de configuracao (obrigatorio)
LLM_SETTINGS_MASTER_KEY=uma-chave-forte-e-unica

# Opcionais (multi-provider)
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...
# GROQ_API_KEY=...
# HUGGINGFACE_API_KEY=...
# HUGGINGFACE_MODEL=microsoft/Phi-3-mini-4k-instruct
```

Gerar uma chave forte para `LLM_SETTINGS_MASTER_KEY`:

```bash
openssl rand -base64 48
```

### 4. Rodar em desenvolvimento

```bash
bun dev
```

Abra `http://localhost:3000`.

### 5. Indexar documentacao

Use o botao **Indexar documentacao** na sidebar.

Opcional por script:

```bash
bun run index-docs
```

## Como funciona (resumo)

```text
Docs NICE/CXone (54 seeds)
  → Crawler Cheerio → chunks c/ breadcrumb → Gemini Embeddings
  → LanceDB Cloud

Usuario → pergunta → embedding → LanceDB vector search
  → busca hibrida (semantica + lexical) → reranking
  → contexto XML → LLM (Gemini/OpenAI/Anthropic/Groq/Hugging Face) → resposta streaming
```

## Configuracao de LLM

- Abra **LLM / Chaves** na sidebar.
- Defina o provedor padrao.
- Salve as API keys por provedor.

As chaves sao criptografadas com AES-256-GCM e armazenadas em `data/llm-settings.json`.

## Estrutura principal

- `src/app/api/chat/route.ts`: endpoint de chat (RAG + providers)
- `src/app/api/settings/route.ts`: leitura/escrita das configuracoes de LLM
- `src/lib/llm-settings.ts`: criptografia e persistencia das chaves
- `src/lib/vectorstore.ts`: indexacao e busca de contexto
- `src/lib/crawler.ts`: descoberta e extracao de paginas
- `scripts/index-docs.ts`: indexacao via script

## FAQ

### 1) "LLM_SETTINGS_MASTER_KEY missing"

A variavel obrigatoria nao foi definida no `.env.local`.
Adicione `LLM_SETTINGS_MASTER_KEY` e reinicie o servidor.

### 2) Onde as chaves ficam salvas?

Em `data/llm-settings.json`, sempre criptografadas no servidor.

### 3) A chave aparece em texto puro na API?

Nao. A API retorna apenas status (se existe chave), nao retorna segredo.

### 4) Preciso preencher chaves de todos os provedores?

Nao. Apenas dos provedores que voce vai usar.

### 5) O chat funciona sem indexar docs?

Sim, mas sem o contexto completo de RAG. Indexar melhora muito a qualidade.

### 6) Troquei variavel no `.env.local` e nao refletiu

Reinicie o servidor (`bun dev`/`npm run dev`) para recarregar env.

### 7) Recebi erro de modelo nao encontrado ou quota

Troque o provedor no seletor de LLM, valide a chave do provider e tente novamente.

### 8) Como usar o Hugging Face?

Para usar modelos do Hugging Face:
1. Obtenha uma API key em https://huggingface.co/settings/tokens
2. Configure a chave no modal de configuracoes (LLM / Chaves)
3. Selecione "Hugging Face" como provedor
4. (Opcional) Defina modelos customizados via variaveis de ambiente:
   - `HUGGINGFACE_MODEL` para chat (padrao: microsoft/Phi-3-mini-4k-instruct)
   - `HUGGINGFACE_EMBEDDING_MODEL` para embeddings (padrao: sentence-transformers/all-MiniLM-L6-v2)

**Modelos recomendados para API gratuita:**
- `microsoft/Phi-3-mini-4k-instruct` (padrão, rápido e eficiente)
- `HuggingFaceH4/zephyr-7b-beta` (alternativa boa)
- `google/flan-t5-xxl` (mais leve)

### 9) Como trocar entre tema claro e escuro?

Use o botao de toggle (icone de sol/lua) localizado na sidebar, acima do botao de perfil.
O tema escolhido e salvo automaticamente no navegador.

### 10) Quais providers suportam embeddings?

Nem todos os providers oferecem API de embeddings:

**✅ Suportam embeddings:**
- Gemini (recomendado)
- OpenAI
- Hugging Face

**❌ Não suportam embeddings:**
- Groq (use apenas para chat)
- Anthropic (use apenas para chat)

Para indexacao de documentos e busca RAG, escolha Gemini, OpenAI ou Hugging Face como provider.

### 11) Como usar o modo FREE TIER (storage local)?

Para testar sem limitações do LanceDB Cloud, ative o modo FREE_TIER que usa storage local em JSON:

```env
FREE_TIER=true
```

**Modo FREE_TIER (storage local):**
- ✅ Sem limites de chunks
- ✅ Sem limites de busca
- ✅ Armazena tudo em `data/vectorstore.json`
- ✅ Usa mais RAM mas funciona offline
- ✅ Ideal para testes e desenvolvimento

**Modo LanceDB Cloud (produção):**
```env
FREE_TIER=false
# Descomente as variáveis do LanceDB:
LANCEDB_URI=db://seu-db
LANCEDB_API_KEY=sk_...
LANCEDB_REGION=us-east-1
```

**Importante:** Ao trocar de modo, você precisará reindexar os documentos.

---

Desenvolvido por yasmin lopes.
