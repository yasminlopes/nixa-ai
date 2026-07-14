import { type LucideIcon } from 'lucide-react'

interface Step {
  icon: LucideIcon
  title: string
  desc: string
  accent?: boolean
}

export function PhaseCard({
  phaseLabel,
  phaseTitle,
  phaseHint,
  steps,
}: {
  phaseLabel: string
  phaseTitle: string
  phaseHint: string
  steps: Step[]
}) {
  return (
    <div
      className="rounded-3xl p-6 mb-4 last:mb-0"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Phase header */}
      <div className="mb-5 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-1"
          style={{ color: 'var(--color-accent)' }}
        >
          {phaseLabel}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
          <h3
            className="font-display font-semibold text-[22px] tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            {phaseTitle}
          </h3>
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            {phaseHint}
          </p>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-4">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.title} className="flex gap-4">
              {/* Number + icon column */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center relative"
                  style={{
                    background: step.accent ? 'var(--color-accent)' : 'var(--color-surface-2)',
                    color: step.accent ? '#FFFFFF' : 'var(--color-text-soft)',
                    border: `1px solid ${step.accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="w-px flex-1 mt-1"
                    style={{ background: 'var(--color-border)', minHeight: 16 }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4
                    className="font-display font-semibold text-[15px] tracking-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {step.title}
                  </h4>
                </div>
                <p
                  className="text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--color-text-soft)' }}
                >
                  {step.desc}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
