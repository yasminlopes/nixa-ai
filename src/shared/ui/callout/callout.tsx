import clsx from 'clsx';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import styles from './callout.module.scss';

export type CalloutTone = 'neutral' | 'accent' | 'danger';

export interface CalloutProps {
  icon?: LucideIcon;
  tone?: CalloutTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Callout({
  icon: Icon,
  tone = 'neutral',
  title,
  children,
  className,
}: CalloutProps) {
  return (
    <div className={clsx(styles.callout, styles[tone], className)}>
      {Icon && (
        <span className={styles.iconWrap}>
          <Icon size={16} className={styles.icon} aria-hidden="true" />
        </span>
      )}
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children}
      </div>
    </div>
  );
}
