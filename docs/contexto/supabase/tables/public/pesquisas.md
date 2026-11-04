# public.pesquisas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `titulo` | `text` | não |  |  |  |
| 3 | `descricao` | `text` | sim |  |  |  |
| 4 | `tipo` | `text` | sim | `'clima'::text` |  |  |
| 5 | `status` | `text` | sim | `'rascunho'::text` |  |  |
| 6 | `anonima` | `boolean` | sim | `true` |  |  |
| 7 | `data_inicio` | `date` | sim |  |  |  |
| 8 | `data_fim` | `date` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_pesquisas_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['rascunho'::text, 'ativa'::text, 'encerrada'::text, 'arquivada'::text, 'cancelada'::text])))` |  |  | sim |
| chk_pesquisas_tipo | CHECK | `CHECK (tipo IS NULL OR (tipo = ANY (ARRAY['clima'::text, 'engajamento'::text, 'enps'::text, 'pulse'::text, 'saida'::text, 'onboarding'::text, '360'::text, 'ad_hoc'::text])))` |  |  | sim |
| pesquisas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| pesquisas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pesquisas_perguntas | pesquisas_perguntas_pesquisa_id_fkey | pesquisa_id | CASCADE |
| public.pesquisas_respostas | pesquisas_respostas_pesquisa_id_fkey | pesquisa_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pesquisas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_pesquisas_empresa_id ON public.pesquisas USING btree (empresa_id)` |
| pesquisas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pesquisas_pkey ON public.pesquisas USING btree (id)` |


## Policies (RLS)

### `empresa_pesquisas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| pesquisas_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_pesquisas_status_transition |
| update_pesquisas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
