# public.bitrix24_config

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
| 1 | `id` | `integer` | não | `nextval('bitrix24_config_id_seq'::regclass)` |  |  |
| 2 | `habilitado` | `boolean` | sim | `false` |  |  |
| 3 | `intervalo_minutos` | `integer` | sim | `60` |  |  |
| 4 | `horario_inicio` | `character varying(5)` | sim |  |  |  |
| 5 | `horario_fim` | `character varying(5)` | sim |  |  |  |
| 6 | `dias_semana` | `integer[]` | sim |  |  |  |
| 7 | `sync_colaboradores` | `boolean` | sim | `true` |  |  |
| 8 | `sync_departamentos` | `boolean` | sim | `true` |  |  |
| 9 | `sync_cargos` | `boolean` | sim | `false` |  |  |
| 10 | `notificar_erros` | `boolean` | sim | `true` |  |  |
| 11 | `notificar_sucesso` | `boolean` | sim | `false` |  |  |
| 12 | `max_tentativas` | `integer` | sim | `3` |  |  |
| 13 | `ultima_execucao` | `timestamp with time zone` | sim |  |  |  |
| 14 | `proxima_execucao` | `timestamp with time zone` | sim |  |  |  |
| 15 | `webhook_url` | `text` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix24_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix24_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix24_config_pkey ON public.bitrix24_config USING btree (id)` |


## Policies (RLS)

### `Admins can manage bitrix24_config`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK | `is_admin(auth.uid())` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
