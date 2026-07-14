'use client';

import clsx from 'clsx';
import { Check, ChevronDown, Lock } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { type Provider, PROVIDERS } from '@/core/providers';

import { ProviderIcon } from '../provider-icon';

import styles from './provider-select.module.scss';

export interface ProviderOption {
  value: Provider;
  label: string;
  hint: string;
}

interface ProviderSelectProps {
  value: Provider;
  onChange: (value: Provider) => void;
  disabled?: boolean;
  showHint?: boolean;
  size?: 'sm' | 'md';
  hasKeys?: Partial<Record<Provider, boolean>>;
}

const OPTIONS: ProviderOption[] = (Object.keys(PROVIDERS) as Provider[]).map((key) => ({
  value: key,
  label: PROVIDERS[key].label,
  hint: PROVIDERS[key].hint,
}));

export function ProviderSelect({
  value,
  onChange,
  disabled = false,
  showHint = true,
  size = 'sm',
  hasKeys = {},
}: ProviderSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const availableOptions = OPTIONS.filter((option) => hasKeys[option.value]);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((prev) => !prev);
      return;
    }
    if (!open || availableOptions.length === 0) return;
    const idx = availableOptions.findIndex((option) => option.value === value);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(availableOptions[(idx + 1) % availableOptions.length].value);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(
        availableOptions[(idx - 1 + availableOptions.length) % availableOptions.length].value,
      );
    }
  }

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(styles.trigger, size === 'sm' ? styles.triggerSm : styles.triggerMd)}
      >
        <span className={styles.iconWrap}>
          <ProviderIcon provider={current.value} />
        </span>
        <span>{current.label}</span>
        <ChevronDown className={clsx(styles.chevron, open && styles.chevronOpen)} />
      </button>

      {open && (
        <div role="listbox" aria-label="Selecionar LLM" className={styles.dropdown}>
          {OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const noKey = Object.keys(hasKeys).length > 0 && !hasKeys[option.value];
            return (
              <button
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={noKey}
                type="button"
                onClick={() => {
                  if (!noKey) {
                    onChange(option.value);
                    setOpen(false);
                  }
                }}
                className={clsx(
                  styles.option,
                  isSelected && !noKey && styles.optionSelected,
                  noKey && styles.optionDisabled,
                )}
              >
                <span className={styles.optionIconWrap}>
                  <ProviderIcon provider={option.value} />
                </span>
                <span className={styles.optionBody}>
                  <span
                    className={clsx(
                      styles.optionLabel,
                      isSelected && !noKey && styles.optionLabelSelected,
                    )}
                  >
                    {option.label}
                  </span>
                  {showHint && (
                    <span className={styles.optionHint}>
                      {noKey ? 'sem chave configurada' : option.hint}
                    </span>
                  )}
                </span>
                {noKey ? (
                  <Lock className={styles.optionLock} />
                ) : (
                  isSelected && <Check className={styles.optionCheck} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
