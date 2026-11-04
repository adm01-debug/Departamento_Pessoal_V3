# public.password_policies

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
| 2 | `min_length` | `integer` | sim | `8` |  |  |
| 3 | `require_uppercase` | `boolean` | sim | `true` |  |  |
| 4 | `require_lowercase` | `boolean` | sim | `true` |  |  |
| 5 | `require_numbers` | `boolean` | sim | `true` |  |  |
| 6 | `require_special_chars` | `boolean` | sim | `true` |  |  |
| 7 | `max_age_days` | `integer` | sim | `90` |  |  |
| 8 | `prevent_reuse_count` | `integer` | sim | `5` |  |  |
| 9 | `lockout_attempts` | `integer` | sim | `5` |  |  |
| 10 | `lockout_duration_minutes` | `integer` | sim | `30` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_policies_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| password_policies_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_policies_pkey ON public.password_policies USING btree (id)` |


## Policies (RLS)

### `Admins can manage password policies`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `All can read password policies`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
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
