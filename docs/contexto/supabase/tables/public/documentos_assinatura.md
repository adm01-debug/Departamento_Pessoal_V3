# public.documentos_assinatura

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo_documento` | `text` | não |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `conteudo_url` | `text` | sim |  |  |  |
| 6 | `status` | `text` | não | `'pendente'::text` |  |  |
| 7 | `assinatura_base64` | `text` | sim |  |  |  |
| 8 | `assinado_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `assinado_por` | `uuid` | sim |  |  |  |
| 10 | `ip_assinatura` | `text` | sim |  |  |  |
| 11 | `hash_documento` | `text` | sim |  |  |  |
| 12 | `empresa_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `created_by` | `uuid` | sim |  |  |  |
| 15 | `validade_assinatura` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| documentos_assinatura_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| documentos_assinatura_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| documentos_assinatura_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| documentos_assinatura_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'assinado'::text, 'cancelado'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| documentos_assinatura_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX documentos_assinatura_pkey ON public.documentos_assinatura USING btree (id)` |
| idx_documentos_assinatura_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_documentos_assinatura_colaborador ON public.documentos_assinatura USING btree (colaborador_id)` |
| idx_documentos_assinatura_created | btree | created_at | não | sim |  | `CREATE INDEX idx_documentos_assinatura_created ON public.documentos_assinatura USING btree (created_at DESC)` |
| idx_documentos_assinatura_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_documentos_assinatura_empresa_id ON public.documentos_assinatura USING btree (empresa_id)` |
| idx_documentos_assinatura_status | btree | status | não | sim |  | `CREATE INDEX idx_documentos_assinatura_status ON public.documentos_assinatura USING btree (status)` |


## Policies (RLS)

### `Assinaturas acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |

### `documentos_assinatura_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `tenant_documentos_assinatura`

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
| set_timestamp_documentos_assinatura | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| tr_enforce_documento_assinatura_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_documento_assinatura_hash |
| tr_impedir_alteracao_documento_assinado | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_documento_assinado |
| tr_proibir_delete_documento_assinado | BEFORE | DELETE | ROW | enabled | public.proibir_delete_documento_assinado |
| update_documentos_assinatura_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
