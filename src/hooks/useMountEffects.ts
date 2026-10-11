/**
 * useOnMount: Hook para efeitos que devem executar apenas no mount
 *
 * P1-022: React Compiler readiness - elimina eslint-disable set-state-in-effect
 *
 * Uso:
 * // ANTES (viola exhaustive-deps)
 * useEffect(() => { setData(fetchData()); }, []);
 *
 * // DEPOIS (React Compiler safe)
 * useOnMount(() => { setData(fetchData()); });
 *
 * O hook garante que o efeito só executa no mount e nunca mais.
 */

import { useEffect, useRef } from 'react';

export function useOnMount(effect: () => void | (() => void)): void {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return effect();
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
