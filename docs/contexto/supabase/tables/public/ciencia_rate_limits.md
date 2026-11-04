# public.ciencia_rate_limits

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
| 2 | `ip_address` | `inet` | não |  |  |  |
| 3 | `rpc_name` | `text` | não |  |  |  |
| 4 | `identifier` | `text` | sim |  |  |  |
| 5 | `success` | `boolean` | não | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ciencia_rate_limits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ciencia_rate_limits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ciencia_rate_limits_pkey ON public.ciencia_rate_limits USING btree (id)` |
| idx_ciencia_rate_limits_verif_contrato | btree | identifier, created_at | não | sim | `(rpc_name = 'contrato_verificar_autenticidade_v2'::text)` | `CREATE INDEX idx_ciencia_rate_limits_verif_contrato ON public.ciencia_rate_limits USING btree (identifier, created_at DESC) WHERE (rpc_name = 'contrato_verificar_autenticidade_v2'::text)` |
| idx_ciencia_rl_created | btree | created_at | não | sim |  | `CREATE INDEX idx_ciencia_rl_created ON public.ciencia_rate_limits USING btree (created_at)` |
| idx_ciencia_rl_ip_time | btree | ip_address, rpc_name, created_at | não | sim |  | `CREATE INDEX idx_ciencia_rl_ip_time ON public.ciencia_rate_limits USING btree (ip_address, rpc_name, created_at DESC)` |


## Policies (RLS)

### `Admins podem auditar rate limits`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
