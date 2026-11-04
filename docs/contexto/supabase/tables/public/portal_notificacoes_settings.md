# public.portal_notificacoes_settings

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `email_alertas` | `boolean` | sim | `true` |  |  |
| 4 | `push_alertas` | `boolean` | sim | `true` |  |  |
| 5 | `alertar_ferias` | `boolean` | sim | `true` |  |  |
| 6 | `alertar_holerite` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| portal_notificacoes_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| portal_notificacoes_settings_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| portal_notificacoes_settings_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| portal_notificacoes_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX portal_notificacoes_settings_pkey ON public.portal_notificacoes_settings USING btree (id)` |
| portal_notificacoes_settings_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX portal_notificacoes_settings_user_id_key ON public.portal_notificacoes_settings USING btree (user_id)` |


## Policies (RLS)

### `Users can manage their own portal settings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = user_id)` |
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
