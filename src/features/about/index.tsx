import {
  Globe,
  Scissors,
  Sparkles,
  Database,
  MessageSquare,
  Languages,
  Search,
  ShieldCheck,
  Bot,
} from 'lucide-react'

import { Section } from './components/section'
import { PhaseCard } from './components/phase-card'

export function AboutView() {
  return (
    <main
      className="h-full overflow-y-auto"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Hero */}
        <div className="mb-14">
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-mono mb-4"
            style={{ color: 'var(--color-accent)' }}
          >
            — uma assistente em NICE CXone
          </p>
          <h1
            className="font-display font-semibold text-[56px] sm:text-[68px] leading-[0.95] tracking-tight mb-5"
            style={{ color: 'var(--color-text)' }}
          >
            Nixa.
          </h1>
          <p
            className="text-[16px] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-text-soft)' }}
          >
            Um chat com RAG sobre a documentação oficial da NICE/CXone.
            Local-first, multi-LLM, focado em respostas precisas com citação de fonte.
          </p>
        </div>

        {/* ─── Como funciona ────────────────────────────────────────── */}
        <Section eyebrow="01" title="Como funciona">
          <p
            className="text-[14px] leading-relaxed mb-6 max-w-xl"
            style={{ color: 'var(--color-text-soft)' }}
          >
            Dois momentos: a <b style={{ color: 'var(--color-text)' }}>indexação</b> acontece uma vez (ou sempre que você quiser atualizar a base) e a <b style={{ color: 'var(--color-text)' }}>conversa</b> roda a cada pergunta.
          </p>

          {/* Fase 1 — Indexação */}
          <PhaseCard
            phaseLabel="Fase 01 — preparação"
            phaseTitle="Indexação"
            phaseHint="Roda uma vez, ou ao atualizar docs."
            steps={[
              {
                icon: Globe,
                title: 'Crawler',
                desc: 'Visita ~90 URLs NICE/CXone (help center, developer portal, GitHub). Extrai conteúdo + breadcrumb de cada página.',
              },
              {
                icon: Scissors,
                title: 'Chunking',
                desc: 'Quebra texto em pedaços de ~900 caracteres com 200 de overlap. Cada chunk leva o caminho da seção embutido.',
              },
              {
                icon: Sparkles,
                title: 'Embeddings',
                desc: 'Converte cada chunk em vetor numérico via Gemini, OpenAI ou Ollama (local). Esse vetor representa o significado.',
              },
              {
                icon: Database,
                title: 'Armazenamento',
                desc: 'Salva chunks + vetores + metadata em JSON local (data/vectorstore.json). Zero infra, persistência em disco.',
              },
            ]}
          />

          {/* Fase 2 — Conversa */}
          <PhaseCard
            phaseLabel="Fase 02 — em tempo real"
            phaseTitle="Conversa"
            phaseHint="A cada pergunta que você envia."
            steps={[
              {
                icon: MessageSquare,
                title: 'Pergunta',
                desc: 'Você escreve em português (ou inglês). A query original é preservada.',
              },
              {
                icon: Languages,
                title: 'Expansão PT → EN',
                desc: 'Dicionário técnico adiciona termos em inglês equivalentes (ex: "sentimento" → "sentiment positive negative neutral") pra melhorar recall em docs.',
              },
              {
                icon: Search,
                title: 'Busca híbrida + rerank',
                desc: 'Cosine semântico + similaridade léxica, top-5 chunks. Rerank ajusta com sinais: autoridade da fonte, page_type, recência, match no breadcrumb.',
              },
              {
                icon: ShieldCheck,
                title: 'Gate de domínio',
                desc: 'Se nenhum chunk passa do threshold (0.22) E a pergunta não tem termos NICE, devolve "fora de escopo" sem chamar o LLM.',
                accent: true,
              },
              {
                icon: Bot,
                title: 'LLM responde',
                desc: 'Os chunks viram contexto XML estruturado por tipo. O LLM (Gemini, OpenAI, Ollama) gera a resposta citando fonte inline.',
              },
            ]}
          />
        </Section>

        {/* ─── Stack ──────────────────────────────────────────────────── */}
        <Section eyebrow="02" title="Stack">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 rounded-3xl p-6"
               style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {[
              ['Frontend',     'Next.js 16 · App Router · Tailwind'],
              ['Tipografia',   'Inter · Bricolage Grotesque · JetBrains Mono'],
              ['LLM',          'Gemini · OpenAI · Ollama'],
              ['Embeddings',   'Gemini · OpenAI · Ollama'],
              ['Vector store', 'JSON local (cosine + léxico)'],
              ['Crawler',      'Cheerio + fetch · 90+ seeds'],
              ['Segurança',    'AES-256-GCM nas chaves de API'],
              ['Deploy',       'Local-first · Vercel-ready'],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <span
                  className="text-[10px] tracking-[0.15em] uppercase font-mono"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {k}
                </span>
                <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ─── Env vars ───────────────────────────────────────────────── */}
        <Section eyebrow="03" title="Variáveis de ambiente">
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <pre
              className="text-[12.5px] leading-7 overflow-x-auto scrollbar-thin"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono), monospace' }}
            >
{`LLM_SETTINGS_MASTER_KEY=   # AES-256 master key (obrigatório)
GEMINI_API_KEY=            # Google AI Studio — gratuito

# Opcionais
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
HUGGINGFACE_API_KEY=

# Ollama (local, sem chave)
OLLAMA_BASE_URL=           # default http://localhost:11434
OLLAMA_MODEL=              # default llama3.2:1b
OLLAMA_EMBEDDING_MODEL=    # default all-minilm`}
            </pre>
          </div>
        </Section>

        {/* Footer / credits */}
        <footer
          className="mt-20 pt-8"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p
                className="font-display font-semibold text-[18px] tracking-tight"
                style={{ color: 'var(--color-text)' }}
              >
                Desenvolvido por Yasmin Lopes
              </p>
              <a
                href="https://yasminlopes.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] mt-1 transition-colors hover:underline underline-offset-4"
                style={{ color: 'var(--color-accent)' }}
              >
                yasminlopes.dev
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 L17 7" />
                  <path d="M8 7 L17 7 L17 16" />
                </svg>
              </a>
            </div>
            <p
              className="text-[11px] tracking-wide font-mono"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {new Date().getFullYear()} · Nixa AI
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
