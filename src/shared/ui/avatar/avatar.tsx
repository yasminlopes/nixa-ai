import clsx from 'clsx';
import { type ReactNode } from 'react';

import styles from './avatar.module.scss';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  variant: 'user' | 'assistant';
  src?: string;
  fallback?: ReactNode;
  className?: string;
  size?: AvatarSize;
}

export function Avatar({ variant, src, fallback, className, size = 'md' }: AvatarProps) {
  if (variant === 'assistant') {
    return (
      <div className={clsx(styles.avatar, styles.assistant, styles[size], className)}>
        <video
          src="/assets/nixa-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          className={styles.media}
        />
      </div>
    );
  }

  return (
    <div className={clsx(styles.avatar, styles.user, styles[size], className)}>
      {src ? <img src={src} alt="" className={styles.media} /> : fallback || 'Y'}
    </div>
  );
}
