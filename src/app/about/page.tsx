import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre o projeto | Nixa AI',
  description: 'Arquitetura, tecnologias e fluxo da Nixa AI',
}

export default function AboutPage() {
  return (
    <main className="h-full overflow-y-auto bg-[#fdfefe] px-6 py-8 text-[#17223d]">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold mb-2">Nixa AI</h1>
        <p className="text-[#425f83] mb-8">
          Informacoes do projeto, tecnologias utilizadas e fluxo de funcionamento.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Arquitetura atual</h2>
          <div className="overflow-x-auto rounded-xl border border-[#d4e0f3]">
            <table className="w-full text-sm">
              <thead className="bg-[#d4e0f3] text-[#17223d]">
                <tr>
                  <th className="px-4 py-3 text-left">Camada</th>
                  <th className="px-4 py-3 text-left">Ferramenta</th>
                  <th className="px-4 py-3 text-left">Por que</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">Frontend</td>
                  <td className="px-4 py-3">Next.js 14 + Tailwind CSS</td>
                  <td className="px-4 py-3">UI estilo Claude, SSR, streaming nativo</td>
                </tr>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">LLM</td>
                  <td className="px-4 py-3">Gemini · OpenAI · Anthropic (selecionavel)</td>
                  <td className="px-4 py-3">Multi-provider com chave por usuario</td>
                </tr>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">Embeddings</td>
                  <td className="px-4 py-3">Gemini gemini-embedding-001</td>
                  <td className="px-4 py-3">768 dimensoes, free tier generoso</td>
                </tr>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">Vector Store</td>
                  <td className="px-4 py-3">LanceDB Cloud (db://nixa-ai-7iz8e6)</td>
                  <td className="px-4 py-3">Persistencia em nuvem, busca vetorial nativa</td>
                </tr>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">RAG</td>
                  <td className="px-4 py-3">Busca hibrida (semantica + lexical)</td>
                  <td className="px-4 py-3">Pesos adaptativos, reranking, breadcrumb boost</td>
                </tr>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">Crawler</td>
                  <td className="px-4 py-3">Cheerio + fetch (54 seeds)</td>
                  <td className="px-4 py-3">Help NICE, Developer Portal, GitHub, npm</td>
                </tr>
                <tr className="border-t border-[#d4e0f3]">
                  <td className="px-4 py-3">Deploy</td>
                  <td className="px-4 py-3">Vercel</td>
                  <td className="px-4 py-3">CI/CD automatico, runtime Node.js</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Fluxo da Nixa</h2>
          <div className="rounded-xl border border-[#d4e0f3] bg-white p-4 overflow-x-auto">
            <pre className="text-sm leading-6 text-[#17223d]">
{`Docs NICE/CXone (54 seeds)
  → Crawler Cheerio (depth 2, staleness check)
  → Chunks c/ breadcrumb injection (900 chars, overlap 200)
  → Gemini Embeddings (768-dim)
  → LanceDB Cloud

Usuario → pergunta
  → Embedding da query
  → LanceDB vector search (top 24-50 candidatos)
  → Busca hibrida semantica+lexical (pesos adaptativos)
  → Reranking (authority boost, recency, breadcrumb, pageType)
  → Contexto XML injetado no prompt
  → LLM (Gemini/OpenAI/Anthropic) → resposta em streaming`}
            </pre>
          </div>
          <p className="text-[#425f83] mt-4 text-sm">
            Contexto de conversa: historico da sessao + RAG dos chunks mais relevantes passados ao LLM via prompt estruturado.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Variaveis de ambiente necessarias</h2>
          <div className="rounded-xl border border-[#d4e0f3] bg-white p-4">
            <pre className="text-sm leading-6 text-[#17223d]">
{`GEMINI_API_KEY=          # Google AI Studio - obrigatorio
LANCEDB_URI=             # db://nixa-ai-7iz8e6
LANCEDB_API_KEY=         # sk_... (LanceDB Cloud)
LANCEDB_REGION=          # us-east-1
LLM_SETTINGS_MASTER_KEY= # chave mestra para criptografia

# Opcionais (multi-provider)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=`}
            </pre>
          </div>
        </section>

        <footer className="text-sm text-[#425f83] border-t border-[#d4e0f3] pt-4">
          Desenvolvido por yasmin lopes.
        </footer>
      </div>
    </main>
  )
}
