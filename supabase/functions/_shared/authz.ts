/**
 * Autorização compartilhada das Edge Functions.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * ---------------------------
 * As Edge Functions operam com SERVICE_ROLE_KEY, que **atravessa o RLS**.
 * Toda a separação de papéis construída no banco (RH gerencia, colaborador
 * lê o próprio dado) é invisível daqui: para o Postgres, uma Edge Function
 * é onipotente.
 *
 * O erro recorrente que este módulo elimina é confundir *tenant* com
 * *autorização*:
 *
 *     user_belongs_to_empresa(user, empresa)  // "trabalha aqui?"  -> SIM p/ estagiário
 *     pode_gerir_rh_para(user, empresa)       // "é RH/admin?"     -> NÃO p/ estagiário
 *
 * Checar apenas o primeiro deixa qualquer colaborador autenticado ler folha,
 * CPF, salário e conta bancária dos colegas. Pertencer à empresa é
 * pré-requisito de acesso, nunca permissão de acesso.
 *
 * As funções `*_para` recebem o user_id explicitamente porque `auth.uid()`
 * é NULO sob service_role. Por isso mesmo elas são revogadas de `anon` e
 * `authenticated` no banco: quem pode escolher o user_id do argumento pode
 * personificar qualquer pessoa. Só o backend as alcança.
 */

// deno-lint-ignore-file no-explicit-any
import { createErrorResponse } from './contract.ts';

/** Cliente Supabase com service_role (tipagem mínima necessária aqui). */
type AdminClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }> };

export interface AuthzResult {
  /** Pronto para `if (denied) return denied;` — nulo quando autorizado. */
  denied: Response | null;
  isAdmin: boolean;
  isRh: boolean;
}

/**
 * Falha fechada: qualquer erro de RPC nega o acesso.
 *
 * Um `error` retornado pelo Postgres (timeout, função ausente, deploy no meio
 * de uma migração) produz `data === null`, que em JS é falsy. Tratar isso como
 * "não autorizado" é a única leitura segura — o contrário transformaria uma
 * indisponibilidade momentânea do banco em liberação geral de acesso.
 */
async function rpcBool(admin: AdminClient, fn: string, args: Record<string, unknown>): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc(fn, args);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** É administrador global do sistema? */
export function isAdmin(admin: AdminClient, userId: string): Promise<boolean> {
  return rpcBool(admin, 'is_admin', { _user_id: userId });
}

/** É RH ou admin **nesta** empresa? (papel + vínculo, avaliados juntos) */
export function podeGerirRh(admin: AdminClient, userId: string, empresaId: string | null | undefined): Promise<boolean> {
  if (!empresaId) return Promise.resolve(false);
  return rpcBool(admin, 'pode_gerir_rh_para', { _user_id: userId, _empresa_id: empresaId });
}

/** É RH, admin ou gestor nesta empresa? Use para leitura gerencial agregada. */
export function podeGerirPessoas(admin: AdminClient, userId: string, empresaId: string | null | undefined): Promise<boolean> {
  if (!empresaId) return Promise.resolve(false);
  return rpcBool(admin, 'pode_gerir_pessoas_para', { _user_id: userId, _empresa_id: empresaId });
}

/** Apenas vínculo com a empresa. NÃO é autorização — veja o cabeçalho. */
export function pertenceAEmpresa(admin: AdminClient, userId: string, empresaId: string | null | undefined): Promise<boolean> {
  if (!empresaId) return Promise.resolve(false);
  return rpcBool(admin, 'user_belongs_to_empresa', { _user_id: userId, _empresa_id: empresaId });
}

/**
 * Exige RH/admin na empresa. Para operações de folha, exportação de PII,
 * remessas bancárias, rescisões e documentos de terceiros.
 */
export async function requireRh(
  admin: AdminClient,
  userId: string,
  empresaId: string | null | undefined,
): Promise<AuthzResult> {
  if (!empresaId) {
    return { denied: createErrorResponse('Empresa não identificada', 400, 'EMPRESA_REQUIRED'), isAdmin: false, isRh: false };
  }
  const rh = await podeGerirRh(admin, userId, empresaId);
  if (rh) return { denied: null, isAdmin: false, isRh: true };

  const adm = await isAdmin(admin, userId);
  if (adm) return { denied: null, isAdmin: true, isRh: true };

  // Mensagem deliberadamente uniforme: distinguir "empresa inexistente" de
  // "sem permissão" permitiria enumerar empresas e papéis por tentativa.
  return {
    denied: createErrorResponse('Ação restrita a RH ou administrador', 403, 'FORBIDDEN'),
    isAdmin: false,
    isRh: false,
  };
}

/**
 * Autoriza o próprio titular OU o RH da empresa.
 *
 * É o padrão do Portal do Colaborador: a pessoa vê o próprio holerite; o RH
 * vê o de todos; o colega não vê o de ninguém.
 */
export async function requireSelfOrRh(
  admin: AdminClient,
  userId: string,
  donoUserId: string | null | undefined,
  empresaId: string | null | undefined,
): Promise<AuthzResult> {
  if (donoUserId && donoUserId === userId) {
    return { denied: null, isAdmin: false, isRh: false };
  }
  return requireRh(admin, userId, empresaId);
}
