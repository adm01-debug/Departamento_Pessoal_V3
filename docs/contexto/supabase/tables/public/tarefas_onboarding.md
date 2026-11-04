# public.tarefas_onboarding

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
| 2 | `admissao_id` | `uuid` | sim |  |  |  |
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `responsavel_id` | `uuid` | sim |  |  |  |
| 6 | `prazo_dias` | `integer` | sim | `5` |  |  |
| 7 | `concluida` | `boolean` | sim | `false` |  |  |
| 8 | `concluida_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tarefas_onboarding_admissao_id_fkey | FOREIGN KEY | `FOREIGN KEY (admissao_id) REFERENCES admissoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| tarefas_onboarding_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tarefas_onboarding_responsavel_id_fkey | FOREIGN KEY | `FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tarefas_onboarding_admissao_id | btree | admissao_id | não | sim |  | `CREATE INDEX idx_tarefas_onboarding_admissao_id ON public.tarefas_onboarding USING btree (admissao_id)` |
| idx_tarefas_onboarding_responsavel_id | btree | responsavel_id | não | sim |  | `CREATE INDEX idx_tarefas_onboarding_responsavel_id ON public.tarefas_onboarding USING btree (responsavel_id)` |
| tarefas_onboarding_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tarefas_onboarding_pkey ON public.tarefas_onboarding USING btree (id)` |


## Policies (RLS)

### `Tenant scoped onboarding tasks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM admissoes a   WHERE ((a.id = tarefas_onboarding.admissao_id) AND (a.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
