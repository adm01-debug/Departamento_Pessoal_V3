# public.sst_ltcat_laudos

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
| 4 | `data_emissao` | `date` | não | `CURRENT_DATE` |  |  |
| 5 | `data_validade` | `date` | sim |  |  |  |
| 6 | `ghes_avaliados` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `agentes_nocivos` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `medicoes` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 9 | `conclusao` | `text` | sim |  |  |  |
| 10 | `aposentadoria_especial` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 11 | `responsavel_tecnico_nome` | `text` | não |  |  |  |
| 12 | `responsavel_tecnico_registro` | `text` | não |  |  |  |
| 13 | `responsavel_tecnico_tipo` | `text` | sim |  |  |  |
| 14 | `arquivo_path` | `text` | sim |  |  |  |
| 15 | `hash_sha256` | `text` | sim |  |  |  |
| 16 | `versao` | `integer` | não | `1` |  |  |
| 17 | `status` | `text` | não | `'ativo'::text` |  |  |
| 18 | `gerado_por` | `uuid` | sim |  |  |  |
| 19 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 20 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sst_ltcat_laudos_gerado_por_fkey | FOREIGN KEY | `FOREIGN KEY (gerado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sst_ltcat_laudos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_ltcat_laudos_responsavel_tecnico_tipo_check | CHECK | `CHECK (responsavel_tecnico_tipo = ANY (ARRAY['engenheiro'::text, 'medico'::text]))` |  |  | sim |
| sst_ltcat_laudos_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'ativo'::text, 'arquivado'::text, 'revisao'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ltcat_ativo_unico | btree | empresa_id | sim | sim | `(status = 'ativo'::text)` | `CREATE UNIQUE INDEX idx_ltcat_ativo_unico ON public.sst_ltcat_laudos USING btree (empresa_id) WHERE (status = 'ativo'::text)` |
| idx_ltcat_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ltcat_empresa ON public.sst_ltcat_laudos USING btree (empresa_id)` |
| idx_ltcat_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_ltcat_status ON public.sst_ltcat_laudos USING btree (empresa_id, status)` |
| idx_sst_ltcat_gerado_por | btree | gerado_por | não | sim |  | `CREATE INDEX idx_sst_ltcat_gerado_por ON public.sst_ltcat_laudos USING btree (gerado_por)` |
| sst_ltcat_laudos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_ltcat_laudos_pkey ON public.sst_ltcat_laudos USING btree (id)` |


## Policies (RLS)

### `LTCAT gerenciável por admin/rh`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = sst_ltcat_laudos.empresa_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = sst_ltcat_laudos.empresa_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |

### `LTCAT visível para membros da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = sst_ltcat_laudos.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ltcat_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
