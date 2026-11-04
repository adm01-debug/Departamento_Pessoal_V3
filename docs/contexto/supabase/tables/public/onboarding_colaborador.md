# public.onboarding_colaborador

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `template_id` | `uuid` | sim |  |  |  |
| 4 | `data_inicio` | `date` | não | `CURRENT_DATE` |  |  |
| 5 | `data_conclusao` | `date` | sim |  |  |  |
| 6 | `status` | `text` | não | `'em_andamento'::text` |  |  |
| 7 | `progresso` | `integer` | sim | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `created_by` | `uuid` | sim |  |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| onboarding_colaborador_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| onboarding_colaborador_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| onboarding_colaborador_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| onboarding_colaborador_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| onboarding_colaborador_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES onboarding_templates(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.onboarding_documentos_obrigatorios | onboarding_documentos_obrigatorios_onboarding_id_fkey | onboarding_id | CASCADE |
| public.onboarding_tarefas | onboarding_tarefas_onboarding_id_fkey | onboarding_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_onboarding_colab | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_onboarding_colab ON public.onboarding_colaborador USING btree (colaborador_id)` |
| idx_onboarding_colaborador_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_onboarding_colaborador_colaborador_id ON public.onboarding_colaborador USING btree (colaborador_id)` |
| idx_onboarding_colaborador_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_onboarding_colaborador_created_by ON public.onboarding_colaborador USING btree (created_by)` |
| idx_onboarding_colaborador_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_onboarding_colaborador_empresa_id ON public.onboarding_colaborador USING btree (empresa_id)` |
| idx_onboarding_colaborador_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_onboarding_colaborador_template_id ON public.onboarding_colaborador USING btree (template_id)` |
| onboarding_colaborador_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX onboarding_colaborador_pkey ON public.onboarding_colaborador USING btree (id)` |


## Policies (RLS)

### `Multi-tenant access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id = auth.uid()) OR (( SELECT c.empresa_id    FROM colaboradores c   WHERE (c.id = auth.uid())) = empresa_id))` |
| WITH CHECK |  |

### `Tenant scoped onboarding_colaborador`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_onboarding_colaborador | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| update_onboarding_colaborador_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
