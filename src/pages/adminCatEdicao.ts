import { formatDateLocalISO } from '@/utils/dateLocal';

type CatEnvio = {
  status_esocial: string | null;
  protocolo_esocial: string | null;
  data_envio_esocial: string | null;
};

/**
 * Correção da CAT (S-2210) só antes da transmissão: status 'pendente' e sem
 * protocolo/data de envio. Espelha `impedir_alteracao_cat_transmitida`
 * (migration 20260712212841), que bloqueia a alteração no banco depois disso.
 */
export function podeEditarCat(c: CatEnvio): boolean {
  return c.status_esocial === 'pendente' && !c.protocolo_esocial && !c.data_envio_esocial;
}

/** timestamptz → valor de `<input type="datetime-local">` no fuso do usuário. */
export function isoParaDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dia = formatDateLocalISO(d);
  if (!dia) return '';
  return `${dia}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Linha do banco → valores do formulário: `null` vira `undefined` (campos opcionais do zod). */
export function catParaForm<T extends { data_acidente: string | null }>(
  row: T
): { [K in keyof T]: Exclude<T[K], null> | undefined } {
  const out = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? undefined])) as {
    [K in keyof T]: Exclude<T[K], null> | undefined;
  };
  return { ...out, data_acidente: isoParaDatetimeLocal(row.data_acidente) };
}
