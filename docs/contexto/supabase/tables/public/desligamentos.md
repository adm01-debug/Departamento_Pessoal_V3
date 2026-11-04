# public.desligamentos

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
| usada por views | public.vw_kpi_turnover |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `tipo` | `tipo_desligamento` | não |  |  |  |
| 4 | `data_desligamento` | `date` | não |  |  |  |
| 5 | `data_aviso` | `date` | sim |  |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `status` | `text` | não | `'em_andamento'::text` |  |  |
| 8 | `salario_base` | `numeric` | não | `0` |  |  |
| 9 | `saldo_salario` | `numeric` | sim | `0` |  |  |
| 10 | `aviso_previo` | `numeric` | sim | `0` |  |  |
| 11 | `ferias_vencidas` | `numeric` | sim | `0` |  |  |
| 12 | `ferias_proporcionais` | `numeric` | sim | `0` |  |  |
| 13 | `terco_constitucional` | `numeric` | sim | `0` |  |  |
| 14 | `decimo_terceiro` | `numeric` | sim | `0` |  |  |
| 15 | `multa_fgts` | `numeric` | sim | `0` |  |  |
| 16 | `total_proventos` | `numeric` | sim | `0` |  |  |
| 17 | `total_descontos` | `numeric` | sim | `0` |  |  |
| 18 | `valor_liquido` | `numeric` | sim | `0` |  |  |
| 19 | `checklist_comunicacao` | `boolean` | sim | `false` |  |  |
| 20 | `checklist_documentacao` | `boolean` | sim | `false` |  |  |
| 21 | `checklist_calculo_rescisao` | `boolean` | sim | `false` |  |  |
| 22 | `checklist_homologacao` | `boolean` | sim | `false` |  |  |
| 23 | `checklist_revogacao_acessos` | `boolean` | sim | `false` |  |  |
| 24 | `checklist_devolucao_equipamentos` | `boolean` | sim | `false` |  |  |
| 25 | `checklist_esocial` | `boolean` | sim | `false` |  |  |
| 26 | `checklist_pagamento` | `boolean` | sim | `false` |  |  |
| 27 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 28 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 29 | `created_by` | `uuid` | sim |  |  |  |
| 30 | `empresa_id` | `uuid` | sim |  |  |  |
| 31 | `tipo_desligamento_id` | `integer` | sim |  |  |  |
| 32 | `tipo_aviso_previo_id` | `integer` | sim |  |  |  |
| 33 | `data_aviso_previo` | `text` | sim |  |  |  |
| 34 | `quebra_contrato` | `boolean` | sim | `false` |  |  |
| 35 | `remover_beneficios` | `boolean` | sim | `false` |  |  |
| 36 | `data_remocao_acesso` | `text` | sim |  |  |  |
| 37 | `novo_supervisor_id` | `uuid` | sim |  |  |  |
| 38 | `etapa` | `text` | sim | `'iniciado'::text` |  |  |
| 39 | `data_contabilidade` | `text` | sim |  |  |  |
| 40 | `hash_integridade` | `text` | sim |  |  |  |
| 41 | `assinado_empresa` | `boolean` | sim | `false` |  |  |
| 42 | `assinado_colaborador` | `boolean` | sim | `false` |  |  |
| 43 | `hash_assinatura_empresa` | `text` | sim |  |  |  |
| 44 | `hash_assinatura_colaborador` | `text` | sim |  |  |  |
| 45 | `data_assinatura_empresa` | `timestamp with time zone` | sim |  |  |  |
| 46 | `data_assinatura_colaborador` | `timestamp with time zone` | sim |  |  |  |
| 47 | `data_pagamento` | `timestamp with time zone` | sim |  |  |  |
| 48 | `comprovante_pagamento_url` | `text` | sim |  |  |  |
| 49 | `detalhes_calculo` | `jsonb` | sim |  |  | Resultado completo do motor de rescisão (RescisaoResult JSON) gravado por rescisaoService.calcularESalvar; alimenta o TRCT/PDF. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_desligamentos_etapa | CHECK | `CHECK (etapa IS NULL OR (etapa = ANY (ARRAY['iniciado'::text, 'comunicacao'::text, 'documentacao'::text, 'calculo_rescisao'::text, 'pagamento'::text, 'homologacao'::text, 'esocial'::text, 'devolucao_equipamentos'::text, 'revogacao_acessos'::text, 'concluido'::text])))` |  |  | sim |
| chk_desligamentos_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['rascunho'::text, 'pendente'::text, 'em_andamento'::text, 'aguardando_aprovacao'::text, 'aprovado'::text, 'rejeitado'::text, 'calculado'::text, 'em_homologacao'::text, 'homologado'::text, 'pago'::text, 'concluido'::text, 'finalizado'::text, 'cancelado'::text])))` |  |  | sim |
| chk_desligamentos_valores_nao_negativos | CHECK | `CHECK (COALESCE(total_proventos, 0::numeric) >= 0::numeric AND COALESCE(total_descontos, 0::numeric) >= 0::numeric AND COALESCE(valor_liquido, 0::numeric) >= 0::numeric) NOT VALID` |  |  | não |
| deslig_descontos_positivo | CHECK | `CHECK (total_descontos IS NULL OR total_descontos >= 0::numeric)` |  |  | sim |
| deslig_proventos_positivo | CHECK | `CHECK (total_proventos IS NULL OR total_proventos >= 0::numeric)` |  |  | sim |
| deslig_salario_positivo | CHECK | `CHECK (salario_base IS NULL OR salario_base >= 0::numeric)` |  |  | sim |
| desligamentos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| desligamentos_componentes_nao_neg | CHECK | `CHECK (COALESCE(salario_base, 0::numeric) >= 0::numeric AND COALESCE(saldo_salario, 0::numeric) >= 0::numeric AND COALESCE(aviso_previo, 0::numeric) >= 0::numeric AND COALESCE(ferias_vencidas, 0::numeric) >= 0::numeric AND COALESCE(ferias_proporcionais, 0::numeric) >= 0::numeric AND COALESCE(terco_constitucional, 0::numeric) >= 0::numeric AND COALESCE(decimo_terceiro, 0::numeric) >= 0::numeric AND COALESCE(multa_fgts, 0::numeric) >= 0::numeric)` |  |  | sim |
| desligamentos_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| desligamentos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| desligamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| desligamentos_tipo_aviso_previo_id_fkey | FOREIGN KEY | `FOREIGN KEY (tipo_aviso_previo_id) REFERENCES tipos_aviso_previo(id)` | NO ACTION | NO ACTION | sim |
| desligamentos_tipo_desligamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (tipo_desligamento_id) REFERENCES tipos_desligamento(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.homologacoes_rescisao | homologacoes_rescisao_desligamento_id_fkey | desligamento_id | CASCADE |
| public.verbas_rescisorias | verbas_rescisorias_desligamento_id_fkey | desligamento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| desligamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX desligamentos_pkey ON public.desligamentos USING btree (id)` |
| idx_desligamentos_colab_status | btree | colaborador_id, status | não | sim |  | `CREATE INDEX idx_desligamentos_colab_status ON public.desligamentos USING btree (colaborador_id, status)` |
| idx_desligamentos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_desligamentos_colaborador_id ON public.desligamentos USING btree (colaborador_id)` |
| idx_desligamentos_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_desligamentos_created_by ON public.desligamentos USING btree (created_by)` |
| idx_desligamentos_data | btree | empresa_id, data_desligamento | não | sim |  | `CREATE INDEX idx_desligamentos_data ON public.desligamentos USING btree (empresa_id, data_desligamento)` |
| idx_desligamentos_empresa_created | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_desligamentos_empresa_created ON public.desligamentos USING btree (empresa_id, created_at DESC)` |
| idx_desligamentos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_desligamentos_empresa_id ON public.desligamentos USING btree (empresa_id)` |
| idx_desligamentos_status | btree | status | não | sim |  | `CREATE INDEX idx_desligamentos_status ON public.desligamentos USING btree (status)` |
| idx_desligamentos_tipo_aviso_previo_id | btree | tipo_aviso_previo_id | não | sim |  | `CREATE INDEX idx_desligamentos_tipo_aviso_previo_id ON public.desligamentos USING btree (tipo_aviso_previo_id)` |
| idx_desligamentos_tipo_desligamento_id | btree | tipo_desligamento_id | não | sim |  | `CREATE INDEX idx_desligamentos_tipo_desligamento_id ON public.desligamentos USING btree (tipo_desligamento_id)` |


## Policies (RLS)

### `desligamentos_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_desligamentos | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| desligamentos_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_desligamentos_status_transition |
| trg_enforce_desligamento_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_desligamento_hash |
| trg_impedir_alteracao_desligamento_homologado | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_desligamento_homologado |
| trg_proibir_delete_desligamento_homologado | BEFORE | DELETE | ROW | enabled | public.proibir_delete_desligamento_homologado |
| trg_protect_assinatura | BEFORE | UPDATE | ROW | enabled | public.trg_protect_assinatura_rescisao |
| update_desligamentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
