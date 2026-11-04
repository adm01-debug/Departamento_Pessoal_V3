# public.workflows_etapas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `workflow_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | sim | `'aprovacao'::text` |  |  |
| 5 | `ordem` | `integer` | não |  |  |  |
| 6 | `aprovador_tipo` | `text` | sim |  |  |  |
| 7 | `aprovador_id` | `uuid` | sim |  |  |  |
| 8 | `config` | `jsonb` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflows_etapas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| workflows_etapas_workflow_id_fkey | FOREIGN KEY | `FOREIGN KEY (workflow_id) REFERENCES workflows_definicoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.workflows_execucoes | workflows_execucoes_etapa_atual_id_fkey | etapa_atual_id | NO ACTION |
| public.workflows_historico | workflows_historico_etapa_id_fkey | etapa_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflows_etapas_workflow_id | btree | workflow_id | não | sim |  | `CREATE INDEX idx_workflows_etapas_workflow_id ON public.workflows_etapas USING btree (workflow_id)` |
| workflows_etapas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflows_etapas_pkey ON public.workflows_etapas USING btree (id)` |


## Policies (RLS)

### `workflows_etapas_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM workflows_definicoes w   WHERE ((w.id = workflows_etapas.workflow_id) AND (w.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `workflows_etapas_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM workflows_definicoes w   WHERE ((w.id = workflows_etapas.workflow_id) AND (w.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |

### `workflows_etapas_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM workflows_definicoes w   WHERE ((w.id = workflows_etapas.workflow_id) AND (w.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `workflows_etapas_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM workflows_definicoes w   WHERE ((w.id = workflows_etapas.workflow_id) AND (w.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM workflows_definicoes w   WHERE ((w.id = workflows_etapas.workflow_id) AND (w.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
