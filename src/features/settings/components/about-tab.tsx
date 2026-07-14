import { SectionHeader } from './section-header'

export function AboutTab() {
  const cardStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  } as const

  const tagStyle = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-soft)',
  } as const

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Bastidores" title="Sobre o projeto." subtitle="Arquitetura e stack da Nixa AI." />

      {/* Architecture */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Arquitetura
        </p>
        <div className="space-y-3">
          {[
            { folder: 'core/', desc: 'Núcleo da aplicação — LLM adapters, embeddings, RAG pipeline, vectorstore, crawler, settings encryption. Zero dependência de UI.' },
            { folder: 'features/', desc: 'Features de UI com padrão smart/dumb. Containers gerenciam estado e chamadas de API; components são presentacionais.' },
            { folder: 'shared/', desc: 'Componentes, hooks, contextos, tipos e utilitários reutilizáveis entre features.' },
            { folder: 'app/', desc: 'Next.js App Router — páginas, layouts e API routes.' },
          ].map(({ folder, desc }) => (
            <div key={folder} className="flex gap-3">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono shrink-0 h-fit mt-0.5"
                style={tagStyle}
              >
                {folder}
              </span>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: 'var(--color-text-soft)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Stack
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
          {[
            ['Frontend',    'Next.js 14 · TypeScript · Tailwind'],
            ['Tipografia',  'Inter · Bricolage Grotesque · JetBrains Mono'],
            ['LLM',         'Gemini · OpenAI · Ollama'],
            ['Embeddings',  'Gemini · OpenAI · Ollama'],
            ['RAG',         'Crawler + chunk + busca híbrida + expansão PT→EN'],
            ['Vector store','JSON local com cosine + léxico'],
            ['Segurança',   'AES-256-GCM'],
            ['Seeds',       '90+ URLs NICE/CXone'],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span
                className="text-[10px] tracking-[0.15em] uppercase font-mono"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {k}
              </span>
              <span style={{ color: 'var(--color-text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Fluxo RAG
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
          {['docs', 'crawler', 'chunks', 'embeddings', 'vectorstore'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md px-2.5 py-1 font-mono" style={tagStyle}>
                {step}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              )}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
          {['pergunta', 'retrieval', 'contexto', 'LLM', 'resposta'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-md px-2.5 py-1 font-mono"
                style={{
                  ...tagStyle,
                  background: i === 1 || i === arr.length - 1 ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                  color: i === 1 || i === arr.length - 1 ? 'var(--color-accent-deep)' : 'var(--color-text-soft)',
                }}
              >
                {step}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Env */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Variáveis de ambiente
        </p>
        <div className="space-y-2.5 text-[13px]">
          {[
            ['LLM_SETTINGS_MASTER_KEY', 'Obrigatório — chave de criptografia AES-256'],
            ['GEMINI_API_KEY',          'Chave do Google AI Studio'],
            ['OLLAMA_BASE_URL',         'Default http://localhost:11434'],
            ['OLLAMA_MODEL',            'Default llama3.2:1b'],
            ['OLLAMA_EMBEDDING_MODEL',  'Default all-minilm'],
          ].map(([key, desc]) => (
            <div key={key} className="flex flex-wrap gap-2 items-baseline">
              <code
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono"
                style={tagStyle}
              >
                {key}
              </code>
              <span style={{ color: 'var(--color-text-soft)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div
        className="rounded-[16px] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={cardStyle}
      >
        <div>
          <p
            className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Desenvolvido por
          </p>
          <p
            className="font-display font-semibold text-[18px] tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Yasmin Lopes
          </p>
        </div>
        <a
          href="https://yasminlopes.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90 w-fit"
          style={{
            background: 'var(--color-surface-2)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-border)',
          }}
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
