# public.pcs_planos

> PCS plans, versioned and tenant scoped.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `versao` | `integer` | não | `1` |  |  |
| 5 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 6 | `vigencia_inicio` | `date` | sim |  |  |  |
| 7 | `vigencia_fim` | `date` | sim |  |  |  |
| 8 | `amplitude_pct` | `numeric(6,2)` | não | `40` |  |  |
| 9 | `num_steps` | `integer` | não | `5` |  |  |
| 10 | `overlap_pct` | `numeric(6,2)` | não | `25` |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `created_by` | `uuid` | não | `auth.uid()` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pcs_planos_amplitude_pct_check | CHECK | `CHECK (amplitude_pct > 0::numeric AND amplitude_pct <= 200::numeric)` |  |  | sim |
| pcs_planos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pcs_planos_empresa_id_nome_versao_key | UNIQUE | `UNIQUE (empresa_id, nome, versao)` |  |  | sim |
| pcs_planos_nome_check | CHECK | `CHECK (length(btrim(nome)) >= 1 AND length(btrim(nome)) <= 160)` |  |  | sim |
| pcs_planos_num_steps_check | CHECK | `CHECK (num_steps >= 2 AND num_steps <= 12)` |  |  | sim |
| pcs_planos_overlap_pct_check | CHECK | `CHECK (overlap_pct >= 0::numeric AND overlap_pct < 100::numeric)` |  |  | sim |
| pcs_planos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pcs_planos_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'em_avaliacao'::text, 'ativo'::text, 'arquivado'::text]))` |  |  | sim |
| pcs_planos_versao_check | CHECK | `CHECK (versao > 0)` |  |  | sim |
| pcs_planos_vigencia_coerente | CHECK | `CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.pcs_avaliacoes_cargo | pcs_avaliacoes_cargo_plano_id_fkey | plano_id | CASCADE |
| public.pcs_fatores | pcs_fatores_plano_id_fkey | plano_id | CASCADE |
| public.pcs_grades | pcs_grades_plano_id_fkey | plano_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pcs_planos_empresa | btree | empresa_id, created_at | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_pcs_planos_empresa ON public.pcs_planos USING btree (empresa_id, created_at DESC) WHERE (deleted_at IS NULL)` |
| pcs_planos_empresa_id_nome_versao_key | btree | empresa_id, nome, versao | sim | sim |  | `CREATE UNIQUE INDEX pcs_planos_empresa_id_nome_versao_key ON public.pcs_planos USING btree (empresa_id, nome, versao)` |
| pcs_planos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pcs_planos_pkey ON public.pcs_planos USING btree (id)` |
| uq_pcs_plano_ativo_por_empresa | btree | empresa_id | sim | sim | `((status = 'ativo'::text) AND (deleted_at IS NULL))` | `CREATE UNIQUE INDEX uq_pcs_plano_ativo_por_empresa ON public.pcs_planos USING btree (empresa_id) WHERE ((status = 'ativo'::text) AND (deleted_at IS NULL))` |


## Policies (RLS)

### `pcs_planos_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `pcs_planos_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((deleted_at IS NULL) AND pode_gerir_rh(empresa_id))` |

### `pcs_planos_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((deleted_at IS NULL) AND (is_admin(auth.uid()) OR (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK |  |

### `pcs_planos_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((deleted_at IS NULL) AND pode_gerir_rh(empresa_id))` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pcs_planos_audit | BEFORE | INSERT OR UPDATE | ROW | enabled | public.pcs_set_audit_fields |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
