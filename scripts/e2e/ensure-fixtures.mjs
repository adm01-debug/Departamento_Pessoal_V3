#!/usr/bin/env node
/**
 * Codex review (P2, PR #238): o projeto `cleanup` do Playwright
 * (e2e/cleanup/seed-cleanup.spec.ts, W60) roda em TODO E2E autenticado
 * completo e apaga colaboradores/folha da empresa sintética criada por
 * scripts/e2e/seed.mjs (W59) — sem um passo que os recrie antes da suíte
 * seguinte, o primeiro run consome o fixture e os runs seguintes testam
 * contra uma empresa vazia (0 colaboradores, nenhuma folha).
 *
 * Diferente de seed.mjs, este script NÃO precisa de
 * SUPABASE_SERVICE_ROLE_KEY: o vínculo usuário↔empresa (user_roles,
 * user_empresas) já foi criado uma vez (W58/W59) e é permanente — só
 * colaboradores/folhas_pagamento são recriados aqui, a cada run, usando
 * só a sessão autenticada do próprio admin E2E (RLS real, igual
 * seed.mjs). Roda com as mesmas secrets que o job `playwright` (e2e.yml)
 * já tem disponíveis hoje — nenhuma secret nova precisa ser provisionada.
 *
 * Se a empresa sintética (pelo CNPJ reservado) ainda não existir, este
 * script falha com uma mensagem clara em vez de criar uma empresa nova
 * silenciosamente — essa parte (W58, decisão do dono) é escopo de
 * seed.mjs, não deste script de manutenção.
 *
 * Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... E2E_USER_EMAIL=... \
 *      E2E_USER_PASSWORD=... node scripts/e2e/ensure-fixtures.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SEED_EMPRESA_CNPJ = '00000000000191';

const required = ['SUPABASE_URL', 'E2E_USER_EMAIL', 'E2E_USER_PASSWORD'];
const missing = required.filter((k) => !process.env[k]);
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!anonKey) missing.push('SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY)');
if (missing.length) {
  console.error(`❌ Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const SEED_COLABORADORES = [
  {
    cpf: '00000000191',
    nome_completo: '[E2E-SEED] Colaborador Um',
    data_nascimento: '1990-01-01',
    sexo: 'masculino',
    nome_mae: '[E2E-SEED] Mae Um',
    data_admissao: '2026-01-02',
    cargo: 'Analista de Teste E2E',
    departamento: 'Qualidade',
    salario_base: 3000,
    status: 'ativo',
  },
  {
    cpf: '00000000272',
    nome_completo: '[E2E-SEED] Colaborador Dois',
    data_nascimento: '1992-02-02',
    sexo: 'feminino',
    nome_mae: '[E2E-SEED] Mae Dois',
    data_admissao: '2026-01-02',
    cargo: 'Analista de Teste E2E',
    departamento: 'Qualidade',
    salario_base: 3200,
    status: 'ativo',
  },
];

async function main() {
  const client = createClient(process.env.SUPABASE_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: process.env.E2E_USER_EMAIL,
    password: process.env.E2E_USER_PASSWORD,
  });
  if (signInErr) throw signInErr;

  const { data: empresa, error: empresaErr } = await client
    .from('empresas')
    .select('id')
    .eq('cnpj', SEED_EMPRESA_CNPJ)
    .maybeSingle();
  if (empresaErr) throw empresaErr;
  if (!empresa) {
    console.error(
      `❌ Empresa sintética (CNPJ ${SEED_EMPRESA_CNPJ}) não existe. ` +
        'Rode scripts/e2e/seed.mjs primeiro (precisa de SUPABASE_SERVICE_ROLE_KEY).',
    );
    process.exit(1);
  }
  const empresaId = empresa.id;

  for (const colaborador of SEED_COLABORADORES) {
    const { data: existing, error: selErr } = await client
      .from('colaboradores')
      .select('id')
      .eq('cpf', colaborador.cpf)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing) continue;
    const { error: insErr } = await client
      .from('colaboradores')
      .insert({ ...colaborador, empresa_id: empresaId });
    if (insErr) throw insErr;
  }

  const competencia = new Date().toISOString().slice(0, 7);
  const { data: folha, error: folhaSelErr } = await client
    .from('folhas_pagamento')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('competencia', competencia)
    .maybeSingle();
  if (folhaSelErr) throw folhaSelErr;
  if (!folha) {
    const { error: folhaInsErr } = await client
      .from('folhas_pagamento')
      .insert({ empresa_id: empresaId, competencia, tipo: 'mensal', status: 'aberta' });
    if (folhaInsErr) throw folhaInsErr;
  }

  await client.auth.signOut({ scope: 'local' });
  console.log(`✅ Fixtures do E2E autenticado garantidos para a empresa ${empresaId}.`);
}

main().catch((err) => {
  console.error('❌ Falha ao garantir fixtures do E2E:', err);
  process.exit(1);
});
