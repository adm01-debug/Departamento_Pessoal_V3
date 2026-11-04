# public.pcs_grades

> Transactionally generated salary ranges for a PCS plan.

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
| 2 | `plano_id` | `uuid` | não |  |  |  |
| 3 | `ordem` | `integer` | não |  |  |  |
| 4 | `nome` | `text` | não |  |  |  |
| 5 | `pontos_min` | `numeric(14,4)` | não |  |  |  |
| 6 | `pontos_max` | `numeric(14,4)` | não |  |  |  |
| 7 | `salario_min` | `numeric(14,2)` | não |  |  |  |
| 8 | `salario_medio` | `numeric(14,2)` | não |  |  |  |
| 9 | `salario_max` | `numeric(14,2)` | não |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pcs_grades_nome_check | CHECK | `CHECK (length(btrim(nome)) >= 1 AND length(btrim(nome)) <= 160)` |  |  | sim |
| pcs_grades_ordem_check | CHECK | `CHECK (ordem > 0)` |  |  | sim |
| pcs_grades_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pcs_grades_plano_id_fkey | FOREIGN KEY | `FOREIGN KEY (plano_id) REFERENCES pcs_planos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pcs_grades_plano_id_ordem_key | UNIQUE | `UNIQUE (plano_id, ordem)` |  |  | sim |
| pcs_grades_pontos_coerentes | CHECK | `CHECK (pontos_max > pontos_min)` |  |  | sim |
| pcs_grades_salario_max_check | CHECK | `CHECK (salario_max >= 0::numeric)` |  |  | sim |
| pcs_grades_salario_medio_check | CHECK | `CHECK (salario_medio >= 0::numeric)` |  |  | sim |
| pcs_grades_salario_min_check | CHECK | `CHECK (salario_min >= 0::numeric)` |  |  | sim |
| pcs_grades_salarios_coerentes | CHECK | `CHECK (salario_max >= salario_medio AND salario_medio >= salario_min)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pcs_grades_plano | btree | plano_id, ordem | não | sim |  | `CREATE INDEX idx_pcs_grades_plano ON public.pcs_grades USING btree (plano_id, ordem)` |
| pcs_grades_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pcs_grades_pkey ON public.pcs_grades USING btree (id)` |
| pcs_grades_plano_id_ordem_key | btree | plano_id, ordem | sim | sim |  | `CREATE UNIQUE INDEX pcs_grades_plano_id_ordem_key ON public.pcs_grades USING btree (plano_id, ordem)` |


## Policies (RLS)

### `pcs_grades_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pcs_pode_ver_plano(plano_id)` |
| WITH CHECK |  |

### `pcs_grades_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pcs_pode_gerir_plano(plano_id)` |
| WITH CHECK | `pcs_pode_gerir_plano(plano_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pcs_grades_updated_at | BEFORE | UPDATE | ROW | enabled | public.pcs_touch_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
