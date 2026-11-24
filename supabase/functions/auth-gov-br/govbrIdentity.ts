// Resolução de identidade gov.br -> usuário do sistema (auth-gov-br).
//
// O claim `sub` do gov.br é o CPF do titular. A tabela `profiles` NÃO tem
// coluna `cpf` (só govbr_uid / cpf_validado_govbr); o CPF do usuário vive em
// `colaboradores.cpf` (+ `cpf_hash` = sha256 dos 11 dígitos, mantido pelo
// trigger trg_colab_cpf_hash) ligado a auth.users por `colaboradores.user_id`.
//
// Ordem de busca no login:
//   1. profiles.govbr_uid = sub        (conta já vinculada antes)
//   2. colaboradores.cpf_hash / cpf     (colaborador com user_id)
// Mais de um usuário candidato = ambíguo -> recusa (nunca escolhe um).

export interface GovbrLookups {
  /** user_ids de profiles com govbr_uid = sub */
  profilesPorGovbrUid(sub: string): Promise<string[]>;
  /** user_ids (não nulos) de colaboradores com esse CPF */
  usuariosPorCpf(cpf: string, cpfHash: string): Promise<string[]>;
  /** cpf_hash dos colaboradores ligados ao user_id */
  cpfHashesDoUsuario(userId: string): Promise<string[]>;
}

export type Resolucao =
  | { ok: true; userId: string }
  | { ok: false; status: number; erro: string };

/** CPF (11 dígitos) a partir do `sub`; null se vazio/inválido. */
export function cpfDoSub(sub: unknown): string | null {
  if (typeof sub !== 'string') return null;
  const digits = sub.replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))];

/** Modo login (sem sessão): localiza a conta pelo sub/CPF verificado no gov.br. */
export async function resolverLogin(sub: string, cpf: string, db: GovbrLookups): Promise<Resolucao> {
  const porUid = unicos(await db.profilesPorGovbrUid(sub));
  if (porUid.length === 1) return { ok: true, userId: porUid[0] };
  if (porUid.length > 1) {
    return { ok: false, status: 409, erro: 'Conta gov.br vinculada a mais de um usuário. Procure o RH.' };
  }
  const porCpf = unicos(await db.usuariosPorCpf(cpf, await sha256Hex(cpf)));
  if (porCpf.length === 1) return { ok: true, userId: porCpf[0] };
  if (porCpf.length > 1) {
    return { ok: false, status: 409, erro: 'CPF associado a mais de um usuário. Procure o RH.' };
  }
  return {
    ok: false,
    status: 200,
    erro: 'Nenhuma conta vinculada a este CPF gov.br. Entre com e-mail e senha e vincule sua conta gov.br nas configurações.',
  };
}

/** Modo vinculação (com sessão): impede vincular um gov.br de outra pessoa ou já usado. */
export async function validarVinculo(
  userId: string,
  sub: string,
  cpf: string,
  db: GovbrLookups,
): Promise<Resolucao> {
  const outros = unicos(await db.profilesPorGovbrUid(sub)).filter((id) => id !== userId);
  if (outros.length > 0) {
    return { ok: false, status: 409, erro: 'Esta conta gov.br já está vinculada a outro usuário.' };
  }
  const hashes = unicos(await db.cpfHashesDoUsuario(userId));
  if (hashes.length > 0 && !hashes.includes(await sha256Hex(cpf))) {
    return { ok: false, status: 403, erro: 'O CPF do gov.br não confere com o CPF do seu cadastro.' };
  }
  return { ok: true, userId };
}
