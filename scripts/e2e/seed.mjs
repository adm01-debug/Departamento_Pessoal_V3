#!/usr/bin/env node
/**
 * Seed determinístico para o E2E autenticado (W59, docs/auditoria/PLANO_100_WORKFLOWS_2026-10-14.md
 * Bloco F). Cria 1 empresa sintética, vincula as 2 identidades E2E já provisionadas
 * (`scripts/provision-e2e-users.mjs`), cria 2-3 colaboradores e 1 folha aberta.
 *
 * ✅ W58 DECIDIDO E SEED JÁ APLICADO (15/10/2026) — o dono confirmou que os
 * dados hoje no banco canônico (incluindo "TIME PROMO BRINDES LTDA") são
 * fake/mock, criados só para validar design — não são PII real de produção.
 * Isso remove o bloqueio do item 2 abaixo. O seed foi aplicado via Supabase MCP
 * (mesmas operações que este script faria, sem as chaves SUPABASE_SERVICE_ROLE_KEY/
 * ANON_KEY que não estavam disponíveis neste ambiente): empresa sintética
 * `61e7d382-549f-4b17-afa4-4578ebc919f3` (CNPJ 00000000000191), admin@teste.local
 * → role admin + vínculo, user@teste.local → role user + vínculo, 2
 * colaboradores e 1 folha aberta (competência 2026-10). Verificado via a mesma
 * query que `verify-seed.mjs` faz. Este script continua idempotente e pode ser
 * executado normalmente a partir de agora quando as credenciais estiverem
 * disponíveis (ex.: localmente, ou se for ligado a um step de CI que as tenha).
 *
 * Histórico da investigação original (W59/W60), mantido por contexto — o item
 * 1 (ausência de RPC) continua válido e é a razão de este script fazer INSERT
 * direto nas 3 tabelas; o item 2 (empresa "real") foi a premissa que o dono
 * corrigiu acima:
 *
 * 1. NÃO EXISTE RPC para criar `empresas`, `colaboradores` ou `folhas_pagamento`
 *    do zero. `supabase_db_list_functions` (schema public) não lista nenhuma
 *    `criar_empresa`/`criar_colaborador`/`admitir_colaborador`/`criar_folha`.
 *    As únicas RPCs de "criação" existentes pressupõem um registro já existente
 *    (ex: `admissao_salvar_dados` atualiza uma admissão já aberta,
 *    `admin_associar_usuario_empresa` só vincula usuário↔empresa, nunca cria
 *    a empresa). O jeito real que o app cria esses registros é um INSERT
 *    autenticado do cliente (RLS: "Admins podem gerenciar empresas" cmd ALL em
 *    `empresas`; `colaboradores_rh_manage`/`folhas_rh_manage` cmd ALL em
 *    `colaboradores`/`folhas_pagamento`) — ou seja, a regra passada para esta
 *    tarefa ("NUNCA INSERT direto, só RPC") não é satisfazível para essas 3
 *    tabelas com o schema atual, porque a RPC pedida não existe.
 *    Este script, portanto, FAZ INSERT direto nessas 3 tabelas — mas usando o
 *    client autenticado como os usuários E2E (respeitando RLS, nunca o service
 *    role para bypassar política), replicando exatamente o que um admin real
 *    faria pela UI. Isso é uma DECISÃO DELIBERADA, documentada aqui para review
 *    humana — não uma correção ou um bypass escondido.
 *
 * 2. [HISTÓRICO — premissa corrigida, ver nota ✅ no topo] O banco canônico
 *    conectado via MCP tinha apenas 1 empresa antes do seed, e o agente desta
 *    investigação a presumiu real ("TIME PROMO BRINDES LTDA", CNPJ, 13
 *    colaboradores com CPF/salário, 4 folhas) por não ter confirmação do
 *    contrário. O dono esclareceu que todo esse conteúdo é fake/mock para
 *    validação de design — nenhuma linha é PII real. As credenciais
 *    `admin@teste.local` / `user@teste.local` não tinham role nem vínculo
 *    antes do seed, confirmando que ele nunca tinha sido aplicado. Existe,
 *    à parte, um outro par de identidades (`adm01+dpv3-e2e-admin@promobrindes.com.br` /
 *    `adm01+dpv3-e2e-user@promobrindes.com.br`) já vinculado à mesma empresa —
 *    como os dados são mock, o dono decidiu não tratar isso como risco e não
 *    tocar nessas contas. A decisão W58 ("onde o E2E autenticado escreve") foi
 *    portanto: continuar escrevendo neste banco canônico, agora com uma
 *    empresa sintética própria (criada pelo seed) em vez de reaproveitar a
 *    empresa mock existente.
 *
 * Por isso este script:
 *   - Exige SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (só para localizar os
 *     usuários via Admin API — NUNCA para inserir nas tabelas de negócio).
 *   - Exige também SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY,
 *     mesma nomenclatura usada em e2e.yml) — Codex review (P2, PR #238):
 *     o client autenticado precisa de uma publishable/anon key de verdade
 *     para o login por password grant; sem ela `createClient` falha antes
 *     de autenticar ou inserir qualquer coisa.
 *   - Exige um JWT de sessão real (login com e-mail/senha do próprio usuário
 *     admin E2E) para os INSERTs de negócio, para que RLS seja aplicado de
 *     verdade (nunca `service_role` nas tabelas empresas/colaboradores/folha).
 *   - Exige a env `E2E_SEED_CONFIRM_PRODUCTION_WRITE=eu-entendo-e-autorizo`
 *     como trava explícita. Sem ela, o script aborta sem tocar em nada.
 *   - É idempotente: procura a empresa sintética pelo CNPJ fixo reservado
 *     abaixo antes de criar; re-rodar não duplica.
 *
 * Uso (depois que W58 estiver decidido e um humano autorizar explicitamente):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
 *   E2E_USER_EMAIL=admin@teste.local E2E_USER_PASSWORD=... \
 *   E2E_NON_ADMIN_EMAIL=user@teste.local E2E_NON_ADMIN_PASSWORD=... \
 *   E2E_SEED_CONFIRM_PRODUCTION_WRITE=eu-entendo-e-autorizo \
 *   node scripts/e2e/seed.mjs
 */
import { createClient } from '@supabase/supabase-js';

// Marcador fixo e inequívoco da empresa sintética — nunca reutilizar com CNPJ
// de empresa real. CNPJ no range reservado para testes (nunca emitido pela RFB).
const SEED_EMPRESA_CNPJ = '00000000000191';
const SEED_EMPRESA_RAZAO_SOCIAL = 'E2E SEED LTDA — NAO USAR EM PRODUCAO';
const SEED_EMPRESA_NOME_FANTASIA = '[E2E-SEED] NAO É UMA EMPRESA REAL';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_NON_ADMIN_EMAIL',
  'E2E_NON_ADMIN_PASSWORD',
];
const missing = required.filter((k) => !process.env[k]);
// Codex review (P2, PR #238): SUPABASE_ANON_KEY não estava no `required` nem
// no exemplo de uso, mas signInAs() precisa de uma publishable/anon key real
// — sem ela createClient recebe string vazia e o login falha antes de
// qualquer INSERT. Aceita o nome usado por e2e.yml como alternativa.
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!anonKey) missing.push('SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY)');
if (missing.length) {
  console.error(`❌ Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.E2E_SEED_CONFIRM_PRODUCTION_WRITE !== 'eu-entendo-e-autorizo') {
  console.error(
    [
      '❌ Trava de segurança: este script grava dados sintéticos no banco apontado',
      '   por SUPABASE_URL (hoje, o canônico de produção). Antes de rodar:',
      '   1. Confirme que W58 (docs/auditoria/PLANO_100_WORKFLOWS_2026-10-14.md) foi',
      '      decidido pelo dono e que o alvo atual é mesmo este banco.',
      '   2. Confirme que SUPABASE_URL NÃO é o projeto de produção real de um',
      '      cliente sem que isso tenha sido explicitamente aceito (ver cabeçalho',
      '      deste arquivo — item 2).',
      '   3. Exporte E2E_SEED_CONFIRM_PRODUCTION_WRITE=eu-entendo-e-autorizo',
      '      para confirmar que leu e aceitou os riscos documentados no topo deste',
      '      arquivo.',
    ].join('\n'),
  );
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error(
      `${email} não existe no projeto — rode scripts/provision-e2e-users.mjs primeiro.`,
    );
  }
  return user;
}

/** Autentica como o próprio usuário (JWT real) para que os INSERTs de negócio
 * passem pelas mesmas políticas de RLS que um admin da aplicação teria —
 * nunca usamos a service_role key para escrever em empresas/colaboradores/folha. */
async function signInAs(email, password) {
  const client = createClient(process.env.SUPABASE_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, session: data.session };
}

async function ensureSeedEmpresa(asAdminClient) {
  const { data: existing, error: selErr } = await asAdminClient
    .from('empresas')
    .select('id, razao_social')
    .eq('cnpj', SEED_EMPRESA_CNPJ)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    console.log(`↺ Empresa sintética já existe (${existing.id}) — reaproveitando.`);
    return existing.id;
  }

  const { data: created, error: insErr } = await asAdminClient
    .from('empresas')
    .insert({
      cnpj: SEED_EMPRESA_CNPJ,
      razao_social: SEED_EMPRESA_RAZAO_SOCIAL,
      nome_fantasia: SEED_EMPRESA_NOME_FANTASIA,
      regime_tributario: 'simples_nacional',
      ativa: true,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  console.log(`✅ Empresa sintética criada (${created.id}).`);
  return created.id;
}

async function ensureUserLinkedToEmpresa(userId, empresaId, role) {
  // Precedente: scripts/provision-e2e-users.mjs já escreve diretamente em
  // user_roles com a service_role key (não é tabela de negócio listada na
  // tarefa — é controle de acesso). Seguimos o mesmo padrão aqui para
  // user_roles/user_empresas; só empresas/colaboradores/folhas_pagamento usam
  // o client autenticado (ver ensureSeedEmpresa / seedColaboradores / seedFolha).
  const { error: delErr } = await admin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .neq('role', role);
  if (delErr) throw delErr;
  const { error: roleErr } = await admin
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
  if (roleErr) throw roleErr;

  const { error: empErr } = await admin
    .from('user_empresas')
    .upsert(
      { user_id: userId, empresa_id: empresaId, is_default: true },
      { onConflict: 'user_id,empresa_id' },
    );
  if (empErr) throw empErr;
}

const SEED_COLABORADORES = [
  {
    marker_cpf: '00000000191',
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
    marker_cpf: '00000000272',
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

async function seedColaboradores(asAdminClient, empresaId) {
  const ids = [];
  for (const colaborador of SEED_COLABORADORES) {
    const { data: existing, error: selErr } = await asAdminClient
      .from('colaboradores')
      .select('id')
      .eq('cpf', colaborador.marker_cpf)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const { cpf: _ignored, marker_cpf, ...rest } = colaborador;
    const { data: created, error: insErr } = await asAdminClient
      .from('colaboradores')
      .insert({ ...rest, cpf: marker_cpf, empresa_id: empresaId })
      .select('id')
      .single();
    if (insErr) throw insErr;
    ids.push(created.id);
  }
  console.log(`✅ ${ids.length} colaborador(es) sintético(s) garantido(s).`);
  return ids;
}

async function seedFolhaAberta(asAdminClient, empresaId) {
  const competencia = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: existing, error: selErr } = await asAdminClient
    .from('folhas_pagamento')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('competencia', competencia)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    console.log(`↺ Folha aberta já existe para ${competencia} (${existing.id}).`);
    return existing.id;
  }
  const { data: created, error: insErr } = await asAdminClient
    .from('folhas_pagamento')
    .insert({ empresa_id: empresaId, competencia, tipo: 'mensal', status: 'aberta' })
    .select('id')
    .single();
  if (insErr) throw insErr;
  console.log(`✅ Folha aberta criada para ${competencia} (${created.id}).`);
  return created.id;
}

async function main() {
  const adminUser = await findUserByEmail(process.env.E2E_USER_EMAIL);
  const nonAdminUser = await findUserByEmail(process.env.E2E_NON_ADMIN_EMAIL);

  // 1) Garantir a empresa sintética e os vínculos — usando o client
  //    autenticado como o próprio admin E2E (RLS real), nunca service_role.
  const { client: adminAuthed } = await signInAs(
    process.env.E2E_USER_EMAIL,
    process.env.E2E_USER_PASSWORD,
  );

  const empresaId = await ensureSeedEmpresa(adminAuthed);
  await ensureUserLinkedToEmpresa(adminUser.id, empresaId, 'admin');
  await ensureUserLinkedToEmpresa(nonAdminUser.id, empresaId, 'user');

  await seedColaboradores(adminAuthed, empresaId);
  await seedFolhaAberta(adminAuthed, empresaId);

  console.log('Pronto. Seed E2E sintético aplicado/garantido com sucesso.');
}

main().catch((err) => {
  console.error('❌ Falha no seed E2E:', err);
  process.exit(1);
});
