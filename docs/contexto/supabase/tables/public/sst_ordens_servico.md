# public.sst_ordens_servico

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
| 3 | `escopo` | `text` | não |  |  |  |
| 4 | `cargo_id` | `uuid` | sim |  |  |  |
| 5 | `colaborador_id` | `uuid` | sim |  |  |  |
| 6 | `titulo` | `text` | não |  |  |  |
| 7 | `descricao_atividades` | `text` | sim |  |  |  |
| 8 | `riscos` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 9 | `medidas_controle` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 10 | `epis_obrigatorios` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 11 | `procedimentos_emergencia` | `text` | sim |  |  |  |
| 12 | `penalidades_descumprimento` | `text` | sim |  |  |  |
| 13 | `responsavel_nome` | `text` | sim |  |  |  |
| 14 | `responsavel_cargo` | `text` | sim |  |  |  |
| 15 | `responsavel_registro` | `text` | sim |  |  |  |
| 16 | `arquivo_path` | `text` | sim |  |  |  |
| 17 | `hash_sha256` | `text` | sim |  |  |  |
| 18 | `versao` | `integer` | não | `1` |  |  |
| 19 | `status` | `text` | não | `'ativa'::text` |  |  |
| 20 | `gerado_por` | `uuid` | sim |  |  |  |
| 21 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 22 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 23 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_os_escopo | CHECK | `CHECK (escopo = 'cargo'::text AND cargo_id IS NOT NULL OR escopo = 'colaborador'::text AND colaborador_id IS NOT NULL)` |  |  | sim |
| sst_ordens_servico_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_ordens_servico_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| sst_ordens_servico_escopo_check | CHECK | `CHECK (escopo = ANY (ARRAY['cargo'::text, 'colaborador'::text]))` |  |  | sim |
| sst_ordens_servico_gerado_por_fkey | FOREIGN KEY | `FOREIGN KEY (gerado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| sst_ordens_servico_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sst_ordens_servico_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'ativa'::text, 'arquivada'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sst_os_cargo | btree | cargo_id | não | sim | `(cargo_id IS NOT NULL)` | `CREATE INDEX idx_sst_os_cargo ON public.sst_ordens_servico USING btree (cargo_id) WHERE (cargo_id IS NOT NULL)` |
| idx_sst_os_colab | btree | colaborador_id | não | sim | `(colaborador_id IS NOT NULL)` | `CREATE INDEX idx_sst_os_colab ON public.sst_ordens_servico USING btree (colaborador_id) WHERE (colaborador_id IS NOT NULL)` |
| idx_sst_os_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_sst_os_empresa ON public.sst_ordens_servico USING btree (empresa_id)` |
| idx_sst_os_gerado_por | btree | gerado_por | não | sim |  | `CREATE INDEX idx_sst_os_gerado_por ON public.sst_ordens_servico USING btree (gerado_por)` |
| idx_sst_os_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_sst_os_status ON public.sst_ordens_servico USING btree (empresa_id, status)` |
| sst_ordens_servico_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sst_ordens_servico_pkey ON public.sst_ordens_servico USING btree (id)` |


## Policies (RLS)

### `OS gerenciáveis por admin/rh`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = sst_ordens_servico.empresa_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = sst_ordens_servico.empresa_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |

### `OS visíveis para membros da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = sst_ordens_servico.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sst_os_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
