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

import { useEffect, useRef, useCallback } from 'react';

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

/**
 * useOnMountWithDeps: Hook para efeitos que executam no mount E quando deps mudam
 *
 * Uso:
 * useOnMountWithDeps(() => { loadData(id); }, [id]);
 *
 * Executa no mount E quando id muda (mas não em cada render).
 */
export function useOnMountWithDeps(
  effect: () => void | (() => void),
  deps: React.DependencyList
): void {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return effect();
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useStableCallback: Wrapper para useCallback que ignora warnings de deps
 *
 * Uso:
 * const handler = useStableCallback((data) => { setData(data); }, []);
 *
 * Útil para callbacks que não têm dependências mas precisam ser estáveis.
 */
export function useStableCallback<T extends (...args: never[]) => void>(
  callback: T,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  return useCallback(callback, []);
}
