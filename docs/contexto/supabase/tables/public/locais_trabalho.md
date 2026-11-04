# public.locais_trabalho

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
| 4 | `endereco` | `text` | sim |  |  |  |
| 5 | `cidade` | `text` | sim |  |  |  |
| 6 | `uf` | `text` | sim |  |  |  |
| 7 | `cep` | `text` | sim |  |  |  |
| 8 | `pais` | `text` | sim | `'BR'::text` |  |  |
| 9 | `telefone` | `text` | sim |  |  |  |
| 10 | `ativo` | `boolean` | sim | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `latitude` | `numeric` | sim |  |  |  |
| 14 | `longitude` | `numeric` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| locais_trabalho_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| locais_trabalho_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sst_extintores | sst_extintores_local_trabalho_id_fkey | local_trabalho_id | SET NULL |
| public.sst_riscos_ambientais | sst_riscos_ambientais_local_id_fkey | local_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_locais_trabalho_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_locais_trabalho_empresa_id ON public.locais_trabalho USING btree (empresa_id)` |
| locais_trabalho_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX locais_trabalho_pkey ON public.locais_trabalho USING btree (id)` |


## Policies (RLS)

### `tenant_locais_trabalho`

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
| update_locais_trabalho_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
