# public.configuracoes_esocial

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
| 3 | `ambiente` | `text` | sim | `'2'::text` |  |  |
| 4 | `certificado_id` | `uuid` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| configuracoes_esocial_ambiente_check | CHECK | `CHECK (ambiente = ANY (ARRAY['1'::text, '2'::text]))` |  |  | sim |
| configuracoes_esocial_certificado_id_fkey | FOREIGN KEY | `FOREIGN KEY (certificado_id) REFERENCES certificados_digitais(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| configuracoes_esocial_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| configuracoes_esocial_empresa_id_key | UNIQUE | `UNIQUE (empresa_id)` |  |  | sim |
| configuracoes_esocial_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| configuracoes_esocial_empresa_id_key | btree | empresa_id | sim | sim |  | `CREATE UNIQUE INDEX configuracoes_esocial_empresa_id_key ON public.configuracoes_esocial USING btree (empresa_id)` |
| configuracoes_esocial_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX configuracoes_esocial_pkey ON public.configuracoes_esocial USING btree (id)` |
| idx_configuracoes_esocial_certificado_id | btree | certificado_id | não | sim |  | `CREATE INDEX idx_configuracoes_esocial_certificado_id ON public.configuracoes_esocial USING btree (certificado_id)` |


## Policies (RLS)

### `Empresas podem gerenciar suas configurações de eSocial`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT user_empresas.user_id    FROM user_empresas   WHERE (user_empresas.empresa_id = configuracoes_esocial.empresa_id)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_config_esocial | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| update_configuracoes_esocial_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
