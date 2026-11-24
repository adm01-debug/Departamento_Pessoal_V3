// Regras do link de pré-admissão montado NO SERVIDOR (enviar-email-admissao).
// O cliente não manda mais link nem destinatário livre: manda o id do token
// recém-criado; a edge confere token x admissão x e-mail e monta a URL a
// partir de uma origem da allowlist de CORS (nunca de input do cliente).

export interface TokenRow {
  admissao_id: string;
  token: string;
  data_expiracao: string;
  email_candidato: string | null;
}

export const normalizarEmail = (e: string | null | undefined) => (e ?? '').trim().toLowerCase();

/** Motivo da recusa, ou null se o token serve para esta admissão/e-mail. */
export function validarToken(
  tok: TokenRow | null,
  admissaoId: string,
  emailAdmissao: string,
  agora: Date = new Date(),
): string | null {
  if (!tok || tok.admissao_id !== admissaoId) return 'token_invalido';
  if (!(new Date(tok.data_expiracao) > agora)) return 'token_expirado';
  if (tok.email_candidato && normalizarEmail(tok.email_candidato) !== normalizarEmail(emailAdmissao)) {
    return 'email_divergente';
  }
  return null;
}

/** `origem` deve vir da allowlist (getCorsHeaders(req)['Access-Control-Allow-Origin']). */
export function montarLinkAdmissao(origem: string, token: string): string {
  const base = new URL(origem);
  const url = new URL('/contratacao', base.origin);
  url.searchParams.set('token', token);
  return url.toString();
}
