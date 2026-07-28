import { useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Estado local sincronizado com uma fonte externa (prop / dado remoto).
 *
 * Implementa o padrão oficial do React de "ajustar estado durante a renderização"
 * (https://react.dev/reference/react/useState#storing-information-from-previous-renders),
 * que substitui o antipadrão `useEffect(() => setState(prop), [prop])`.
 *
 * Vantagens sobre o efeito:
 * - Evita a renderização intermediária com o valor obsoleto (sem "flash" na UI).
 * - Evita renderizações em cascata (o React reinicia o render antes de commitar).
 * - Elimina o aviso `react-hooks/set-state-in-effect`.
 *
 * @param source Valor externo observado (prop, resultado de query, etc.).
 * @param derive Transforma a fonte no formato do estado local. Só é chamada quando
 *               a fonte (ou `enabled`) muda — nunca a cada render.
 * @param enabled Quando `false`, a sincronização é suspensa (ex.: formulário em edição).
 *                Ao voltar para `true`, o estado é ressincronizado com a fonte atual.
 */
export function useSyncedState<S, T>(
  source: S,
  derive: (source: S) => T,
  enabled: boolean = true
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => derive(source));
  const [lastSync, setLastSync] = useState<{ source: S; enabled: boolean }>({ source, enabled });

  // Ajuste durante o render: seguro e recomendado pelo React para estado derivado.
  if (enabled && (!Object.is(lastSync.source, source) || !lastSync.enabled)) {
    setLastSync({ source, enabled });
    setState(derive(source));
  } else if (!Object.is(lastSync.enabled, enabled) || !Object.is(lastSync.source, source)) {
    // Mantém o registro atualizado mesmo com a sincronização suspensa,
    // para que a retomada compare contra a fonte mais recente.
    setLastSync({ source, enabled });
  }

  return [state, setState];
}
