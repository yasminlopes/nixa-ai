import { ArrowDown, BookOpen, Brain, Sparkles } from 'lucide-react';

import { SectionHeader } from '../section-header';

import styles from './about-tab.module.scss';

const STEPS = [
  {
    icon: Brain,
    title: 'Entendimento',
    desc: 'A pergunta é analisada por modelos de IA para identificar intenção e contexto.',
  },
  {
    icon: BookOpen,
    title: 'Busca inteligente',
    desc: 'A Nixa encontra os trechos relevantes na base de conhecimento NICE/CXone.',
  },
  {
    icon: Sparkles,
    title: 'Resposta contextual',
    desc: 'O modelo gera uma resposta fundamentada nas fontes encontradas, com citações.',
  },
];

const TECH_GROUPS: Array<{ label: string; items: string[] }> = [
  { label: 'Frontend', items: ['Next.js', 'TypeScript', 'SCSS Modules'] },
  { label: 'IA', items: ['Gemini', 'OpenAI', 'Ollama'] },
  { label: 'Conhecimento', items: ['RAG', 'Embeddings', 'Vector Store'] },
  { label: 'Segurança', items: ['AES-256-GCM'] },
];

export function AboutTab() {
  return (
    <div className={styles.wrapper}>
      <SectionHeader
        eyebrow="Assistente de IA"
        title="Sobre a Nixa."
        subtitle="Uma assistente inteligente especializada em NICE e CXone."
      />

      <p className={styles.lead}>
        A Nixa usa inteligência artificial, busca semântica e conhecimento contextual para responder
        perguntas com base na documentação oficial da plataforma NICE/CXone.
      </p>

      {/* Como funciona */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Como funciona</h3>
        <div className={styles.steps}>
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className={styles.stepItem}>
              <div className={styles.stepCard}>
                <div className={styles.stepIcon}>
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </div>
                <div>
                  <p className={styles.stepTitle}>{title}</p>
                  <p className={styles.stepDesc}>{desc}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowDown size={16} className={styles.stepArrow} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tecnologias */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tecnologias</h3>
        <div className={styles.techGroups}>
          {TECH_GROUPS.map(({ label, items }) => (
            <div key={label} className={styles.techGroup}>
              <span className={styles.techGroupLabel}>{label}</span>
              <div className={styles.chips}>
                {items.map((item) => (
                  <span key={item} className={styles.chip}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Créditos */}
      <div className={styles.credits}>
        <div>
          <p className={styles.creditsLabel}>Criado por</p>
          <p className={styles.creditsName}>Yasmin Lopes</p>
        </div>
        <a
          href="https://yasminlopes.dev"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.creditsLink}
        >
          yasminlopes.dev
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 L17 7" />
            <path d="M8 7 L17 7 L17 16" />
          </svg>
        </a>
      </div>
    </div>
  );
}
