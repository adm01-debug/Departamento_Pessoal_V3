import { useState, useEffect } from 'react';

/**
 * Retorna um timestamp (ms) estável durante o render, atualizado periodicamente.
 * Evita chamar `Date.now()` diretamente no corpo do componente (impuro), o que
 * gera renders instáveis. Use para cálculos de SLA/prazos exibidos na tela.
 *
 * @param intervalMs Intervalo de atualização (padrão: 60s).
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
