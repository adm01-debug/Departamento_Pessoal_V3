# public.bitrix24_sync_logs

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
| 2 | `tipo` | `character varying(50)` | não |  |  |  |
| 3 | `direcao` | `character varying(50)` | não |  |  |  |
| 4 | `registros_processados` | `integer` | sim | `0` |  |  |
| 5 | `registros_sucesso` | `integer` | sim | `0` |  |  |
| 6 | `registros_erro` | `integer` | sim | `0` |  |  |
| 7 | `sucesso` | `integer` | sim | `0` |  |  |
| 8 | `erros` | `integer` | sim | `0` |  |  |
| 9 | `conflitos` | `integer` | sim | `0` |  |  |
| 10 | `detalhes` | `jsonb` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix24_sync_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix24_sync_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix24_sync_logs_pkey ON public.bitrix24_sync_logs USING btree (id)` |


## Policies (RLS)

### `Admins can view bitrix24_sync_logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `bitrix24_sync_logs_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(auth.uid() IS NOT NULL)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_bitrix24_sync_logs_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_bitrix24_sync_logs_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
