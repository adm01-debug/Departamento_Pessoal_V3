# Baseline do banco vivo — 24/09/2026 (E50-09)

Dump somente-leitura do estado do schema `public` em produção, extraído via MCP
(`SUPABASE - DEPARTAMENTO PESSOAL`), para servir de referência ao comparar contra
`supabase/migrations/`.

## O que está aqui

- `policies.json` — 601 policies RLS: tabela, nome, tipo (PERMISSIVE/RESTRICTIVE),
  roles e comando (`ALL`/`SELECT`/...).
- `indexes.json` — 1254 índices do schema `public`.
- `functions.json` — 341 funções/triggers do schema `public`: nome, tipo, tipo de
  retorno.
- `roles.json` — 37 roles do Postgres (incluindo os internos do Supabase), com
  `rolsuper`/`rolcreatedb`/`rolcanlogin`.

## O que NÃO está aqui (limitação da ferramenta, não omissão deliberada)

O plano (E50-09) pedia policies com `qual`/`with_check`, `proconfig` (search_path)
por função definer, e grants por role — nenhuma dessas três coisas é exposta
pelas tools de leitura disponíveis nesta sessão (`supabase_db_list_policies`,
`supabase_db_list_functions`, `supabase_db_list_roles`); exigiria SQL bruto
contra `pg_policies`/`pg_proc`/`information_schema.role_table_grants`, que este
projeto MCP não expõe como tool somente-leitura.

Para completar esse baseline com o predicado (`qual`/`with_check`) e o
`proconfig` por função, rodar manualmente (via `supabase_db_query` ou
equivalente com acesso a SQL bruto, num projeto/role que tenha esse tool):

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public';

select p.proname, p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public';
```

## Revisão de PII antes de commit (risco do E50-09)

Revisado: `policies.json` e `functions.json` contêm só nomes de tabela/policy/
função e metadados estruturais (tipo, roles, cmd) — nenhum dado de negócio,
nenhum literal de PII. Repo é público; ok para versionar.

## Como usar

Referência estática para comparação manual contra `supabase/migrations/*.sql`
ao investigar divergência de schema (ex.: policy que a migration achava ter
dropado e continua viva). Não é comparado automaticamente por CI — ver
`scripts/audit-schema-drift.mjs` e a nota em `PLANO_50.md` § E50-10/E50-13
sobre por que esse gate automático ainda não é confiável (lacuna de ~41% no
ledger de migrations aplicadas).
