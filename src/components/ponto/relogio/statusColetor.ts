import type { ColetorPonto } from '@/services/relogio/coletoresService';

/** Último contato há menos disso = "Online". */
export const ONLINE_MS = 30 * 60 * 1000;

export type StatusColetor = 'online' | 'atrasado' | 'nunca' | 'revogado';

export function statusColetor(
  c: Pick<ColetorPonto, 'ativo' | 'revogado_em' | 'ultimo_contato_em'>,
  agora = Date.now()
): StatusColetor {
  if (!c.ativo || c.revogado_em) return 'revogado';
  if (!c.ultimo_contato_em) return 'nunca';
  return agora - new Date(c.ultimo_contato_em).getTime() < ONLINE_MS ? 'online' : 'atrasado';
}
