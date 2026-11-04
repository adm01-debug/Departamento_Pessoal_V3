# public.onboarding_tarefas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `onboarding_id` | `uuid` | não |  |  |  |
| 3 | `template_tarefa_id` | `uuid` | sim |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `categoria` | `text` | não | `'geral'::text` |  |  |
| 7 | `ordem` | `integer` | não | `0` |  |  |
| 8 | `data_prazo` | `date` | sim |  |  |  |
| 9 | `data_conclusao` | `timestamp with time zone` | sim |  |  |  |
| 10 | `concluida` | `boolean` | sim | `false` |  |  |
| 11 | `concluida_por` | `uuid` | sim |  |  |  |
| 12 | `observacoes` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| onboarding_tarefas_concluida_por_fkey | FOREIGN KEY | `FOREIGN KEY (concluida_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| onboarding_tarefas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| onboarding_tarefas_onboarding_id_fkey | FOREIGN KEY | `FOREIGN KEY (onboarding_id) REFERENCES onboarding_colaborador(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| onboarding_tarefas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| onboarding_tarefas_template_tarefa_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_tarefa_id) REFERENCES onboarding_template_tarefas(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_onboarding_tarefas_concluida_por | btree | concluida_por | não | sim |  | `CREATE INDEX idx_onboarding_tarefas_concluida_por ON public.onboarding_tarefas USING btree (concluida_por)` |
| idx_onboarding_tarefas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_onboarding_tarefas_empresa_id ON public.onboarding_tarefas USING btree (empresa_id)` |
| idx_onboarding_tarefas_onboarding_id | btree | onboarding_id | não | sim |  | `CREATE INDEX idx_onboarding_tarefas_onboarding_id ON public.onboarding_tarefas USING btree (onboarding_id)` |
| idx_onboarding_tarefas_template_tarefa_id | btree | template_tarefa_id | não | sim |  | `CREATE INDEX idx_onboarding_tarefas_template_tarefa_id ON public.onboarding_tarefas USING btree (template_tarefa_id)` |
| onboarding_tarefas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX onboarding_tarefas_pkey ON public.onboarding_tarefas USING btree (id)` |


## Policies (RLS)

### `Multi-tenant access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id = auth.uid()) OR (( SELECT c.empresa_id    FROM colaboradores c   WHERE (c.id = auth.uid())) = empresa_id))` |
| WITH CHECK |  |

### `Tenant scoped onboarding_tarefas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(onboarding_id IN ( SELECT oc.id    FROM (onboarding_colaborador oc      JOIN colaboradores c ON ((c.id = oc.colaborador_id)))   WHERE (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(onboarding_id IN ( SELECT oc.id    FROM (onboarding_colaborador oc      JOIN colaboradores c ON ((c.id = oc.colaborador_id)))   WHERE (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_onboarding_tarefas | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
