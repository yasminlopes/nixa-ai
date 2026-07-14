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
import styles from './index.module.scss'

const STACK: Array<[string, string]> = [
  ['Frontend', 'Next.js 16 · App Router · SCSS Modules'],
  ['Tipografia', 'Inter · Bricolage Grotesque · JetBrains Mono'],
  ['LLM', 'Gemini · OpenAI · Ollama'],
  ['Embeddings', 'Gemini · OpenAI · Ollama'],
  ['Vector store', 'JSON local (cosine + léxico)'],
  ['Crawler', 'Cheerio + fetch · 90+ seeds'],
  ['Segurança', 'Chaves cifradas no navegador · nunca salvas no servidor'],
  ['Deploy', 'Local-first · Vercel-ready'],
]

export function AboutView() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>

        {/* Hero */}
        <div className={styles.hero}>
          <p className={styles.heroEyebrow}>— uma assistente em NICE CXone</p>
          <h1 className={styles.heroTitle}>Nixa.</h1>
          <p className={styles.heroSubtitle}>
            Um chat com RAG sobre a documentação oficial da NICE/CXone.
            Local-first, multi-LLM, focado em respostas precisas com citação de fonte.
          </p>
        </div>

        {/* ─── Como funciona ────────────────────────────────────────── */}
        <Section eyebrow="01" title="Como funciona">
          <p className={styles.introText}>
            Dois momentos: a <b className={styles.introStrong}>indexação</b> acontece uma vez (ou sempre que você quiser atualizar a base) e a <b className={styles.introStrong}>conversa</b> roda a cada pergunta.
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
          <div className={styles.infoCard}>
            {STACK.map(([k, v]) => (
              <div key={k} className={styles.infoItem}>
                <span className={styles.infoKey}>{k}</span>
                <span className={styles.infoValue}>{v}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ─── Env vars ───────────────────────────────────────────────── */}
        <Section eyebrow="03" title="Variáveis de ambiente">
          <div className={styles.envCard}>
            <pre className={styles.envPre}>
{`# Nenhuma chave de API em env — elas ficam cifradas no navegador
# (react-secure-storage) e vão ao servidor a cada request. Tudo opcional:

# Ollama (local, sem chave)
OLLAMA_BASE_URL=              # default http://localhost:11434
OLLAMA_MODEL=                 # default llama3.2:1b
OLLAMA_EMBEDDING_MODEL=       # default all-minilm

# Provider de embedding do índice (gemini | openai | ollama)
NIXA_EMBEDDING_PROVIDER=      # default gemini`}
            </pre>
          </div>
        </Section>

        {/* Footer / credits */}
        <footer className={styles.footer}>
          <div className={styles.footerRow}>
            <div>
              <p className={styles.footerName}>Desenvolvido por Yasmin Lopes</p>
              <a
                href="https://yasminlopes.dev"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                yasminlopes.dev
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 L17 7" />
                  <path d="M8 7 L17 7 L17 16" />
                </svg>
              </a>
            </div>
            <p className={styles.footerYear}>{new Date().getFullYear()} · Nixa AI</p>
          </div>
        </footer>
      </div>
    </main>
  )
}
