# public.afdt_registros_raw

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
| 2 | `importacao_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `nsr` | `bigint` | sim |  |  |  |
| 5 | `tipo_registro` | `text` | sim |  |  |  |
| 6 | `linha_numero` | `integer` | sim |  |  |  |
| 7 | `data_hora_marcacao` | `timestamp with time zone` | sim |  |  |  |
| 8 | `cpf` | `text` | sim |  |  |  |
| 9 | `pis` | `text` | sim |  |  |  |
| 10 | `colaborador_id` | `uuid` | sim |  |  |  |
| 11 | `conteudo_original` | `text` | sim |  |  |  |
| 12 | `erro` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| afdt_registros_raw_importacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (importacao_id) REFERENCES afdt_importacoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| afdt_registros_raw_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.afdt_divergencias | afdt_divergencias_registro_raw_id_fkey | registro_raw_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| afdt_registros_raw_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX afdt_registros_raw_pkey ON public.afdt_registros_raw USING btree (id)` |
| idx_afdt_raw_cpf | btree | empresa_id, cpf | não | sim | `(cpf IS NOT NULL)` | `CREATE INDEX idx_afdt_raw_cpf ON public.afdt_registros_raw USING btree (empresa_id, cpf) WHERE (cpf IS NOT NULL)` |
| idx_afdt_raw_data | btree | empresa_id, data_hora_marcacao | não | sim | `(data_hora_marcacao IS NOT NULL)` | `CREATE INDEX idx_afdt_raw_data ON public.afdt_registros_raw USING btree (empresa_id, data_hora_marcacao) WHERE (data_hora_marcacao IS NOT NULL)` |
| idx_afdt_raw_imp | btree | importacao_id | não | sim |  | `CREATE INDEX idx_afdt_raw_imp ON public.afdt_registros_raw USING btree (importacao_id)` |


## Policies (RLS)

### `afdt_raw_tenant_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |
| WITH CHECK | `(empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid())))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
