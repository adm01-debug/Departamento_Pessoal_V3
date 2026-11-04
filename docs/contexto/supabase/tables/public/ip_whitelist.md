# public.ip_whitelist

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
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `added_by` | `uuid` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ip_whitelist_added_by_fkey | FOREIGN KEY | `FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ip_whitelist_ip_address_key | UNIQUE | `UNIQUE (ip_address)` |  |  | sim |
| ip_whitelist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ip_whitelist_added_by | btree | added_by | não | sim |  | `CREATE INDEX idx_ip_whitelist_added_by ON public.ip_whitelist USING btree (added_by)` |
| idx_ip_whitelist_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_ip_whitelist_ip ON public.ip_whitelist USING btree (ip_address)` |
| ip_whitelist_ip_address_key | btree | ip_address | sim | sim |  | `CREATE UNIQUE INDEX ip_whitelist_ip_address_key ON public.ip_whitelist USING btree (ip_address)` |
| ip_whitelist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ip_whitelist_pkey ON public.ip_whitelist USING btree (id)` |


## Policies (RLS)

### `Admins can manage IP whitelist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
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
