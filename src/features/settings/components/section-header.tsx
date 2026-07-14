export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-3"
          style={{ color: 'var(--color-accent)' }}
        >
          {eyebrow}
        </p>
      )}
      <h2 className="font-display font-semibold text-[32px] sm:text-[38px] leading-[1.1] tracking-tight" style={{ color: 'var(--color-text)' }}>
        {title}
      </h2>
      {subtitle && (
        <p
          className="font-sans text-[16px] leading-relaxed mt-2 max-w-md"
          style={{ color: 'var(--color-text-soft)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
