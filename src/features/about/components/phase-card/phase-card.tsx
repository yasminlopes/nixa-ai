import clsx from 'clsx';
import { type LucideIcon } from 'lucide-react';

import styles from './phase-card.module.scss';

interface Step {
  icon: LucideIcon;
  title: string;
  desc: string;
  accent?: boolean;
}

export function PhaseCard({
  phaseLabel,
  phaseTitle,
  phaseHint,
  steps,
}: {
  phaseLabel: string;
  phaseTitle: string;
  phaseHint: string;
  steps: Step[];
}) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.phaseLabel}>{phaseLabel}</p>
        <div className={styles.headerRow}>
          <h3 className={styles.phaseTitle}>{phaseTitle}</h3>
          <p className={styles.phaseHint}>{phaseHint}</p>
        </div>
      </div>

      <ol className={styles.list}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className={styles.step}>
              <div className={styles.stepMarker}>
                <div className={clsx(styles.stepIcon, step.accent && styles.stepIconAccent)}>
                  <Icon size={16} strokeWidth={2} />
                </div>
                {i < steps.length - 1 && <div className={styles.stepConnector} />}
              </div>

              <div className={styles.stepContent}>
                <div className={styles.stepContentHead}>
                  <span className={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</span>
                  <h4 className={styles.stepTitle}>{step.title}</h4>
                </div>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
