# public.sec_policy_regressions

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
| 2 | `scan_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `tabela` | `text` | não |  |  |  |
| 4 | `policy_name` | `text` | não |  |  |  |
| 5 | `cmd` | `text` | sim |  |  |  |
| 6 | `motivo` | `text` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sec_policy_regressions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sec_policy_regressions_scan_at | btree | scan_at | não | sim |  | `CREATE INDEX idx_sec_policy_regressions_scan_at ON public.sec_policy_regressions USING btree (scan_at DESC)` |
| sec_policy_regressions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sec_policy_regressions_pkey ON public.sec_policy_regressions USING btree (id)` |


## Policies (RLS)

### `sec_policy_regressions_admin_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
