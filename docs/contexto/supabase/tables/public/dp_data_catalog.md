# public.dp_data_catalog

> Inventário de dados pessoais (Data Map) — LGPD Art. 37.
Obrigatório manter atualizado. Auditado pelo Encarregado (DPO).

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
| usada por views | public.dp_data_catalog_public |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `table_name` | `text` | não |  |  |  |
| 3 | `column_name` | `text` | não |  |  |  |
| 4 | `sensitivity` | `dp_pii_sensitivity` | não |  |  |  |
| 5 | `lgpd_category` | `text` | não |  |  |  |
| 6 | `legal_basis` | `text` | não |  |  |  |
| 7 | `data_subject` | `text` | não | `'colaborador'::text` |  |  |
| 8 | `retention_days` | `integer` | sim |  |  |  |
| 9 | `encrypted` | `boolean` | não | `false` |  |  |
| 10 | `masking_rule` | `text` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_data_catalog_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dp_data_catalog_table_name_column_name_key | UNIQUE | `UNIQUE (table_name, column_name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_data_catalog_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_data_catalog_pkey ON public.dp_data_catalog USING btree (id)` |
| dp_data_catalog_sensitivity_idx | btree | sensitivity | não | sim |  | `CREATE INDEX dp_data_catalog_sensitivity_idx ON public.dp_data_catalog USING btree (sensitivity)` |
| dp_data_catalog_table_idx | btree | table_name | não | sim |  | `CREATE INDEX dp_data_catalog_table_idx ON public.dp_data_catalog USING btree (table_name)` |
| dp_data_catalog_table_name_column_name_key | btree | table_name, column_name | sim | sim |  | `CREATE UNIQUE INDEX dp_data_catalog_table_name_column_name_key ON public.dp_data_catalog USING btree (table_name, column_name)` |


## Policies (RLS)

### `rh_readonly`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((auth.jwt() ->> 'role'::text) = ANY (ARRAY['rh'::text, 'admin'::text, 'auditoria'::text]))` |
| WITH CHECK |  |

### `service_role_full`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| dp_data_catalog_audit | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.dp_track_pii_access |
| dp_data_catalog_updated_at | BEFORE | UPDATE | ROW | enabled | public.dp_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | INSERT, SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
