# public.documentos_pessoais_arquivos

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo_documento` | `text` | não |  |  |  |
| 4 | `arquivo_url` | `text` | sim |  |  |  |
| 5 | `arquivo_nome` | `text` | sim |  |  |  |
| 6 | `arquivo_tamanho` | `bigint` | sim |  |  |  |
| 7 | `created_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `numero` | `text` | sim |  |  |  |
| 11 | `orgao_emissor` | `text` | sim |  |  |  |
| 12 | `data_emissao` | `text` | sim |  |  |  |
| 13 | `data_validade` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| documentos_pessoais_arquivos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_pessoais_arquivos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_pessoais_arquivos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_pessoais_arquivos_pkey ON public.documentos_pessoais_arquivos USING btree (id)` |
| idx_documentos_pessoais_arquivos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_documentos_pessoais_arquivos_colaborador_id ON public.documentos_pessoais_arquivos USING btree (colaborador_id)` |


## Policies (RLS)

### `documentos_pessoais_arquivos_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = documentos_pessoais_arquivos.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = documentos_pessoais_arquivos.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
