/**
 * Limpeza de sessão do navegador.
 *
 * Só remove o que pertence à AUTENTICAÇÃO (token/verifier do Supabase e o
 * fingerprint de sessão). Dados de trabalho no localStorage — rascunhos,
 * fila offline do ponto, registros demonstrativos, tema/idioma — NÃO são
 * apagados por logout, inatividade ou troca de usuário.
 */
export const IDLE_ACTIVITY_KEY = 'dp_last_activity_at';
export const SESSION_FP_KEY = 'dp_session_fp';

const AUTH_STORAGE_KEY = /^sb-.+-auth-token(?:-user|-code-verifier)?$/;

export function limparSessaoLocal(): void {
  try {
    for (const chave of Object.keys(localStorage)) {
      if (AUTH_STORAGE_KEY.test(chave) || chave === 'supabase.auth.token') {
        localStorage.removeItem(chave);
      }
    }
    localStorage.removeItem(IDLE_ACTIVITY_KEY);
  } catch {
    /* private browsing / storage indisponível */
  }

  try {
    sessionStorage.removeItem(SESSION_FP_KEY);
  } catch {
    /* private browsing / storage indisponível */
  }
}
