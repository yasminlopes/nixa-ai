import { useCallback, useState } from 'react';

interface UseCopyOptions {
  timeout?: number;
}

interface UseCopyReturn {
  copied: boolean;
  error: Error | null;
  copy: (text: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook reutilizável para copiar texto para área de transferência
 * @param options - Configurações (timeout em ms)
 * @returns { copied, error, copy, reset }
 */
export function useCopy(options?: UseCopyOptions): UseCopyReturn {
  const { timeout = 2000 } = options || {};
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        setError(null);
        await navigator.clipboard.writeText(text);
        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, timeout);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Falha ao copiar');
        setError(error);
        setCopied(false);
      }
    },
    [timeout],
  );

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  return { copied, error, copy, reset };
}
