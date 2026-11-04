# public.onboarding_template_tarefas

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
| 2 | `template_id` | `uuid` | não |  |  |  |
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `categoria` | `text` | não | `'geral'::text` |  |  |
| 6 | `ordem` | `integer` | não | `0` |  |  |
| 7 | `dias_prazo` | `integer` | sim | `1` |  |  |
| 8 | `responsavel_tipo` | `text` | sim | `'rh'::text` |  |  |
| 9 | `obrigatoria` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| onboarding_template_tarefas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| onboarding_template_tarefas_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES onboarding_templates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.onboarding_tarefas | onboarding_tarefas_template_tarefa_id_fkey | template_tarefa_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_onboarding_template_tarefas_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_onboarding_template_tarefas_template_id ON public.onboarding_template_tarefas USING btree (template_id)` |
| onboarding_template_tarefas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX onboarding_template_tarefas_pkey ON public.onboarding_template_tarefas USING btree (id)` |


## Policies (RLS)

### `Tenant scoped onboarding_template_tarefas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(template_id IN ( SELECT onboarding_templates.id    FROM onboarding_templates   WHERE (onboarding_templates.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(template_id IN ( SELECT onboarding_templates.id    FROM onboarding_templates   WHERE (onboarding_templates.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
