# public.personnel_budget

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `departamento` | `text` | não |  |  |  |
| 4 | `ano` | `integer` | não |  |  |  |
| 5 | `mes` | `integer` | não |  |  |  |
| 6 | `valor_orcado` | `numeric(15,2)` | não | `0` |  |  |
| 7 | `descricao` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| personnel_budget_empresa_id_departamento_ano_mes_key | UNIQUE | `UNIQUE (empresa_id, departamento, ano, mes)` |  |  | sim |
| personnel_budget_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| personnel_budget_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| personnel_budget_empresa_id_departamento_ano_mes_key | btree | empresa_id, departamento, ano, mes | sim | sim |  | `CREATE UNIQUE INDEX personnel_budget_empresa_id_departamento_ano_mes_key ON public.personnel_budget USING btree (empresa_id, departamento, ano, mes)` |
| personnel_budget_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX personnel_budget_pkey ON public.personnel_budget USING btree (id)` |


## Policies (RLS)

### `Users can manage budgets of their own company`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (personnel_budget.empresa_id = personnel_budget.empresa_id))))` |
| WITH CHECK |  |

### `Users can view budgets of their own company`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (personnel_budget.empresa_id = personnel_budget.empresa_id))))` |
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
