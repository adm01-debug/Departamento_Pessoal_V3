/**
 * Base de URL das Edge Functions.
 *
 * Em desenvolvimento as chamadas passam pelo proxy do dev server
 * (`server.proxy['/functions/v1']` em `vite.config.ts`), de modo que o
 * navegador as enxerga como same-origin e não aplica CORS.
 *
 * Motivo: o gateway do Supabase Cloud responde
 * `Access-Control-Allow-Origin: https://sistema-dp.lovable.app` para qualquer
 * origem `localhost` — o allowlist em `supabase/functions/_shared/contract.ts`
 * só libera localhost quando o secret `EXTRA_ALLOWED_LOCAL_PORTS` está setado
 * no projeto, o que não é o caso do projeto que o app consome. O resultado era
 * o preflight barrado pelo navegador e todo `fetch` para edge function
 * estourando antes de sair da máquina.
 *
 * Em produção nada muda: a origem já está no allowlist e a URL absoluta do
 * projeto continua sendo usada.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';

/** Caminho absoluto das functions no projeto Supabase (usado em produção). */
export const ABSOLUTE_FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

/**
 * Base a ser usada nas chamadas: relativa (via proxy) em dev, absoluta em prod.
 * `VITE_SUPABASE_FUNCTIONS_BASE` permite sobrescrever em dev (padrão do `.env`:
 * `/functions/v1`).
 */
export const FUNCTIONS_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_SUPABASE_FUNCTIONS_BASE || '/functions/v1')
  : ABSOLUTE_FUNCTIONS_BASE;

/** URL completa de uma edge function pelo nome. */
export function functionUrl(name: string): string {
  return `${FUNCTIONS_BASE}/${name}`;
}

/**
 * Reescreve uma URL absoluta de edge function para a base relativa em dev.
 * Usado no `fetch` global do cliente Supabase para cobrir, de uma só vez,
 * todos os `supabase.functions.invoke()` do projeto — que montam a URL
 * internamente a partir de `SUPABASE_URL`.
 *
 * Fora de dev (ou para qualquer outra URL) devolve a entrada inalterada.
 */
export function rewriteFunctionsUrl(input: string): string {
  if (!import.meta.env.DEV || !SUPABASE_URL) return input;
  if (!input.startsWith(ABSOLUTE_FUNCTIONS_BASE)) return input;
  return `${FUNCTIONS_BASE}${input.slice(ABSOLUTE_FUNCTIONS_BASE.length)}`;
}
