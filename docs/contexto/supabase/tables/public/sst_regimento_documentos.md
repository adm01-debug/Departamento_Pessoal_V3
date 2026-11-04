# public.sst_regimento_documentos

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `conteudo_html` | `text` | não |  |  |  |
| 5 | `versao` | `integer` | não | `1` |  |  |
| 6 | `status` | `text` | não | `'RASCUNHO'::text` |  |  |
| 7 | `hash_sha256` | `text` | sim |  |  |  |
| 8 | `publicado_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `publicado_por` | `uuid` | sim |  |  |  |
| 10 | `observacoes` | `text` | sim |  |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_regimento_documentos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| sst_regimento_documentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_regimento_documentos_status_check | CHECK | `CHECK (status = ANY (ARRAY['RASCUNHO'::text, 'PUBLICADO'::text, 'ARQUIVADO'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.sst_regimento_assinaturas | sst_regimento_assinaturas_documento_id_fkey | documento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_regimento_doc_empresa | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_regimento_doc_empresa ON public.sst_regimento_documentos USING btree (empresa_id, status)` |
| sst_regimento_documentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_regimento_documentos_pkey ON public.sst_regimento_documentos USING btree (id)` |
| uniq_regimento_publicado | btree | empresa_id | sim | sim | `(status = 'PUBLICADO'::text)` | `CREATE UNIQUE INDEX uniq_regimento_publicado ON public.sst_regimento_documentos USING btree (empresa_id) WHERE (status = 'PUBLICADO'::text)` |


## Policies (RLS)

### `Leitura por empresa do usuario`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid())))` |
| WITH CHECK |  |

### `RH/Admin gerenciam documentos`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid()))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `((empresa_id IN ( SELECT user_empresas.empresa_id    FROM user_empresas   WHERE (user_empresas.user_id = auth.uid()))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_regimento_doc_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
