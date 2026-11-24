import { test, expect, request } from '@playwright/test';

/**
 * Valida respostas HTTP 401/403 nas APIs protegidas do backend
 * (PostgREST + RPCs) em três cenários:
 *
 *  1. Requisição SEM apikey → 401 Unauthorized
 *  2. Requisição com JWT inválido/expirado → 401
 *  3. Usuário anônimo (apikey válido, sem sessão) em tabela com RLS
 *     restritiva → 200 com body vazio (RLS filtra em vez de 403 —
 *     comportamento nativo do PostgREST). Documentamos e validamos.
 *
 * Objetivo: garantir que credenciais inválidas nunca vazam dados e que
 * a camada de rede rejeita tokens expirados antes de chegar ao SQL.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://ciziytrrjjotlsjzshnm.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

test.describe('API — respostas 401/403 em endpoints protegidos', () => {
  test('REST sem apikey retorna 401', async () => {
    const api = await request.newContext();
    const res = await api.get(`${SUPABASE_URL}/rest/v1/empresas?select=id`);
    expect([401, 403]).toContain(res.status());
  });

  test('REST com JWT inválido retorna 401', async () => {
    test.skip(!ANON_KEY, 'VITE_SUPABASE_ANON_KEY não configurada');
    const api = await request.newContext();
    const res = await api.get(`${SUPABASE_URL}/rest/v1/empresas?select=id`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: 'Bearer invalid.jwt.token',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json().catch(() => ({}));
    expect(JSON.stringify(body)).toMatch(/JWT|invalid|malformed/i);
  });

  test('RPC sem apikey retorna 401', async () => {
    const api = await request.newContext();
    const res = await api.post(`${SUPABASE_URL}/rest/v1/rpc/get_user_roles`, {
      data: { _user_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('RPC com JWT expirado é rejeitada antes do SQL', async () => {
    test.skip(!ANON_KEY, 'VITE_SUPABASE_ANON_KEY não configurada');
    // JWT sintaticamente válido mas expirado (exp = 2020)
    const expiredJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTU3NzgzNjgwMH0.aaaa';
    const api = await request.newContext();
    const res = await api.post(`${SUPABASE_URL}/rest/v1/rpc/get_user_roles`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${expiredJwt}`,
        'Content-Type': 'application/json',
      },
      data: { _user_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(401);
  });

  test('REST anônimo em tabela com RLS restritiva filtra dados (não vaza)', async () => {
    test.skip(!ANON_KEY, 'VITE_SUPABASE_ANON_KEY não configurada');
    const api = await request.newContext();
    const res = await api.get(`${SUPABASE_URL}/rest/v1/empresas?select=id&limit=1`, {
      headers: { apikey: ANON_KEY },
    });
    // PostgREST + RLS retorna 200 [] em vez de 403; garantimos zero vazamento
    if (res.status() === 200) {
      const rows = await res.json();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(0);
    } else {
      expect([401, 403]).toContain(res.status());
    }
  });
});
