'use client';

import clsx from 'clsx';
import { Check, type LucideIcon, Monitor, Moon, Sun } from 'lucide-react';

import { type ThemeMode, useTheme } from '@/shared/contexts/theme-context';

import { SectionHeader } from '../section-header';

import styles from './appearance-tab.module.scss';

const OPTIONS: Array<{ id: ThemeMode; label: string; desc: string; icon: LucideIcon }> = [
  { id: 'light', label: 'Claro', desc: 'Sempre usar o modo claro.', icon: Sun },
  { id: 'dark', label: 'Escuro', desc: 'Ideal para ambientes com pouca luz.', icon: Moon },
  { id: 'system', label: 'Sistema', desc: 'Segue a preferência do dispositivo.', icon: Monitor },
];

export function AppearanceTab() {
  const { mode, theme, setMode } = useTheme();

  return (
    <div>
      <SectionHeader
        eyebrow="Conta"
        title="Aparência."
        subtitle="Escolha como o Nixa deve aparecer para você."
      />

      <div className={styles.options}>
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = mode === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setMode(option.id)}
              className={clsx(styles.option, active && styles.optionActive)}
              aria-pressed={active}
            >
              <span className={styles.optionIcon}>
                <Icon size={18} />
              </span>
              <span className={styles.optionBody}>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionDesc}>{option.desc}</span>
              </span>
              {active && <Check size={16} className={styles.optionCheck} />}
            </button>
          );
        })}
      </div>

      {/* Prévia — reflete o tema resolvido em tempo real */}
      <div className={styles.previewWrap}>
        <p className={styles.previewLabel}>Prévia</p>
        <div className={styles.preview}>
          <div className={styles.previewSidebar}>
            <span className={styles.previewLogo} />
            <span className={styles.previewLine} style={{ width: '70%' }} />
            <span className={styles.previewLine} style={{ width: '55%' }} />
          </div>
          <div className={styles.previewMain}>
            <span className={styles.previewTitle} />
            <div className={styles.previewBubble} />
            <div className={clsx(styles.previewBubble, styles.previewBubbleUser)} />
          </div>
        </div>
        <p className={styles.previewHint}>
          Tema atual: <strong>{theme === 'dark' ? 'escuro' : 'claro'}</strong>
          {mode === 'system' && ' (seguindo o sistema)'}
        </p>
      </div>
    </div>
  );
}
