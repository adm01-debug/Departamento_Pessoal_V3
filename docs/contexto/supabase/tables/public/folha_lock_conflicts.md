# public.folha_lock_conflicts

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
| 2 | `folha_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `competencia` | `text` | sim |  |  |  |
| 5 | `version_esperada` | `integer` | não |  |  |  |
| 6 | `version_atual` | `integer` | não |  |  |  |
| 7 | `user_id` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| folha_lock_conflicts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| folha_lock_conflicts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX folha_lock_conflicts_pkey ON public.folha_lock_conflicts USING btree (id)` |
| idx_folha_lock_conflicts_folha | btree | folha_id, created_at | não | sim |  | `CREATE INDEX idx_folha_lock_conflicts_folha ON public.folha_lock_conflicts USING btree (folha_id, created_at DESC)` |


## Policies (RLS)

### `admins veem conflitos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |

### `sistema registra conflitos`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = folha_lock_conflicts.folha_id) AND (f.empresa_id IN ( SELECT get_user_scope_empresas(auth.uid()) AS get_user_scope_empresas))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_folha_lock_conflicts_ao | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
