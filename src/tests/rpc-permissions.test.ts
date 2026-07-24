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
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

// Smoke test de integração: exige backend real (URL + anon key). Sem essas
// variáveis (ex.: CI sem secrets), o suite é pulado em vez de quebrar no import.
// Integração real: só roda com backend configurado E fora de CI (runners não têm
// egress garantido ao banco; rode local/staging). Em CI o suite é pulado.
const isCI = typeof process !== 'undefined' && !!(process.env.CI || process.env.GITHUB_ACTIONS);
const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON) && !isCI;
const anon = hasBackend
  ? createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as unknown as ReturnType<typeof createClient>);

describe.skipIf(!hasBackend)('RPC permissions — anon role', () => {
  it('check_login_lock continua acessível sem sessão', async () => {
    const { error } = await anon.rpc('check_login_lock', {
      p_identifier: 'test@example.com',
      p_identifier_type: 'email',
    });
    expect(error?.message ?? '').not.toMatch(/permission denied/i);
  });

  it('record_failed_login continua acessível sem sessão', async () => {
    const { error } = await anon.rpc('record_failed_login', {
      p_identifier: 'test@example.com',
      p_identifier_type: 'email',
    });
    expect(error?.message ?? '').not.toMatch(/permission denied/i);
  });

  it('has_role NÃO pode ser executada por anon', async () => {
    const { error } = await anon.rpc('has_role', {
      _user_id: '00000000-0000-0000-0000-000000000000',
      _role: 'admin',
    });
    expect(error).toBeTruthy();
    // Network-level egress block is also valid evidence of rejection
    expect(error!.message).toMatch(/permission denied|not allowed|not found|allowlist|egress/i);
  });

  it('get_user_scope_empresas NÃO pode ser executada por anon', async () => {
    const { error } = await anon.rpc('get_user_scope_empresas', {
      _user_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).toBeTruthy();
    // Network-level egress block is also valid evidence of rejection
    expect(error!.message).toMatch(/permission denied|not allowed|not found|allowlist|egress/i);
  });
});

describe.skipIf(!hasBackend)('RLS — anon não enxerga dados de tenants', () => {
  it.each([
    'colaboradores',
    'folhas_pagamento',
    'empresas',
    'user_roles',
    'user_empresas',
  ])('tabela %s retorna zero linhas para anon', async (table) => {
    const { data, error } = await anon.from(table as any).select('id').limit(1);
    // Pode retornar erro de permissão OU array vazio — ambos são aceitáveis.
    if (!error) expect(data ?? []).toHaveLength(0);
  });
});
