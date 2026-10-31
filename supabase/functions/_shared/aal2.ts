/**
 * Step-up AAL2 (Authenticator Assurance Level 2) — verificação server-side.
 *
 * O Supabase/GoTrue embute o claim `aal` no access token: `aal1` (login com
 * senha) ou `aal2` (sessão elevada por TOTP/fator adicional). Conferir no
 * navegador é bypassável; a checagem aqui é a autoritativa: uma sessão aal1
 * roubada não executa ação sensível.
 *
 * Uso:
 *   const aal = requireAal2(req);
 *   if (!aal.ok) return aal.response;
 */

import { createErrorResponse } from './contract.ts';

interface JwtClaims {
  aal?: string;
  sub?: string;
}

function decodeJwtPayload(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function userAal(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return decodeJwtPayload(auth.slice(7))?.aal ?? null;
}

export function requireAal2(req: Request): { ok: boolean; response: Response | null } {
  if (userAal(req) !== 'aal2') {
    return {
      ok: false,
      response: createErrorResponse(
        'Ação requer verificação adicional (MFA). Refaça o login com o segundo fator.',
        403,
        'AAL2_REQUIRED',
        undefined,
        req,
      ),
    };
  }
  return { ok: true, response: null };
}
