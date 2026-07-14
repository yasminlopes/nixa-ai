'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { clearApiKeys } from '@/shared/utils/api-key-storage';

import { SectionHeader } from '../section-header';

import styles from './danger-tab.module.scss';

export function DangerTab() {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResetAll() {
    const confirmed = window.confirm(
      'Tem certeza? Isso vai limpar conversas, onboarding, cache local, indexação e chaves salvas.',
    );
    if (!confirmed) return;
    setResetting(true);
    setError(null);
    try {
      clearApiKeys();
      localStorage.clear();
      sessionStorage.clear();
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao resetar tudo');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Sistema"
        title="Zona de perigo."
        subtitle="Ações irreversíveis. Tenha certeza antes de prosseguir."
      />

      <div className={styles.card}>
        <p className={styles.title}>
          <AlertTriangle size={16} className={styles.icon} />
          Resetar todos os dados
        </p>
        <p className={styles.text}>
          Remove conversas, onboarding, cache local, indexação e chaves salvas. Essa ação não pode
          ser desfeita.
        </p>
        <button onClick={handleResetAll} disabled={resetting} className={styles.button}>
          {resetting ? 'resetando…' : 'Resetar todos os dados'}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
