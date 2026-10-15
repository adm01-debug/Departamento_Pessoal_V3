import { test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * W60 — apaga o que `scripts/e2e/seed.mjs` criou, escopado por `empresa_id`
 * da empresa sintética (ver SEED_EMPRESA_CNPJ em scripts/e2e/seed.mjs).
 *
 * Roda no projeto `cleanup`, ANTES de `logout.spec.ts` (ver `dependencies`
 * em playwright.config.ts — este arquivo precisa ficar no mesmo projeto e
 * ser ordenado antes do logout, porque o logout revoga o refresh token
 * compartilhado no storageState).
 *
 * Design de segurança:
 *   - NUNCA deleta por padrão: só age se encontrar a empresa sintética pelo
 *     CNPJ reservado (SEED_EMPRESA_CNPJ) — nunca por heurística de nome, nunca
 *     "a primeira empresa", nunca a empresa real de produção.
 *   - Usa RPC quando existe (nenhuma RPC de delete em lote de colaborador/
 *     folha foi encontrada na investigação de W59/W60 — ver scripts/e2e/
 *     seed.mjs item 1); do contrário, deleta com o client anon autenticado
 *     como o próprio usuário admin E2E (RLS real), nunca service_role.
 *   - Todas as queries de delete têm `.eq('empresa_id', seedEmpresaId)`
 *     explícito — nunca um delete sem filtro de empresa.
 *   - Se a empresa sintética não existir (seed nunca rodou, ou já foi
 *     limpa), o teste passa sem fazer nada — não é um erro.
 *
 * Pré-requisito para isto rodar de verdade em CI: a decisão W58 (onde o E2E
 * autenticado escreve) e a execução autorizada de scripts/e2e/seed.mjs. Até
 * lá, este spec roda, não encontra a empresa sintética (porque ela não
 * existe em produção ainda) e termina como no-op — não é destrutivo.
 */

const SEED_EMPRESA_CNPJ = '00000000000191';

test.describe('Cleanup do seed E2E (W60 — executa antes do logout)', () => {
  test('remove colaboradores/folha da empresa sintética, se existirem', async () => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!url || !anonKey || !email || !password) {
      // Sem credenciais de app (ex: rodando só o projeto `public`): não há o
      // que limpar neste contexto — no-op seguro, não falha o teste.
      return;
    }

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) {
      // Login já é coberto por outros specs; aqui só não bloqueia o cleanup.
      return;
    }

    const { data: empresa, error: empresaErr } = await client
      .from('empresas')
      .select('id')
      .eq('cnpj', SEED_EMPRESA_CNPJ)
      .maybeSingle();
    if (empresaErr || !empresa) {
      // Empresa sintética não existe (seed nunca rodou aqui) — nada a fazer.
      return;
    }

    const seedEmpresaId = empresa.id;

    // Ordem: itens dependentes antes dos pais, sempre filtrado por empresa_id.
    await client.from('folhas_pagamento').delete().eq('empresa_id', seedEmpresaId);
    await client.from('colaboradores').delete().eq('empresa_id', seedEmpresaId);

    await client.auth.signOut({ scope: 'local' });
  });
});
