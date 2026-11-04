# public.epis_fichas

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
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `responsavel_id` | `uuid` | sim |  |  |  |
| 5 | `responsavel_nome` | `text` | não |  |  |  |
| 6 | `tipo_movimento` | `text` | não | `'entrega'::text` |  |  |
| 7 | `motivo` | `text` | sim |  |  |  |
| 8 | `observacoes` | `text` | sim |  |  |  |
| 9 | `evidencia_foto_path` | `text` | sim |  |  |  |
| 10 | `status` | `text` | não | `'pendente'::text` |  |  |
| 11 | `assinada_em` | `timestamp with time zone` | sim |  |  |  |
| 12 | `hash_sha256` | `text` | sim |  |  |  |
| 13 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| epis_fichas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| epis_fichas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| epis_fichas_responsavel_id_fkey | FOREIGN KEY | `FOREIGN KEY (responsavel_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| epis_fichas_status_check | CHECK | `CHECK (status = ANY (ARRAY['pendente'::text, 'assinada'::text, 'recusada'::text, 'cancelada'::text]))` |  |  | sim |
| epis_fichas_tipo_movimento_check | CHECK | `CHECK (tipo_movimento = ANY (ARRAY['entrega'::text, 'devolucao'::text, 'substituicao'::text, 'recusa'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.epis_fichas_assinaturas | epis_fichas_assinaturas_ficha_id_fkey | ficha_id | CASCADE |
| public.epis_fichas_itens | epis_fichas_itens_ficha_id_fkey | ficha_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| epis_fichas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX epis_fichas_pkey ON public.epis_fichas USING btree (id)` |
| idx_epis_fichas_colab | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_epis_fichas_colab ON public.epis_fichas USING btree (colaborador_id)` |
| idx_epis_fichas_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_epis_fichas_empresa ON public.epis_fichas USING btree (empresa_id)` |
| idx_epis_fichas_responsavel_id | btree | responsavel_id | não | sim |  | `CREATE INDEX idx_epis_fichas_responsavel_id ON public.epis_fichas USING btree (responsavel_id)` |
| idx_epis_fichas_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_epis_fichas_status ON public.epis_fichas USING btree (empresa_id, status)` |


## Policies (RLS)

### `Ficha EPI gerenciável por admin/rh`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = epis_fichas.empresa_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = epis_fichas.empresa_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |

### `Ficha EPI visível para membros da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = epis_fichas.empresa_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_epis_fichas_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
