# public.faltas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.vw_faltas_mensal, public.vw_kpi_absenteismo |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `data` | `date` | não |  |  |  |
| 5 | `data_fim` | `date` | sim |  |  |  |
| 6 | `dias_total` | `integer` | sim | `1` |  |  |
| 7 | `tipo` | `text` | não | `'falta'::text` |  |  |
| 8 | `justificada` | `boolean` | sim | `false` |  |  |
| 9 | `motivo_afastamento_id` | `integer` | sim |  |  |  |
| 10 | `motivo` | `text` | sim |  |  |  |
| 11 | `status` | `text` | sim | `'registrada'::text` |  |  |
| 12 | `cid` | `text` | sim |  |  |  |
| 13 | `medico_nome` | `text` | sim |  |  |  |
| 14 | `medico_crm` | `text` | sim |  |  |  |
| 15 | `horas_falta` | `interval` | sim |  |  |  |
| 16 | `documento_url` | `text` | sim |  |  |  |
| 17 | `created_by` | `uuid` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 20 | `aprovado_por` | `uuid` | sim |  |  |  |
| 21 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 22 | `rejeitado_por` | `uuid` | sim |  |  |  |
| 23 | `rejeitado_em` | `timestamp with time zone` | sim |  |  |  |
| 24 | `motivo_rejeicao` | `text` | sim |  |  |  |
| 25 | `documento_anexo` | `text` | sim |  |  |  |
| 26 | `desconto_aplicado` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_faltas_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['pendente'::text, 'justificada'::text, 'abonada'::text, 'injustificada'::text, 'em_analise'::text, 'rejeitada'::text])))` |  |  | sim |
| chk_faltas_tipo | CHECK | `CHECK (tipo IS NULL OR (tipo = ANY (ARRAY['atestado_medico'::text, 'falta_injustificada'::text, 'falta_justificada'::text, 'licenca'::text, 'ausencia_parcial'::text, 'atraso'::text, 'saida_antecipada'::text, 'luto'::text, 'casamento'::text, 'doacao_sangue'::text, 'servico_militar'::text, 'doenca_familiar'::text, 'maternidade'::text, 'paternidade'::text, 'outros'::text])))` |  |  | sim |
| faltas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| faltas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| faltas_motivo_afastamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (motivo_afastamento_id) REFERENCES motivos_afastamento(id)` | NO ACTION | NO ACTION | sim |
| faltas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| faltas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX faltas_pkey ON public.faltas USING btree (id)` |
| idx_faltas_colab_data | btree | colaborador_id, data | não | sim |  | `CREATE INDEX idx_faltas_colab_data ON public.faltas USING btree (colaborador_id, data DESC)` |
| idx_faltas_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_faltas_colaborador_id ON public.faltas USING btree (colaborador_id)` |
| idx_faltas_empresa_data | btree | empresa_id, data | não | sim |  | `CREATE INDEX idx_faltas_empresa_data ON public.faltas USING btree (empresa_id, data DESC)` |
| idx_faltas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_faltas_empresa_id ON public.faltas USING btree (empresa_id)` |
| idx_faltas_motivo_afastamento_id | btree | motivo_afastamento_id | não | sim |  | `CREATE INDEX idx_faltas_motivo_afastamento_id ON public.faltas USING btree (motivo_afastamento_id)` |


## Policies (RLS)

### `faltas_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `faltas_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `faltas_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `faltas_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `faltas_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| faltas_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_faltas_status_transition |
| trg_faltas_sync_faltas_periodo | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_faltas_sync_faltas_periodo |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
