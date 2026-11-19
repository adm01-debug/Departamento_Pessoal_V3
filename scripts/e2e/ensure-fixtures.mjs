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
    email: process.env.E2E_USER_EMAIL,
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
      .select('id, email')
      // Só a empresa sintética: sem este filtro, o mesmo CPF em OUTRA empresa
      // visível ao admin era tratado como fixture (insert pulado) e tinha o
      // e-mail sobrescrito logo abaixo.
      .eq('empresa_id', empresaId)
      .eq('cpf', colaborador.cpf)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      // Colaborador pre-existente sem o email do admin E2E (ex.: criado antes
      // deste fix) — o select por email em /ponto retornaria 0 linhas.
      if (colaborador.email && existing.email !== colaborador.email) {
        const { error: updErr } = await client
          .from('colaboradores')
          .update({ email: colaborador.email })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      }
      continue;
    }
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

  // /ponto faz maybeSingle em configuracoes_ponto por empresa_id — sem a linha,
  // o fetch colapsa para single e vira 400. Os defaults preenchem o resto.
  const { data: cfg, error: cfgSelErr } = await client
    .from('configuracoes_ponto')
    .select('id')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (cfgSelErr) throw cfgSelErr;
  if (!cfg) {
    const { error: cfgInsErr } = await client
      .from('configuracoes_ponto')
      .insert({ empresa_id: empresaId });
    if (cfgInsErr) throw cfgInsErr;
  }

  // Recrutamento - o E2E do Pipeline (recrutamento-pipeline*.spec.ts) abre a
  // aba Pipeline na vaga de maior id e precisa de, no minimo, 1 vaga + cards em
  // triagem/entrevista. Idempotente igual aos blocos acima: nada e recriado se
  // ja existir para a empresa.
  const candidatosSeed = [
    { nome: 'Mariana Alves Rodrigues', cpf: '00000000353' },
    { nome: 'Bruno Carvalho Mendes', cpf: '00000000434' },
    { nome: 'Diego Nascimento Lima', cpf: '00000000515' },
  ];
  const candidatosIds = [];
  for (const cand of candidatosSeed) {
    const { data: existente, error: selCandErr } = await client
      .from('candidatos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('cpf', cand.cpf)
      .maybeSingle();
    if (selCandErr) throw selCandErr;
    if (existente) {
      candidatosIds.push(existente.id);
      continue;
    }
    const { data: criado, error: insCandErr } = await client
      .from('candidatos')
      .insert({ empresa_id: empresaId, nome: cand.nome, cpf: cand.cpf, origem: 'site' })
      .select('id')
      .single();
    if (insCandErr) throw insCandErr;
    candidatosIds.push(criado.id);
  }

  const { data: vaga, error: vagaSelErr } = await client
    .from('vagas')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('titulo', 'Desenvolvedor(a) Full Stack Senior')
    .maybeSingle();
  if (vagaSelErr) throw vagaSelErr;
  let vagaId = vaga?.id;
  if (!vagaId) {
    const { data: criada, error: vagaInsErr } = await client
      .from('vagas')
      .insert({
        empresa_id: empresaId,
        titulo: 'Desenvolvedor(a) Full Stack Senior',
        departamento: 'Tecnologia',
        requisitos: 'React, TypeScript, Node.js, AWS',
        status: 'aberta',
      })
      .select('id')
      .single();
    if (vagaInsErr) throw vagaInsErr;
    vagaId = criada.id;
  }

  const etapasCandidaturas = ['triagem', 'triagem', 'entrevista'];
  for (let k = 0; k < candidatosIds.length; k += 1) {
    const { data: candidatura } = await client
      .from('candidaturas')
      .select('id')
      .eq('vaga_id', vagaId)
      .eq('candidato_id', candidatosIds[k])
      .maybeSingle();
    if (!candidatura) {
      const { error: candInsErr } = await client
        .from('candidaturas')
        .insert({
          vaga_id: vagaId,
          candidato_id: candidatosIds[k],
          etapa: etapasCandidaturas[k],
          status: 'em_andamento',
        });
      if (candInsErr) throw candInsErr;
    }
  }

  await client.auth.signOut({ scope: 'local' });
  console.log(`✅ Fixtures do E2E autenticado garantidos para a empresa ${empresaId}.`);
}

main().catch((err) => {
  console.error('❌ Falha ao garantir fixtures do E2E:', err);
  process.exit(1);
});
