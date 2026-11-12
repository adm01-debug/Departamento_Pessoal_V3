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

/**
 * Valor fora das opções do Select vira `undefined`: `tipo_acidente` não tem CHECK
 * no banco e há linha legada ('queda_de_nivel'); assim o Select pede nova escolha
 * e o erro de validação aparece, em vez de o "Salvar" falhar calado.
 */
export function opcaoValida<T extends string>(v: unknown, opcoes: readonly T[]): T | undefined {
  return typeof v === 'string' && (opcoes as readonly string[]).includes(v) ? (v as T) : undefined;
}

/** Campo opcional limpo ('') vira `null`: colunas date/time rejeitam '' no INSERT/UPDATE. */
export function vazioParaNull<T extends object, K extends keyof T>(
  values: T,
  campos: readonly K[]
): Omit<T, K> & { [P in K]: T[P] | null } {
  const out = { ...values } as Record<PropertyKey, unknown>;
  for (const c of campos) if (out[c] === '') out[c] = null;
  return out as Omit<T, K> & { [P in K]: T[P] | null };
}

/**
 * Prazo legal de envio da CAT, mesma regra de `calcular_prazo_cat`
 * (migration 20260717204215): 24h se óbito, 1 dia caso contrário. O trigger só
 * roda no INSERT, então a correção recalcula ao mudar data ou óbito.
 */
export function prazoLimiteCat(dataAcidenteIso: string, houveObito: boolean): string {
  const d = new Date(dataAcidenteIso);
  if (houveObito) d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
  else d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
