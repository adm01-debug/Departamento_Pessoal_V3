# public.contratos_gerados

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
| usada por views | public.v_contratos_tokens_pendentes, public.v_contratos_vencendo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `admissao_id` | `uuid` | sim |  |  |  |
| 4 | `colaborador_id` | `uuid` | sim |  |  |  |
| 5 | `template_id` | `uuid` | não |  |  |  |
| 6 | `template_versao` | `integer` | não |  |  |  |
| 7 | `variaveis_snapshot` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `html_final` | `text` | sim |  |  |  |
| 9 | `storage_path` | `text` | sim |  |  |  |
| 10 | `sha256` | `text` | sim |  |  |  |
| 11 | `status` | `text` | não | `'gerado'::text` |  |  |
| 12 | `assinado_em` | `timestamp with time zone` | sim |  |  |  |
| 13 | `assinatura_metadata` | `jsonb` | sim |  |  |  |
| 14 | `gerado_por` | `uuid` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `data_inicio` | `date` | sim |  |  |  |
| 18 | `data_fim` | `date` | sim |  |  |  |
| 19 | `prorrogado` | `boolean` | não | `false` |  |  |
| 20 | `contrato_anterior_id` | `uuid` | sim |  |  |  |
| 21 | `alerta_vencimento_enviado_em` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| contratos_gerados_admissao_id_fkey | FOREIGN KEY | `FOREIGN KEY (admissao_id) REFERENCES admissoes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contratos_gerados_alvo | CHECK | `CHECK (admissao_id IS NOT NULL OR colaborador_id IS NOT NULL)` |  |  | sim |
| contratos_gerados_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contratos_gerados_contrato_anterior_id_fkey | FOREIGN KEY | `FOREIGN KEY (contrato_anterior_id) REFERENCES contratos_gerados(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| contratos_gerados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| contratos_gerados_gerado_por_fkey | FOREIGN KEY | `FOREIGN KEY (gerado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| contratos_gerados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| contratos_gerados_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'gerado'::text, 'enviado'::text, 'assinado'::text, 'cancelado'::text]))` |  |  | sim |
| contratos_gerados_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES contrato_templates(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.contrato_assinatura_tokens | contrato_assinatura_tokens_contrato_id_fkey | contrato_id | CASCADE |
| public.contrato_token_eventos | contrato_token_eventos_contrato_id_fkey | contrato_id | CASCADE |
| public.contratos_gerados | contratos_gerados_contrato_anterior_id_fkey | contrato_anterior_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| contratos_gerados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX contratos_gerados_pkey ON public.contratos_gerados USING btree (id)` |
| idx_contratos_gerados_admissao | btree | admissao_id | não | sim |  | `CREATE INDEX idx_contratos_gerados_admissao ON public.contratos_gerados USING btree (admissao_id)` |
| idx_contratos_gerados_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_contratos_gerados_colaborador ON public.contratos_gerados USING btree (colaborador_id)` |
| idx_contratos_gerados_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_contratos_gerados_empresa ON public.contratos_gerados USING btree (empresa_id)` |
| idx_contratos_gerados_hash | btree | sha256 | não | sim |  | `CREATE INDEX idx_contratos_gerados_hash ON public.contratos_gerados USING btree (sha256)` |
| idx_contratos_gerados_vencimento | btree | data_fim | não | sim | `((data_fim IS NOT NULL) AND (status = ANY (ARRAY['gerado'::text, 'enviado'::text, 'assinado'::text])))` | `CREATE INDEX idx_contratos_gerados_vencimento ON public.contratos_gerados USING btree (data_fim) WHERE ((data_fim IS NOT NULL) AND (status = ANY (ARRAY['gerado'::text, 'enviado'::text, 'assinado'::text])))` |


## Policies (RLS)

### `contratos_gerados_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_empresa(auth.uid(), empresa_id)` |
| WITH CHECK |  |

### `contratos_gerados_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_contratos_gerados_updated | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_validar_contrato_clt | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validar_contrato_clt |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
