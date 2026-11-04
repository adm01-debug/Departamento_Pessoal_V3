# public.periodos_aquisitivos

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
| usada por views | public.v_ferias_alertas_criticos, public.vw_passivo_trabalhista_consolidado |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `numero_periodo` | `integer` | não | `1` |  |  |
| 4 | `data_inicio` | `date` | não |  |  |  |
| 5 | `data_fim` | `date` | não |  |  |  |
| 6 | `dias_direito` | `integer` | não | `30` |  |  |
| 7 | `faltas_periodo` | `integer` | sim | `0` |  |  |
| 8 | `dias_descontados` | `integer` | sim | `0` |  |  |
| 9 | `status` | `character varying(20)` | sim | `'em_aquisicao'::character varying` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `perdeu_direito` | `boolean` | não | `false` |  |  |
| 12 | `motivo_perda` | `text` | sim |  |  |  |
| 13 | `em_dobra` | `boolean` | não | `false` |  |  |
| 14 | `data_limite_concessao` | `date` | sim |  |  |  |
| 15 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| periodos_aquisitivos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| periodos_aquisitivos_colaborador_id_numero_periodo_key | UNIQUE | `UNIQUE (colaborador_id, numero_periodo)` |  |  | sim |
| periodos_aquisitivos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| periodos_aquisitivos_status_check | CHECK | `CHECK (status::text = ANY (ARRAY['em_aquisicao'::character varying::text, 'adquirido'::character varying::text, 'vencido'::character varying::text, 'gozado'::character varying::text, 'pago'::character varying::text]))` |  |  | sim |
| periodos_datas_coerentes | CHECK | `CHECK (data_fim > data_inicio)` |  |  | sim |
| periodos_dias_direito_clt | CHECK | `CHECK (dias_direito >= 0 AND dias_direito <= 30)` |  |  | sim |
| periodos_numero_positivo | CHECK | `CHECK (numero_periodo > 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ferias | ferias_periodo_aquisitivo_id_fkey | periodo_aquisitivo_id | NO ACTION |
| public.ferias_programacao | ferias_programacao_periodo_aquisitivo_id_fkey | periodo_aquisitivo_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_periodos_aquisitivos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_periodos_aquisitivos_colaborador_id ON public.periodos_aquisitivos USING btree (colaborador_id)` |
| periodos_aquisitivos_colaborador_id_numero_periodo_key | btree | colaborador_id, numero_periodo | sim | sim |  | `CREATE UNIQUE INDEX periodos_aquisitivos_colaborador_id_numero_periodo_key ON public.periodos_aquisitivos USING btree (colaborador_id, numero_periodo)` |
| periodos_aquisitivos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX periodos_aquisitivos_pkey ON public.periodos_aquisitivos USING btree (id)` |


## Policies (RLS)

### `Users can manage periodos by empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(auth.uid()) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = periodos_aquisitivos.colaborador_id) AND (c.empresa_id IS NOT NULL) AND user_belongs_to_empresa(auth.uid(), c.empresa_id)))))` |
| WITH CHECK | `(is_admin(auth.uid()) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = periodos_aquisitivos.colaborador_id) AND (c.empresa_id IS NOT NULL) AND user_belongs_to_empresa(auth.uid(), c.empresa_id)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_periodos_aquisitivos | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.process_ferias_audit |
| trg_periodos_aquisitivos_dobra | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_periodos_aquisitivos_dobra |
| trg_periodos_aquisitivos_recalc_dias | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_periodos_aquisitivos_recalc_dias |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
