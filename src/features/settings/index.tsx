'use client';

import clsx from 'clsx';
import {
  AlertTriangle,
  BookOpen,
  Layers,
  type LucideIcon,
  Palette,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AboutTab } from './components/about-tab';
import { AppearanceTab } from './components/appearance-tab';
import { DangerTab } from './components/danger-tab';
import { IndexTab } from './components/index-tab';
import { ProfileTab } from './components/profile-tab';
import { SettingsTab } from './components/settings-tab';

import styles from './index.module.scss';

export type WorkspaceTab = 'profile' | 'appearance' | 'index' | 'settings' | 'about' | 'danger';

interface NavItem {
  id: WorkspaceTab;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Conta',
    items: [
      { id: 'profile', label: 'Perfil', icon: User },
      { id: 'appearance', label: 'Aparência', icon: Palette },
    ],
  },
  {
    label: 'Nixa AI',
    items: [
      { id: 'index', label: 'Conhecimento', icon: BookOpen },
      { id: 'settings', label: 'Modelos de IA', icon: Sparkles },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'about', label: 'Sobre a Nixa', icon: Layers },
      { id: 'danger', label: 'Zona de perigo', icon: AlertTriangle, danger: true },
    ],
  },
];

interface WorkspaceModalProps {
  initialTab: WorkspaceTab;
  onClose: () => void;
}

export function WorkspaceModal({ initialTab, onClose }: WorkspaceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [isIndexing, setIsIndexing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function handleRequestClose() {
    if (isIndexing) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (showCloseConfirm) {
        setShowCloseConfirm(false);
        return;
      }
      handleRequestClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!mounted) return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleRequestClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.grid}>
          <aside className={styles.nav}>
            <div className={styles.navHeader}>
              <span className={styles.navTitle}>Ajustes</span>
              <button onClick={handleRequestClose} className={styles.closeButton} title="Fechar">
                <X size={16} />
              </button>
            </div>

            <nav className={styles.tabList}>
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className={styles.navGroup}>
                  <p className={styles.navGroupLabel}>{group.label}</p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    const locked = isIndexing && item.id !== 'index';
                    return (
                      <button
                        key={item.id}
                        onClick={() => !locked && setTab(item.id)}
                        disabled={locked}
                        title={locked ? 'Indisponível durante a indexação' : undefined}
                        className={clsx(
                          styles.tabButton,
                          active && styles.tabButtonActive,
                          locked && styles.tabButtonLocked,
                          item.danger && styles.tabButtonDanger,
                        )}
                      >
                        {active && (
                          <span
                            className={clsx(
                              styles.tabIndicator,
                              item.danger && styles.tabIndicatorDanger,
                            )}
                          />
                        )}
                        <Icon className={styles.tabIcon} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <section className={styles.content}>
            {tab === 'profile' && <ProfileTab />}
            {tab === 'appearance' && <AppearanceTab />}
            {tab === 'index' && <IndexTab onRunningChange={setIsIndexing} onClose={onClose} />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'about' && <AboutTab />}
            {tab === 'danger' && <DangerTab />}
          </section>
        </div>
      </div>

      {showCloseConfirm && (
        <div
          className={styles.confirmOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCloseConfirm(false);
          }}
        >
          <div className={styles.confirmModal}>
            <div className={styles.confirmHeader}>
              <h3 className={styles.confirmTitle}>Interromper indexação?</h3>
            </div>
            <div className={styles.confirmBody}>
              A indexação está em andamento. Se fechar agora, o processo será interrompido.
            </div>
            <div className={styles.confirmActions}>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className={styles.confirmSecondary}
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                className={styles.confirmPrimary}
              >
                Fechar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
