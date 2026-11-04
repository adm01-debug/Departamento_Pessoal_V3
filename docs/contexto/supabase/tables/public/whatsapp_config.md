# public.whatsapp_config

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `instancia_url` | `text` | sim |  |  |  |
| 4 | `api_key` | `text` | sim |  |  |  |
| 5 | `instancia_nome` | `text` | sim |  |  |  |
| 6 | `status` | `text` | sim | `'desconectado'::text` |  |  |
| 7 | `notificar_ponto` | `boolean` | sim | `false` |  |  |
| 8 | `notificar_ferias` | `boolean` | sim | `false` |  |  |
| 9 | `notificar_holerite` | `boolean` | sim | `false` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| whatsapp_config_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| whatsapp_config_empresa_id_key | UNIQUE | `UNIQUE (empresa_id)` |  |  | sim |
| whatsapp_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| whatsapp_config_empresa_id_key | btree | empresa_id | sim | sim |  | `CREATE UNIQUE INDEX whatsapp_config_empresa_id_key ON public.whatsapp_config USING btree (empresa_id)` |
| whatsapp_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX whatsapp_config_pkey ON public.whatsapp_config USING btree (id)` |


## Policies (RLS)

### `Empresas gerenciam seu próprio WhatsApp`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_empresas.user_id    FROM user_empresas   WHERE (user_empresas.empresa_id = whatsapp_config.empresa_id)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_whatsapp_config_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
