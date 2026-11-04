# public.configuracoes_intervalo

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
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `duracao_minutos` | `integer` | não | `60` |  |  |
| 5 | `tipo` | `text` | não | `'almoco'::text` |  |  |
| 6 | `obrigatorio` | `boolean` | sim | `true` |  |  |
| 7 | `horario_inicio_permitido` | `time without time zone` | sim |  |  |  |
| 8 | `horario_fim_permitido` | `time without time zone` | sim |  |  |  |
| 9 | `ativo` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| configuracoes_intervalo_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| configuracoes_intervalo_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| configuracoes_intervalo_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX configuracoes_intervalo_pkey ON public.configuracoes_intervalo USING btree (id)` |
| idx_configuracoes_intervalo_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_configuracoes_intervalo_empresa_id ON public.configuracoes_intervalo USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_configuracoes_intervalo`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_updated_at_config_intervalo | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| update_configuracoes_intervalo_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
