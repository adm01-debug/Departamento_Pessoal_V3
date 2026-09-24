# Runbook — aplicação auditável de migrations em produção (E50-14)

> Este runbook documenta o processo **atual** (24/09/2026 em diante), usado
> pelo workflow `canonical-migrations.yml`. Para a reconciliação histórica do
> drift 2026 (lote de 19-31/07 nunca aplicado) ver
> [`RECONCILIACAO_DRIFT_MIGRATIONS.md`](./RECONCILIACAO_DRIFT_MIGRATIONS.md) e
> [`PROMOCAO_BANCO_PRODUCAO.md`](./PROMOCAO_BANCO_PRODUCAO.md).

## A regra que este runbook existe para não deixar esquecer

**Ledger não prova DDL aplicado.** `supabase_migrations.schema_migrations`
registra que uma versão foi _marcada_ como aplicada — não que o efeito da
migration exista de fato no schema vivo. O lote de julho/2026 provou isso: 30
versões ficaram no ledger (parcial) sem o DDL correspondente ter rodado. Toda
aplicação em produção precisa de **duas provas**, não uma: entrada no ledger
E verificação do efeito esperado (policy existe/sumiu, grant revogado,
search_path setado — o que a migration prometeu mudar).

## Quem aplica, por qual canal

- **Canal único**: workflow `canonical-migrations.yml` (`workflow_dispatch`),
  nunca `psql`/MCP direto contra produção fora desse workflow.
- **Quem**: quem tem permissão de rodar Actions neste repositório com acesso
  ao environment `production` (gate do GitHub Environments) — hoje, sessões
  Claude Code autorizadas e mantenedores humanos.
- **Prova de intenção**: o input `confirm_project_ref` exige digitar o ref
  canônico (`frjbfeamybqsejlvmqbl`) por extenso — barra "cliquei sem olhar"
  em ambiente errado.

## O processo, passo a passo

1. **Escopar a lista fechada.** Editar o step "Preparar somente as migrações
   aprovadas" em `canonical-migrations.yml`, substituindo (não acumulando) a
   lista de arquivos pelo lote atual. Acumular reaplicaria `CREATE POLICY`
   não-idempotente de lotes já aplicados e quebraria com "policy already
   exists".
2. **`mode: validate` primeiro, sempre.** Roda a lista inteira dentro de
   `BEGIN; ... ROLLBACK;` contra o banco real — testa erro de sintaxe,
   dependência faltando, policy com nome errado, sem persistir nada.
3. **Corrigir e revalidar** até `CANONICAL_MIGRATION_DRY_RUN_OK`.
4. **`mode: apply`.** Roda a mesma lista validada dentro de `BEGIN; ... COMMIT;`,
   com `INSERT ... ON CONFLICT DO NOTHING` no ledger por migration.
5. **Verificação pós-apply é parte do workflow, não um passo manual à parte.**
   O step "Verificar objetos e ledger" consulta o catálogo do Postgres
   (`pg_policies`, `has_function_privilege`, etc. — o que for relevante ao
   lote) e falha o job se o efeito esperado não bater, mesmo com o `COMMIT`
   já feito. Cada novo lote de migrations **edita essa query** para checar o
   efeito daquele lote específico — copiar o padrão de
   `20260924192541_p1_registros_ponto_role_policy.sql` (checagem de
   `tenant_registros_ponto_dropped` + `registros_ponto_write_ok` + contagem
   do ledger).
6. **Registrar no PR e no `PLANO_50.md`** (ou plano vigente) o resultado da
   verificação — não só "apliquei", mas o valor que a query de verificação
   retornou.

## O que fazer quando a verificação falhar depois do `COMMIT`

O `COMMIT` já aconteceu — não é um dry-run. Se a verificação falhar:

1. Não entrar em pânico e não tentar "consertar" com outra migration
   apressada.
2. Ler o resultado exato que a query de verificação retornou (está no log do
   job) para entender que parte do efeito não bateu.
3. Escrever uma migration corretiva nova, específica, com sua própria
   verificação — nunca editar/reaplicar a migration que já rodou.
4. Seguir [`RESPOSTA_INCIDENTES.md`](./RESPOSTA_INCIDENTES.md) se o efeito
   observado for pior que "não mudou nada" (ex.: RLS ficou mais aberta que
   antes).

## Checklist de PR que toca `supabase/migrations/`

- [ ] Migration segue o padrão fail-closed de
      [`supabase/migrations/_template.sql`](../../supabase/migrations/_template.sql)
      se fizer `DROP POLICY` — `scripts/audit-migration-style.mjs` reprova no
      CI se não seguir (E50-12).
- [ ] Nomes de policy/função lidos **ao vivo** via MCP antes de escrever a
      migration, nunca copiados de outra migration ou do plano.
- [ ] `mode: validate` rodado e verde antes de `mode: apply`.
- [ ] Step de verificação pós-apply do workflow atualizado para o efeito
      deste lote específico.
- [ ] Resultado da verificação (não só "aplicado") registrado no PR.
- [ ] Se o baseline (`supabase/baseline/`, E50-09) existir e este lote mudar
      policy/proconfig/grant, atualizar o baseline no mesmo PR.

## Risco conhecido

Runbook que ninguém segue não vale nada. Por isso o checklist acima é
cobrado no PR, não só descrito aqui — e por isso o lint E50-12 reprova no CI
em vez de depender de review humano lembrar da regra.
