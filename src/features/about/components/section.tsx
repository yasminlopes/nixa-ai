export function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-14">
      <div className="flex items-baseline gap-3 mb-5">
        <span
          className="text-[11px] tracking-[0.15em] font-mono"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {eyebrow}
        </span>
        <h2
          className="font-display font-semibold text-[28px] tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}
