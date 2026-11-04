# public.geo_allowed_countries

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
| 2 | `country_code` | `character varying(2)` | não |  |  |  |
| 3 | `country_name` | `character varying(100)` | não |  |  |  |
| 4 | `added_by` | `uuid` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_allowed_countries_added_by_fkey | FOREIGN KEY | `FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| geo_allowed_countries_country_code_key | UNIQUE | `UNIQUE (country_code)` |  |  | sim |
| geo_allowed_countries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_allowed_countries_country_code_key | btree | country_code | sim | sim |  | `CREATE UNIQUE INDEX geo_allowed_countries_country_code_key ON public.geo_allowed_countries USING btree (country_code)` |
| geo_allowed_countries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_allowed_countries_pkey ON public.geo_allowed_countries USING btree (id)` |
| idx_geo_allowed_countries_added_by | btree | added_by | não | sim |  | `CREATE INDEX idx_geo_allowed_countries_added_by ON public.geo_allowed_countries USING btree (added_by)` |


## Policies (RLS)

### `Admins can manage geo_allowed_countries`

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
