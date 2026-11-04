# public.dp_retention_policy

> Politicas retencao LGPD. dry_run+disabled por padrao — ativar somente apos validar.

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
| 2 | `table_name` | `text` | não |  |  |  |
| 3 | `retention_days` | `integer` | não |  |  |  |
| 4 | `action` | `text` | não | `'anonymize'::text` |  |  |
| 5 | `target_columns` | `jsonb` | sim |  |  |  |
| 6 | `dry_run` | `boolean` | não | `true` |  |  |
| 7 | `enabled` | `boolean` | não | `false` |  |  |
| 8 | `last_run_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `last_run_count` | `integer` | sim |  |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dp_ret_action | CHECK | `CHECK (action = ANY (ARRAY['anonymize'::text, 'delete'::text, 'archive'::text]))` |  |  | sim |
| dp_ret_days | CHECK | `CHECK (retention_days > 0 AND retention_days <= 3650)` |  |  | sim |
| dp_retention_policy_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| dp_retention_policy_table_name_retention_days_action_key | UNIQUE | `UNIQUE (table_name, retention_days, action)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dp_retention_policy_enabled_idx | btree | table_name | não | sim | `(enabled = true)` | `CREATE INDEX dp_retention_policy_enabled_idx ON public.dp_retention_policy USING btree (table_name) WHERE (enabled = true)` |
| dp_retention_policy_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dp_retention_policy_pkey ON public.dp_retention_policy USING btree (id)` |
| dp_retention_policy_table_name_retention_days_action_key | btree | table_name, retention_days, action | sim | sim |  | `CREATE UNIQUE INDEX dp_retention_policy_table_name_retention_days_action_key ON public.dp_retention_policy USING btree (table_name, retention_days, action)` |


## Policies (RLS)

### `service_role_only_retention`

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
| dp_retention_updated_at | BEFORE | UPDATE | ROW | enabled | public.dp_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
