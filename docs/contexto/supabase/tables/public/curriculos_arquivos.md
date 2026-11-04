# public.curriculos_arquivos

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
| 3 | `candidato_id` | `uuid` | não |  |  |  |
| 4 | `file_path` | `text` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| curriculos_arquivos_candidato_id_fkey | FOREIGN KEY | `FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| curriculos_arquivos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| curriculos_arquivos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| curriculos_arquivos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX curriculos_arquivos_pkey ON public.curriculos_arquivos USING btree (id)` |
| idx_curriculos_arquivos_candidato_id | btree | candidato_id | não | sim |  | `CREATE INDEX idx_curriculos_arquivos_candidato_id ON public.curriculos_arquivos USING btree (candidato_id)` |
| idx_curriculos_arquivos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_curriculos_arquivos_empresa_id ON public.curriculos_arquivos USING btree (empresa_id)` |


## Policies (RLS)

### `empresa_isolation_curriculos_arquivos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id = get_auth_empresa_id())` |
| WITH CHECK | `(empresa_id = get_auth_empresa_id())` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
