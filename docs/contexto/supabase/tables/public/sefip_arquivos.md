# public.sefip_arquivos

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
| 3 | `competencia` | `text` | não |  |  |  |
| 4 | `modalidade` | `integer` | sim | `1` |  |  |
| 5 | `status` | `text` | sim | `'rascunho'::text` |  |  |
| 6 | `total_remuneracao` | `numeric` | sim | `0` |  |  |
| 7 | `total_fgts` | `numeric` | sim | `0` |  |  |
| 8 | `total_colaboradores` | `integer` | sim | `0` |  |  |
| 9 | `conteudo` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sefip_arquivos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| sefip_arquivos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sefip_arquivos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_sefip_arquivos_empresa_id ON public.sefip_arquivos USING btree (empresa_id)` |
| sefip_arquivos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sefip_arquivos_pkey ON public.sefip_arquivos USING btree (id)` |


## Policies (RLS)

### `tenant_sefip_arquivos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
