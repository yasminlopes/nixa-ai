import clsx from 'clsx'
import { SectionHeader } from '../section-header'
import styles from './about-tab.module.scss'

const ARCHITECTURE = [
  { folder: 'core/', desc: 'Núcleo da aplicação — LLM adapters, embeddings, RAG pipeline, vectorstore, crawler, settings encryption. Zero dependência de UI.' },
  { folder: 'features/', desc: 'Features de UI com padrão smart/dumb. Containers gerenciam estado e chamadas de API; components são presentacionais.' },
  { folder: 'shared/', desc: 'Componentes, hooks, contextos, tipos e utilitários reutilizáveis entre features.' },
  { folder: 'app/', desc: 'Next.js App Router — páginas, layouts e API routes.' },
]

const STACK: Array<[string, string]> = [
  ['Frontend', 'Next.js 16 · TypeScript · SCSS Modules'],
  ['Tipografia', 'Inter · Bricolage Grotesque · JetBrains Mono'],
  ['LLM', 'Gemini · OpenAI · Ollama'],
  ['Embeddings', 'Gemini · OpenAI · Ollama'],
  ['RAG', 'Crawler + chunk + busca híbrida + expansão PT→EN'],
  ['Vector store', 'JSON local com cosine + léxico'],
  ['Segurança', 'AES-256-GCM'],
  ['Seeds', '90+ URLs NICE/CXone'],
]

const FLOW_INGEST = ['docs', 'crawler', 'chunks', 'embeddings', 'vectorstore']
const FLOW_QUERY = ['pergunta', 'retrieval', 'contexto', 'LLM', 'resposta']

const ENV_VARS: Array<[string, string]> = [
  ['GEMINI_API_KEY', 'Opcional — fallback compartilhado do site (visitantes usam a própria chave)'],
  ['OLLAMA_BASE_URL', 'Default http://localhost:11434'],
  ['OLLAMA_MODEL', 'Default llama3.2:1b'],
  ['OLLAMA_EMBEDDING_MODEL', 'Default all-minilm'],
]

export function AboutTab() {
  return (
    <div className={styles.wrapper}>
      <SectionHeader eyebrow="Bastidores" title="Sobre o projeto." subtitle="Arquitetura e stack da Nixa AI." />

      {/* Architecture */}
      <div className={styles.card}>
        <p className={styles.cardLabel}>Arquitetura</p>
        <div className={styles.archList}>
          {ARCHITECTURE.map(({ folder, desc }) => (
            <div key={folder} className={styles.archRow}>
              <span className={styles.archTag}>{folder}</span>
              <p className={styles.archDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className={styles.card}>
        <p className={styles.cardLabel}>Stack</p>
        <div className={styles.stackGrid}>
          {STACK.map(([k, v]) => (
            <div key={k} className={styles.stackItem}>
              <span className={styles.stackKey}>{k}</span>
              <span className={styles.stackValue}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow */}
      <div className={styles.card}>
        <p className={styles.cardLabel}>Fluxo RAG</p>
        <div className={styles.flowRow}>
          {FLOW_INGEST.map((step, i, arr) => (
            <span key={step} className={styles.flowStep}>
              <span className={styles.flowTag}>{step}</span>
              {i < arr.length - 1 && <span className={styles.flowArrow}>→</span>}
            </span>
          ))}
        </div>
        <div className={styles.flowRow}>
          {FLOW_QUERY.map((step, i, arr) => (
            <span key={step} className={styles.flowStep}>
              <span className={clsx(styles.flowTag, (i === 1 || i === arr.length - 1) && styles.flowTagHighlight)}>
                {step}
              </span>
              {i < arr.length - 1 && <span className={styles.flowArrow}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Env */}
      <div className={styles.card}>
        <p className={styles.cardLabel}>Variáveis de ambiente</p>
        <div className={styles.envList}>
          {ENV_VARS.map(([key, desc]) => (
            <div key={key} className={styles.envRow}>
              <code className={styles.envKey}>{key}</code>
              <span className={styles.envDesc}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div className={clsx(styles.card, styles.credits)}>
        <div>
          <p className={styles.creditsLabel}>Desenvolvido por</p>
          <p className={styles.creditsName}>Yasmin Lopes</p>
        </div>
        <a
          href="https://yasminlopes.dev"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.creditsLink}
        >
          yasminlopes.dev
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 L17 7" />
            <path d="M8 7 L17 7 L17 16" />
          </svg>
        </a>
      </div>
    </div>
  )
}
