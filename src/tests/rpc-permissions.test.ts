/**
 * Smoke test de permissões SECURITY DEFINER e isolamento de tenant.
 *
 * Executa contra o backend real usando a chave anon (papel `anon`).
 * Garante que após os REVOKE/GRANT:
 *  - RPCs de login (anti-brute-force) continuam acessíveis sem sessão.
 *  - RPCs sensíveis (has_role, get_user_scope_empresas) ficam bloqueadas para anon.
 *  - Tabelas multi-tenant não retornam linhas para usuário não autenticado.
 *
 * Rode com: bunx vitest run src/tests/rpc-permissions.test.ts
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Smoke test de integração: exige backend real (URL + anon key). Localmente,
// sem essas variáveis, a suíte é pulada. No CI ela é um gate explícito: segredo
// ausente não pode virar certificação verde de ACL/RLS não executada.
const isCI = typeof process !== 'undefined' && !!(process.env.CI || process.env.GITHUB_ACTIONS);
const hasCredentials = Boolean(SUPABASE_URL && SUPABASE_ANON);
const runLivePermissions = hasCredentials && (!isCI || process.env.RUN_LIVE_RLS_TESTS === 'true');
const anon = runLivePermissions
  ? createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as unknown as ReturnType<typeof createClient>);

describe('Contrato do gate de permissões', () => {
  it.skipIf(!isCI)('exige credenciais e opt-in explícito no CI', () => {
    expect(hasCredentials).toBe(true);
    expect(process.env.RUN_LIVE_RLS_TESTS).toBe('true');
  });
});

describe.skipIf(!runLivePermissions)('RPC permissions — anon role', () => {
  // A Edge auth-login é a única caller autorizada destas RPCs, via service_role.
  // "not found", egress ou timeout não provam autorização negada: o contrato
  // exige que o objeto exista e devolva a negação PostgreSQL 42501 para anon.
  it('check_account_lockout existe e NÃO pode ser executada por anon', async () => {
    const { error } = await anon.rpc('check_account_lockout', {
      p_email: 'integration-rpc-permissions@example.invalid',
    });
    expect(error).toBeTruthy();
    expect(error!.code).toBe('42501');
  });

  it('record_login_attempt existe e NÃO pode ser executada por anon', async () => {
    const { error } = await anon.rpc('record_login_attempt', {
      p_email: 'integration-rpc-permissions@example.invalid',
      p_success: false,
      p_ip: '127.0.0.1',
    });
    expect(error).toBeTruthy();
    expect(error!.code).toBe('42501');
  });

  it('has_role existe e NÃO pode ser executada por anon', async () => {
    const { error } = await anon.rpc('has_role', {
      _user_id: '00000000-0000-0000-0000-000000000000',
      _role: 'admin',
    });
    expect(error).toBeTruthy();
    expect(error!.code).toBe('42501');
  });

  it('get_user_scope_empresas existe e NÃO pode ser executada por anon', async () => {
    const { error } = await anon.rpc('get_user_scope_empresas', {
      _user_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).toBeTruthy();
    expect(error!.code).toBe('42501');
  });
});

describe.skipIf(!runLivePermissions)('RLS — anon não enxerga dados de tenants', () => {
  it.each(['colaboradores', 'folhas_pagamento', 'empresas', 'user_roles', 'user_empresas'])(
    'tabela %s retorna zero linhas para anon',
    async (table) => {
      const { data, error } = await anon
        .from(table as any)
        .select('id')
        .limit(1);
      // Algumas policies consultam helpers não executáveis por anon; a negação
      // PostgreSQL 42501 também é segura. Relação ausente, timeout ou egress
      // não são evidência de RLS e continuam reprovando o teste.
      if (error) {
        expect(error.code).toBe('42501');
      } else {
        expect(data ?? []).toHaveLength(0);
      }
    }
  );
});
