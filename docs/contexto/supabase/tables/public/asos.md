# public.asos

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
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `tipo` | `text` | não |  |  |  |
| 5 | `data_exame` | `date` | não |  |  |  |
| 6 | `data_validade` | `date` | sim |  |  |  |
| 7 | `resultado` | `text` | sim | `'apto'::text` |  |  |
| 8 | `medico_nome` | `text` | sim |  |  |  |
| 9 | `medico_crm` | `text` | sim |  |  |  |
| 10 | `clinica` | `text` | sim |  |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `arquivo_url` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `hash_integridade` | `text` | sim |  |  |  |
| 16 | `agendamento_id` | `uuid` | sim |  |  |  |
| 17 | `clinica_partner_id` | `uuid` | sim |  |  |  |
| 18 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 19 | `restricoes` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 20 | `restricoes_descricao` | `text` | sim |  |  |  |
| 21 | `restricao_data_fim` | `date` | sim |  |  |  |
| 22 | `assinatura_medico_hash` | `text` | sim |  |  |  |
| 23 | `assinado_em` | `timestamp with time zone` | sim |  |  |  |
| 24 | `recebido_rh_em` | `timestamp with time zone` | sim |  |  |  |
| 25 | `recebido_rh_por` | `uuid` | sim |  |  |  |
| 26 | `validado_em` | `timestamp with time zone` | sim |  |  |  |
| 27 | `validado_por` | `uuid` | sim |  |  |  |
| 28 | `motivo_cancelamento` | `text` | sim |  |  |  |
| 29 | `emitido_por_partner_user` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| asos_agendamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (agendamento_id) REFERENCES exames_agendamentos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| asos_clinica_partner_id_fkey | FOREIGN KEY | `FOREIGN KEY (clinica_partner_id) REFERENCES clinicas_partners(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| asos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| asos_emitido_por_partner_user_fkey | FOREIGN KEY | `FOREIGN KEY (emitido_por_partner_user) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| asos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| asos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| asos_recebido_rh_por_fkey | FOREIGN KEY | `FOREIGN KEY (recebido_rh_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| asos_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'emitido_clinica'::text, 'recebido_rh'::text, 'validado'::text, 'arquivado'::text, 'cancelado'::text]))` |  |  | sim |
| asos_validade_coerente | CHECK | `CHECK (data_validade IS NULL OR data_validade >= data_exame)` |  |  | sim |
| asos_validado_por_fkey | FOREIGN KEY | `FOREIGN KEY (validado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| asos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX asos_pkey ON public.asos USING btree (id)` |
| idx_asos_agendamento | btree | agendamento_id | não | sim | `(agendamento_id IS NOT NULL)` | `CREATE INDEX idx_asos_agendamento ON public.asos USING btree (agendamento_id) WHERE (agendamento_id IS NOT NULL)` |
| idx_asos_clinica_partner | btree | clinica_partner_id | não | sim | `(clinica_partner_id IS NOT NULL)` | `CREATE INDEX idx_asos_clinica_partner ON public.asos USING btree (clinica_partner_id) WHERE (clinica_partner_id IS NOT NULL)` |
| idx_asos_col | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_asos_col ON public.asos USING btree (colaborador_id)` |
| idx_asos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_asos_colaborador_id ON public.asos USING btree (colaborador_id)` |
| idx_asos_emitido_por_partner_user | btree | emitido_por_partner_user | não | sim |  | `CREATE INDEX idx_asos_emitido_por_partner_user ON public.asos USING btree (emitido_por_partner_user)` |
| idx_asos_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_asos_empresa_id ON public.asos USING btree (empresa_id)` |
| idx_asos_empresa_tipo | btree | empresa_id, tipo | não | sim |  | `CREATE INDEX idx_asos_empresa_tipo ON public.asos USING btree (empresa_id, tipo)` |
| idx_asos_recebido_rh_por | btree | recebido_rh_por | não | sim |  | `CREATE INDEX idx_asos_recebido_rh_por ON public.asos USING btree (recebido_rh_por)` |
| idx_asos_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_asos_status ON public.asos USING btree (empresa_id, status)` |
| idx_asos_validade | btree | data_validade | não | sim | `(data_validade IS NOT NULL)` | `CREATE INDEX idx_asos_validade ON public.asos USING btree (data_validade) WHERE (data_validade IS NOT NULL)` |
| idx_asos_validado_por | btree | validado_por | não | sim |  | `CREATE INDEX idx_asos_validado_por ON public.asos USING btree (validado_por)` |


## Policies (RLS)

### `asos_rh_manage`

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
| tr_asos_auto_marcar_agendamento | AFTER | UPDATE | ROW | enabled | public.asos_auto_marcar_agendamento_realizado |
| tr_asos_validar_restricoes | BEFORE | INSERT OR UPDATE | ROW | enabled | public.asos_validar_restricoes |
| tr_asos_validar_transicao | BEFORE | UPDATE | ROW | enabled | public.asos_validar_transicao_status |
| tr_enforce_aso_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_aso_hash |
| tr_impedir_alteracao_aso_emitido | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_aso_emitido |
| tr_proibir_delete_aso_emitido | BEFORE | DELETE | ROW | enabled | public.proibir_delete_aso_emitido |
| update_asos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
