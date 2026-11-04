# public.documentos

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `tipo` | `text` | não |  |  |  |
| 5 | `url` | `text` | sim |  |  |  |
| 6 | `validado` | `boolean` | sim | `false` |  |  |
| 7 | `validado_por` | `uuid` | sim |  |  |  |
| 8 | `data_validade` | `date` | sim |  |  |  |
| 9 | `observacoes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| documentos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| documentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.documentos_historico | documentos_historico_documento_id_fkey | documento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_empresa_id_idx | btree | empresa_id | não | sim | `(empresa_id IS NOT NULL)` | `CREATE INDEX documentos_empresa_id_idx ON public.documentos USING btree (empresa_id) WHERE (empresa_id IS NOT NULL)` |
| documentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_pkey ON public.documentos USING btree (id)` |
| idx_documentos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_documentos_colaborador_id ON public.documentos USING btree (colaborador_id)` |


## Policies (RLS)

### `documentos_rh_empresa_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((colaborador_id IS NULL) AND (empresa_id IS NOT NULL) AND pode_gerir_rh(empresa_id))` |
| WITH CHECK | `((colaborador_id IS NULL) AND (empresa_id IS NOT NULL) AND pode_gerir_rh(empresa_id))` |

### `tenant_documentos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_documentos_sync_empresa_id | BEFORE | INSERT OR UPDATE | ROW | enabled | public.documentos_sync_empresa_id |
| trg_sync_empresa_colaborador | BEFORE | INSERT OR UPDATE | ROW | enabled | public.dp_sync_empresa_from_colaborador |
| update_documentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
