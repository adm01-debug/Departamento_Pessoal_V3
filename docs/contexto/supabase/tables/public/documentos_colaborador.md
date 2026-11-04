# public.documentos_colaborador

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `nome_arquivo` | `text` | não |  |  |  |
| 5 | `url` | `text` | não |  |  |  |
| 6 | `tamanho_bytes` | `integer` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `created_by` | `uuid` | sim |  |  |  |
| 9 | `hash_validacao` | `text` | sim |  |  |  |
| 10 | `verificado_ia` | `boolean` | sim | `false` |  |  |
| 11 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| documentos_colaborador_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_colaborador_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| documentos_colaborador_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| documentos_colaborador_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| documentos_tamanho_nao_negativo | CHECK | `CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_colaborador_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_colaborador_pkey ON public.documentos_colaborador USING btree (id)` |
| idx_documentos_colaborador_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_documentos_colaborador_colaborador_id ON public.documentos_colaborador USING btree (colaborador_id)` |
| idx_documentos_colaborador_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_documentos_colaborador_created_by ON public.documentos_colaborador USING btree (created_by)` |
| idx_documentos_colaborador_empresa | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX idx_documentos_colaborador_empresa ON public.documentos_colaborador USING btree (empresa_id) WHERE (empresa_id IS NOT NULL)` |


## Policies (RLS)

### `documentos_colaborador_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = documentos_colaborador.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = documentos_colaborador.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |

### `documentos_colaborador_self_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `sou_o_colaborador(colaborador_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sync_empresa_colaborador | BEFORE | INSERT OR UPDATE | ROW | enabled | public.dp_sync_empresa_from_colaborador |
| update_documentos_colaborador_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
