#!/usr/bin/env node

/**
 * Provisiona as identidades usadas pelos testes E2E autenticados
 * (workflows `e2e.yml`, rodam só em `main` — fronteira de segurança
 * documentada: secrets com escrita no banco canônico não rodam em PRs).
 *
 * Cria/atualiza dois usuários no GoTrue e suas roles em `public.user_roles`:
 *   - E2E_USER_EMAIL / E2E_USER_PASSWORD        → role 'admin'
 *   - E2E_NON_ADMIN_EMAIL / E2E_NON_ADMIN_PASSWORD → role 'user'
 *
 * Requer (service role — NUNCA commitar):
 *   SUPABASE_URL                     URL do projeto canônico
 *   SUPABASE_SERVICE_ROLE_KEY        service_role do canônico
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   E2E_USER_EMAIL=... E2E_USER_PASSWORD=... \
 *   E2E_NON_ADMIN_EMAIL=... E2E_NON_ADMIN_PASSWORD=... \
 *   node scripts/provision-e2e-users.mjs
 *
 * Idempotente: usuário existente tem senha/e-mail-confirm atualizados; role
 * existente é reutilizada (UNIQUE (user_id, role) é respeitado via upsert).
 */
import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'E2E_USER_EMAIL',
  'E2E_USER_PASSWORD',
  'E2E_NON_ADMIN_EMAIL',
  'E2E_NON_ADMIN_PASSWORD',
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertUser(email, password) {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return { user: data.user, created: false };
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return { user: data.user, created: true };
}

async function ensureRole(userId, role) {
  const { error } = await admin
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
  if (error) throw error;
}

const e2eAdmin = await upsertUser(process.env.E2E_USER_EMAIL, process.env.E2E_USER_PASSWORD);
await ensureRole(e2eAdmin.user.id, 'admin');
console.log(`✅ E2E_USER (${process.env.E2E_USER_EMAIL}) ${e2eAdmin.created ? 'criado' : 'atualizado'} com role 'admin'`);

const e2eUser = await upsertUser(process.env.E2E_NON_ADMIN_EMAIL, process.env.E2E_NON_ADMIN_PASSWORD);
await ensureRole(e2eUser.user.id, 'user');
console.log(`✅ E2E_NON_ADMIN (${process.env.E2E_NON_ADMIN_EMAIL}) ${e2eUser.created ? 'criado' : 'atualizado'} com role 'user'`);

console.log('Pronto. Os mesmos valores devem estar nos secrets do GitHub (e2e.yml).');
