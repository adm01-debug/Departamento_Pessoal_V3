// Teste de isolamento multi-tenant nas policies REAIS do Storage (não é
// simulação de frontend — cada asserção abaixo bate direto no endpoint de
// Storage do Supabase, autenticado como o usuário de teste, e depende de
// RLS real em storage.objects para passar ou falhar).
//
// Cobre o gap fechado por 20260925130000_storage_documentos_delete_tenant_scope.sql:
// SELECT/INSERT/UPDATE nos buckets `documentos`/`documentos-colaboradores` já
// eram tenant-scoped desde 20260724150000_t008_storage_tenant_path_scope.sql
// (via `user_belongs_to_empresa(auth.uid(), foldername(name)[1]::uuid)`);
// DELETE só checava role (admin/rh) globalmente, sem checar a empresa — um
// admin/RH de uma empresa conseguia apagar arquivo de outra.
//
// Cenário: 2 empresas de teste (A e B) + 1 usuário (user A), pertencente
// SOMENTE à empresa A, com role 'rh' (global, mas a policy exige também
// pertencer à empresa do objeto). Confirma que operar dentro da própria
// empresa funciona e que TODA operação (select/insert/update/delete)
// mirando o path da empresa B é negada — mesmo o usuário tendo o role
// certo, porque falta o vínculo de tenant.
//
// Pré-requisitos (mesmo padrão de supabase/tests/migration_consistency.test.ts):
//   TEST_SUPABASE_URL       — https://<ref>.supabase.co
//   TEST_ANON_KEY           — anon key
//   TEST_SERVICE_ROLE_KEY   — service role (setup/cleanup privilegiado)
//
// Executar:
//   deno test --allow-net --allow-env supabase/tests/storage_documentos_tenant_isolation.test.ts
//
// Todos os testes são IGNORADOS quando as envs não estão presentes — não quebra CI padrão.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const url = Deno.env.get("TEST_SUPABASE_URL");
const anonKey = Deno.env.get("TEST_ANON_KEY");
const serviceKey = Deno.env.get("TEST_SERVICE_ROLE_KEY");

const canRun = Boolean(url && anonKey && serviceKey);

function admin(): SupabaseClient {
  return createClient(url!, serviceKey!, { auth: { persistSession: false } });
}

function anonClient(): SupabaseClient {
  return createClient(url!, anonKey!, { auth: { persistSession: false } });
}

const BUCKETS = ["documentos", "documentos-colaboradores"] as const;
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"

/** Cria empresa A, empresa B, e o usuário de teste (na empresa A, role 'rh'),
 * faz login como ele, e devolve tudo + uma função de cleanup. */
async function setupTenantScenario() {
  const db = admin();
  const suffix = crypto.randomUUID().slice(0, 8);

  // cnpj é CHAR(14) UNIQUE NOT NULL — gera um valor numérico único fictício
  // (não precisa ser um CNPJ válido de verdade, só preencher a constraint;
  // usa dígitos de um uuid pra evitar colisão entre as duas chamadas).
  const fakeCnpj = () => crypto.randomUUID().replace(/\D/g, "").padEnd(14, "0").slice(0, 14);

  const { data: empresaA, error: eaErr } = await db.from("empresas")
    .insert({ razao_social: `Teste Tenant A ${suffix}`, cnpj: fakeCnpj() })
    .select("id").single();
  assertEquals(eaErr, null, `falha ao criar empresa A: ${eaErr?.message}`);

  const { data: empresaB, error: ebErr } = await db.from("empresas")
    .insert({ razao_social: `Teste Tenant B ${suffix}`, cnpj: fakeCnpj() })
    .select("id").single();
  assertEquals(ebErr, null, `falha ao criar empresa B: ${ebErr?.message}`);

  const email = `rls-test-${suffix}@example.test`;
  const password = `Test-${crypto.randomUUID()}!`;
  const { data: created, error: userErr } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  assertEquals(userErr, null, `falha ao criar usuário de teste: ${userErr?.message}`);
  const userId = created!.user!.id;

  // Vínculo SOMENTE com a empresa A (é exatamente isso que a policy de
  // DELETE precisa negar quando o path aponta pra empresa B).
  const { error: ueErr } = await db.from("user_empresas")
    .insert({ user_id: userId, empresa_id: empresaA!.id, is_default: true });
  assertEquals(ueErr, null, `falha ao vincular usuário à empresa A: ${ueErr?.message}`);

  const { error: roleErr } = await db.from("user_roles")
    .insert({ user_id: userId, role: "rh" });
  assertEquals(roleErr, null, `falha ao conceder role rh: ${roleErr?.message}`);

  const userClient = anonClient();
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
  assertEquals(signInErr, null, `falha ao logar como usuário de teste: ${signInErr?.message}`);

  const cleanup = async () => {
    await db.auth.admin.deleteUser(userId).catch(() => {});
    await db.from("empresas").delete().eq("id", empresaA!.id).catch(() => {});
    await db.from("empresas").delete().eq("id", empresaB!.id).catch(() => {});
  };

  return { db, userClient, empresaAId: empresaA!.id as string, empresaBId: empresaB!.id as string, cleanup };
}

for (const bucket of BUCKETS) {
  Deno.test({
    name: `[${bucket}] usuário A: upload/leitura/signed URL dentro da própria empresa → PERMITIDO`,
    ignore: !canRun,
    async fn() {
      const { db, userClient, empresaAId, cleanup } = await setupTenantScenario();
      const pathA = `${empresaAId}/colab-teste/categoria/${crypto.randomUUID()}.pdf`;
      try {
        const up = await userClient.storage.from(bucket).upload(pathA, PDF_BYTES, { contentType: "application/pdf" });
        assertEquals(up.error, null, `upload na própria empresa deveria funcionar: ${up.error?.message}`);

        const dl = await userClient.storage.from(bucket).download(pathA);
        assertEquals(dl.error, null, `leitura na própria empresa deveria funcionar: ${dl.error?.message}`);

        const signed = await userClient.storage.from(bucket).createSignedUrl(pathA, 60);
        assertEquals(signed.error, null, `signed URL na própria empresa deveria funcionar: ${signed.error?.message}`);
        assert(signed.data?.signedUrl, "signed URL deveria vir preenchida");
      } finally {
        await db.storage.from(bucket).remove([pathA]).catch(() => {});
        await cleanup();
      }
    },
  });

  Deno.test({
    name: `[${bucket}] usuário A: ler/gerar signed URL de arquivo da empresa B → NEGADO`,
    ignore: !canRun,
    async fn() {
      const { db, userClient, empresaBId, cleanup } = await setupTenantScenario();
      const pathB = `${empresaBId}/colab-outro/categoria/${crypto.randomUUID()}.pdf`;
      try {
        // Seed do objeto da empresa B via service_role (bypassa RLS de propósito, é setup).
        const seed = await db.storage.from(bucket).upload(pathB, PDF_BYTES, { contentType: "application/pdf" });
        assertEquals(seed.error, null, `seed do objeto da empresa B falhou: ${seed.error?.message}`);

        const dl = await userClient.storage.from(bucket).download(pathB);
        assert(dl.error !== null, "download de arquivo de outra empresa deveria ser NEGADO");

        const signed = await userClient.storage.from(bucket).createSignedUrl(pathB, 60);
        assert(signed.error !== null || !signed.data?.signedUrl, "signed URL de outra empresa deveria ser NEGADA");
      } finally {
        await db.storage.from(bucket).remove([pathB]).catch(() => {});
        await cleanup();
      }
    },
  });

  Deno.test({
    name: `[${bucket}] usuário A: upload usando path da empresa B → NEGADO`,
    ignore: !canRun,
    async fn() {
      const { userClient, empresaBId, cleanup } = await setupTenantScenario();
      const pathB = `${empresaBId}/colab-outro/categoria/${crypto.randomUUID()}.pdf`;
      try {
        const up = await userClient.storage.from(bucket).upload(pathB, PDF_BYTES, { contentType: "application/pdf" });
        assert(up.error !== null, "upload gravando dentro do diretório de outra empresa deveria ser NEGADO");
      } finally {
        await cleanup();
      }
    },
  });

  Deno.test({
    name: `[${bucket}] usuário A: update (upsert) de arquivo da empresa B → NEGADO`,
    ignore: !canRun,
    async fn() {
      const { db, userClient, empresaBId, cleanup } = await setupTenantScenario();
      const pathB = `${empresaBId}/colab-outro/categoria/${crypto.randomUUID()}.pdf`;
      try {
        const seed = await db.storage.from(bucket).upload(pathB, PDF_BYTES, { contentType: "application/pdf" });
        assertEquals(seed.error, null, `seed do objeto da empresa B falhou: ${seed.error?.message}`);

        const upd = await userClient.storage.from(bucket).update(pathB, PDF_BYTES, { contentType: "application/pdf" });
        assert(upd.error !== null, "update de arquivo de outra empresa deveria ser NEGADO");
      } finally {
        await db.storage.from(bucket).remove([pathB]).catch(() => {});
        await cleanup();
      }
    },
  });

  Deno.test({
    name: `[${bucket}] usuário A (role rh): delete dentro da própria empresa → PERMITIDO, delete na empresa B → NEGADO`,
    ignore: !canRun,
    async fn() {
      const { db, userClient, empresaAId, empresaBId, cleanup } = await setupTenantScenario();
      const pathA = `${empresaAId}/colab-teste/categoria/${crypto.randomUUID()}.pdf`;
      const pathB = `${empresaBId}/colab-outro/categoria/${crypto.randomUUID()}.pdf`;
      try {
        const seedA = await db.storage.from(bucket).upload(pathA, PDF_BYTES, { contentType: "application/pdf" });
        assertEquals(seedA.error, null, `seed do objeto da empresa A falhou: ${seedA.error?.message}`);
        const seedB = await db.storage.from(bucket).upload(pathB, PDF_BYTES, { contentType: "application/pdf" });
        assertEquals(seedB.error, null, `seed do objeto da empresa B falhou: ${seedB.error?.message}`);

        // Regra a preservar: role rh/admin pode apagar — mas SÓ dentro da própria empresa.
        const delA = await userClient.storage.from(bucket).remove([pathA]);
        assertEquals(delA.error, null, `delete na própria empresa (role rh) deveria funcionar: ${delA.error?.message}`);
        const stillThereA = await db.storage.from(bucket).download(pathA);
        assert(stillThereA.error !== null, "objeto da empresa A deveria ter sido removido de fato");

        // O gap que esta migration fecha: mesmo com role rh, sem vínculo com
        // a empresa B, o delete tem que ser negado.
        const delB = await userClient.storage.from(bucket).remove([pathB]);
        const stillThereB = await db.storage.from(bucket).download(pathB);
        assertEquals(stillThereB.error, null, "delete cross-tenant NÃO pode ter apagado o objeto da empresa B — se isto falhar, a policy de DELETE ainda não está tenant-scoped");
        void delB; // o SDK do Storage pode devolver 200 com 0 arquivos removidos em vez de erro — a prova real é o objeto continuar existindo (linha acima).
      } finally {
        await db.storage.from(bucket).remove([pathA, pathB]).catch(() => {});
        await cleanup();
      }
    },
  });
}
