# public.workflows_historico

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
| 2 | `execucao_id` | `uuid` | não |  |  |  |
| 3 | `etapa_id` | `uuid` | sim |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `usuario_id` | `uuid` | sim |  |  |  |
| 6 | `observacoes` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| workflows_historico_etapa_id_fkey | FOREIGN KEY | `FOREIGN KEY (etapa_id) REFERENCES workflows_etapas(id)` | NO ACTION | NO ACTION | sim |
| workflows_historico_execucao_id_fkey | FOREIGN KEY | `FOREIGN KEY (execucao_id) REFERENCES workflows_execucoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| workflows_historico_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_workflows_historico_etapa_id | btree | etapa_id | não | sim |  | `CREATE INDEX idx_workflows_historico_etapa_id ON public.workflows_historico USING btree (etapa_id)` |
| idx_workflows_historico_execucao_id | btree | execucao_id | não | sim |  | `CREATE INDEX idx_workflows_historico_execucao_id ON public.workflows_historico USING btree (execucao_id)` |
| workflows_historico_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX workflows_historico_pkey ON public.workflows_historico USING btree (id)` |


## Policies (RLS)

### `workflows_historico_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM workflows_execucoes e   WHERE ((e.id = workflows_historico.execucao_id) AND (e.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `workflows_historico_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM workflows_execucoes e   WHERE ((e.id = workflows_historico.execucao_id) AND (e.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |

### `workflows_historico_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM workflows_execucoes e   WHERE ((e.id = workflows_historico.execucao_id) AND (e.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |

### `workflows_historico_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM workflows_execucoes e   WHERE ((e.id = workflows_historico.execucao_id) AND (e.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM workflows_execucoes e   WHERE ((e.id = workflows_historico.execucao_id) AND (e.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
