# public.workflows_execucoes

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
| 2 | `workflow_id` | `uuid` | não |  |  |  |
| 3 | `etapa_atual_id` | `uuid` | sim |  |  |  |
| 4 | `entidade_tipo` | `text` | não |  |  |  |
| 5 | `entidade_id` | `uuid` | não |  |  |  |
| 6 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 7 | `solicitante_id` | `uuid` | sim |  |  |  |
| 8 | `dados` | `jsonb` | sim |  |  |  |
| 9 | `empresa_id` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `log_execucao` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 13 | `metadata_automacao` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 14 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 15 | `etapa_atual` | `integer` | sim | `1` |  |  |
| 16 | `sla_iniciado_em` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflows_execucoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| workflows_execucoes_etapa_atual_id_fkey | FOREIGN KEY | `FOREIGN KEY (etapa_atual_id) REFERENCES workflows_etapas(id)` | NO ACTION | NO ACTION | sim |
| workflows_execucoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflows_execucoes_workflow_id_fkey | FOREIGN KEY | `FOREIGN KEY (workflow_id) REFERENCES workflows_definicoes(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.workflows_historico | workflows_historico_execucao_id_fkey | execucao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflows_execucoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_workflows_execucoes_empresa_id ON public.workflows_execucoes USING btree (empresa_id)` |
| idx_workflows_execucoes_etapa_atual_id | btree | etapa_atual_id | não | sim |  | `CREATE INDEX idx_workflows_execucoes_etapa_atual_id ON public.workflows_execucoes USING btree (etapa_atual_id)` |
| idx_workflows_execucoes_workflow_id | btree | workflow_id | não | sim |  | `CREATE INDEX idx_workflows_execucoes_workflow_id ON public.workflows_execucoes USING btree (workflow_id)` |
| workflows_execucoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflows_execucoes_pkey ON public.workflows_execucoes USING btree (id)` |


## Policies (RLS)

### `empresa_workflows_exec`

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
| tr_workflows_automation_start | BEFORE | INSERT | ROW | enabled | public.trigger_workflow_automation |
| update_workflows_execucoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
