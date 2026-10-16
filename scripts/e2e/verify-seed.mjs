#!/usr/bin/env node
/**
 * Gate de verificação fail-closed para o seed do E2E autenticado (W59/W60,
 * docs/auditoria/PLANO_100_WORKFLOWS_2026-10-14.md Bloco F).
 *
 * Diferente de `scripts/e2e/seed.mjs` (que grava dados), este script é
 * SOMENTE LEITURA: confere se o estado esperado pelo seed já existe e falha
 * (exit 1) se não existir, em vez de inventar dados. Pode ser ligado no job
 * `playwright` (authenticated) a qualquer momento — nunca escreve nada.
 *
 * W58 foi decidido (15/10/2026, ver cabeçalho de seed.mjs) e o seed já foi
 * aplicado contra o canônico: admin@teste.local/user@teste.local vinculados
 * à empresa sintética `61e7d382-549f-4b17-afa4-4578ebc919f3`, com 2
 * colaboradores e 1 folha aberta. Rodar este script agora deve reportar
 * sucesso.
 *
 * Verifica:
 *   1. admin@teste.local / user@teste.local existem no GoTrue.
 *   2. Ambos têm role em user_roles.
 *   3. Ambos têm vínculo em user_empresas, para a MESMA empresa.
 *   4. Essa empresa tem pelo menos 2 colaboradores e 1 folha com status
 *      'aberta' ou 'calculada'.
 *
 * Não assume CNPJ fixo de "empresa sintética" — aceita qualquer empresa à qual
 * os usuários E2E estejam de fato vinculados, porque a decisão de qual banco/
 * empresa é o alvo do E2E autenticado é do dono (W58), não deste script.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   E2E_USER_EMAIL=admin@teste.local E2E_NON_ADMIN_EMAIL=user@teste.local \
 *   node scripts/e2e/verify-seed.mjs
 */
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'E2E_USER_EMAIL', 'E2E_NON_ADMIN_EMAIL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const failures = [];

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
  const adminEmail = process.env.E2E_USER_EMAIL;
  const nonAdminEmail = process.env.E2E_NON_ADMIN_EMAIL;

  const adminUser = await findUserByEmail(adminEmail);
  const nonAdminUser = await findUserByEmail(nonAdminEmail);
  if (!adminUser) failures.push(`${adminEmail} não existe no GoTrue.`);
  if (!nonAdminUser) failures.push(`${nonAdminEmail} não existe no GoTrue.`);
  if (!adminUser || !nonAdminUser) return report();

  const { data: roles, error: rolesErr } = await admin
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', [adminUser.id, nonAdminUser.id]);
  if (rolesErr) throw rolesErr;
  const adminRole = roles.find((r) => r.user_id === adminUser.id);
  const nonAdminRole = roles.find((r) => r.user_id === nonAdminUser.id);
  if (!adminRole) failures.push(`${adminEmail} não tem role em user_roles.`);
  if (!nonAdminRole) failures.push(`${nonAdminEmail} não tem role em user_roles.`);

  // Codex review (P2, PR #238): cada usuário pode ter VÁRIAS linhas em
  // user_empresas (uma migration do schema vincula todo admin a toda
  // empresa). `.find()` pegava a primeira linha sem nenhuma ordenação —
  // podia reportar "empresas diferentes" mesmo quando os dois de fato
  // compartilham a empresa do seed, ou contar colaboradores/folha de uma
  // empresa real não relacionada. Calculamos a INTERSEÇÃO dos dois
  // conjuntos de empresa_id e usamos essa empresa compartilhada.
  const { data: vinculos, error: vincErr } = await admin
    .from('user_empresas')
    .select('user_id, empresa_id')
    .in('user_id', [adminUser.id, nonAdminUser.id]);
  if (vincErr) throw vincErr;
  const adminEmpresaIds = new Set(
    vinculos.filter((v) => v.user_id === adminUser.id).map((v) => v.empresa_id),
  );
  const nonAdminEmpresaIds = new Set(
    vinculos.filter((v) => v.user_id === nonAdminUser.id).map((v) => v.empresa_id),
  );
  if (adminEmpresaIds.size === 0) failures.push(`${adminEmail} não tem vínculo em user_empresas.`);
  if (nonAdminEmpresaIds.size === 0) {
    failures.push(`${nonAdminEmail} não tem vínculo em user_empresas.`);
  }
  const sharedEmpresaIds = [...adminEmpresaIds].filter((id) => nonAdminEmpresaIds.has(id));
  if (adminEmpresaIds.size > 0 && nonAdminEmpresaIds.size > 0 && sharedEmpresaIds.length === 0) {
    failures.push(
      `${adminEmail} e ${nonAdminEmail} não compartilham NENHUMA empresa ` +
        `(${[...adminEmpresaIds].join(', ')} vs ${[...nonAdminEmpresaIds].join(', ')}).`,
    );
  }

  const empresaId = sharedEmpresaIds[0];
  if (empresaId) {
    const { count: colabCount, error: colabErr } = await admin
      .from('colaboradores')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);
    if (colabErr) throw colabErr;
    if (!colabCount || colabCount < 2) {
      failures.push(
        `Empresa ${empresaId} tem ${colabCount ?? 0} colaborador(es) — esperado >= 2.`,
      );
    }

    const { count: folhaCount, error: folhaErr } = await admin
      .from('folhas_pagamento')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .in('status', ['aberta', 'calculada']);
    if (folhaErr) throw folhaErr;
    if (!folhaCount || folhaCount < 1) {
      failures.push(
        `Empresa ${empresaId} não tem nenhuma folha 'aberta'/'calculada' — esperado >= 1.`,
      );
    }
  }

  report();
}

function report() {
  if (failures.length) {
    console.error('❌ Seed do E2E autenticado incompleto ou ausente:');
    for (const f of failures) console.error(`   - ${f}`);
    console.error(
      '\nEste gate falha fechado por design (não cria dados). Rode scripts/e2e/seed.mjs ' +
        '(idempotente) para aplicar/reaplicar o seed, ou veja o cabeçalho dele para o histórico.',
    );
    process.exit(1);
  }
  console.log('✅ Seed do E2E autenticado presente e consistente.');
}

main().catch((err) => {
  console.error('❌ Erro ao verificar o seed:', err);
  process.exit(1);
});
