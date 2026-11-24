/**
 * MOCK VISUAL (layout) — gate do modo demonstração. Arquivo mínimo e sem
 * dependências de propósito: pode ser importado de qualquer lugar (ex.:
 * `useEmpresas`) sem arrastar o emulador nem o dataset para o bundle principal.
 * Ver `index.ts` para a descrição completa.
 */
export function isLayoutMockEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test' && import.meta.env.VITE_LAYOUT_MOCK === 'true';
}
