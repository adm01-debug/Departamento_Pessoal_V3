# public.afastamentos

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `tipo_afastamento` | não |  |  |  |
| 4 | `data_inicio` | `date` | não |  |  |  |
| 5 | `data_fim_prevista` | `date` | não |  |  |  |
| 6 | `data_fim_real` | `date` | sim |  |  |  |
| 7 | `dias_empresa` | `integer` | sim | `0` |  |  |
| 8 | `dias_inss` | `integer` | sim | `0` |  |  |
| 9 | `dias_total` | `integer` | sim |  |  |  |
| 10 | `cid` | `character varying(10)` | sim |  |  |  |
| 11 | `cid_descricao` | `character varying(255)` | sim |  |  |  |
| 12 | `numero_beneficio` | `character varying(20)` | sim |  |  |  |
| 13 | `data_pericia` | `date` | sim |  |  |  |
| 14 | `medico_nome` | `character varying(100)` | sim |  |  |  |
| 15 | `medico_crm` | `character varying(20)` | sim |  |  |  |
| 16 | `atestado_numero` | `character varying(50)` | sim |  |  |  |
| 17 | `observacoes` | `text` | sim |  |  |  |
| 18 | `status` | `status_afastamento` | sim | `'ativo'::status_afastamento` |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `created_by` | `uuid` | sim |  |  |  |
| 21 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `empresa_id` | `uuid` | sim |  |  |  |
| 23 | `aprovado_por` | `uuid` | sim |  |  |  |
| 24 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 25 | `rejeitado_por` | `uuid` | sim |  |  |  |
| 26 | `rejeitado_em` | `timestamp with time zone` | sim |  |  |  |
| 27 | `motivo_rejeicao` | `text` | sim |  |  |  |
| 28 | `cid_id` | `uuid` | sim |  |  |  |
| 29 | `crm_medico` | `text` | sim |  |  |  |
| 30 | `nome_medico` | `text` | sim |  |  |  |
| 31 | `local_pericia` | `text` | sim |  |  |  |
| 32 | `hash_integridade` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| afastamentos_cid_id_fkey | FOREIGN KEY | `FOREIGN KEY (cid_id) REFERENCES cid10(id)` | NO ACTION | NO ACTION | sim |
| afastamentos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| afastamentos_dias_nao_negativos | CHECK | `CHECK (COALESCE(dias_empresa, 0) >= 0 AND COALESCE(dias_inss, 0) >= 0 AND COALESCE(dias_total, 0) >= 0)` |  |  | sim |
| afastamentos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| afastamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| chk_afastamentos_prevista_coerente | CHECK | `CHECK (data_inicio IS NULL OR data_fim_prevista IS NULL OR data_fim_prevista >= data_inicio) NOT VALID` |  |  | não |
| chk_afastamentos_real_coerente | CHECK | `CHECK (data_inicio IS NULL OR data_fim_real IS NULL OR data_fim_real >= data_inicio) NOT VALID` |  |  | não |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.documentos_afastamento | documentos_afastamento_afastamento_id_fkey | afastamento_id | CASCADE |
| public.prorrogacoes_afastamento | prorrogacoes_afastamento_afastamento_id_fkey | afastamento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| afastamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX afastamentos_pkey ON public.afastamentos USING btree (id)` |
| idx_afastamentos_ativo | btree | empresa_id, data_inicio | não | sim | `(status = 'ativo'::status_afastamento)` | `CREATE INDEX idx_afastamentos_ativo ON public.afastamentos USING btree (empresa_id, data_inicio) WHERE (status = 'ativo'::status_afastamento)` |
| idx_afastamentos_cid | btree | cid | não | sim | `(cid IS NOT NULL)` | `CREATE INDEX idx_afastamentos_cid ON public.afastamentos USING btree (cid) WHERE (cid IS NOT NULL)` |
| idx_afastamentos_cid_id | btree | cid_id | não | sim |  | `CREATE INDEX idx_afastamentos_cid_id ON public.afastamentos USING btree (cid_id)` |
| idx_afastamentos_colab_status | btree | colaborador_id, status | não | sim |  | `CREATE INDEX idx_afastamentos_colab_status ON public.afastamentos USING btree (colaborador_id, status)` |
| idx_afastamentos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_afastamentos_colaborador_id ON public.afastamentos USING btree (colaborador_id)` |
| idx_afastamentos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_afastamentos_empresa_id ON public.afastamentos USING btree (empresa_id)` |
| idx_afastamentos_empresa_inicio | btree | empresa_id, data_inicio | não | sim |  | `CREATE INDEX idx_afastamentos_empresa_inicio ON public.afastamentos USING btree (empresa_id, data_inicio DESC)` |


## Policies (RLS)

### `afastamentos_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id))` |
| WITH CHECK | `(pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_afastamentos | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_enforce_afastamento_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_afastamento_hash |
| tr_impedir_alteracao_afastamento_encerrado | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_afastamento_encerrado |
| tr_proibir_delete_afastamento_encerrado | BEFORE | DELETE | ROW | enabled | public.proibir_delete_afastamento_encerrado |
| update_afastamentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
