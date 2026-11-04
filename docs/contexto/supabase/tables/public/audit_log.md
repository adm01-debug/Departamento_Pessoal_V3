# public.audit_log

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_audit_events_unified, public.v_audit_trail, public.vw_folha_compliance |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `tabela` | `text` | não |  |  |  |
| 3 | `registro_id` | `uuid` | não |  |  |  |
| 4 | `acao` | `text` | não |  |  |  |
| 5 | `dados_anteriores` | `jsonb` | sim |  |  |  |
| 6 | `dados_novos` | `jsonb` | sim |  |  |  |
| 7 | `campos_alterados` | `text[]` | sim |  |  |  |
| 8 | `user_id` | `uuid` | sim |  |  |  |
| 9 | `user_email` | `text` | sim |  |  |  |
| 10 | `ip_address` | `text` | sim |  |  |  |
| 11 | `user_agent` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `empresa_id` | `uuid` | sim |  |  | Empresa do evento de auditoria (isolamento da Trilha por tenant). Preenchida explicitamente pelas RPCs do modulo Nine-Box; tambem replicada em dados_novos.empresa_id. |
| 14 | `justificativa` | `text` | sim |  |  | Justificativa/motivo integral da operação auditada (cancelamento, reabertura, devolução etc.). |
| 15 | `status_anterior` | `text` | sim |  |  | Status do registro antes da operação; nulo quando a operação não é uma transição de status. |
| 16 | `status_posterior` | `text` | sim |  |  | Status do registro depois da operação; nulo quando a operação não é uma transição de status. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_log_acao_check | CHECK | `CHECK (acao = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'PAYROLL_CALC'::text, 'PAYROLL_CALC_BLOCKED'::text, 'PAYROLL_CLOSE'::text, 'PAYROLL_REOPEN'::text, 'FERIAS_CALC'::text, 'FERIAS_CANCEL'::text, 'RESCISAO_CALC'::text, 'PROVISOES_CALC'::text, 'ESOCIAL_SEND'::text, 'DECIMO_CALC'::text, 'IDEMPOTENCY_REPLAY'::text, 'IDEMPOTENCY_CONFLICT'::text, 'BACKUP_CREATED'::text, 'BACKUP_FAILED'::text, 'CLOSE'::text, 'REOPEN'::text, 'BACKUP_RUN'::text, 'SYSTEM_ACTION'::text, 'AUTH_ACTION'::text, 'EXPORT'::text, 'IMPORT'::text, 'VISUALIZACAO'::text, 'EXECUTE_CALC'::text, 'SIGN'::text, 'STATUS_CHANGE'::text, 'AUTO_PURGE'::text]))` |  |  | sim |
| audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| audit_log_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)` |
| idx_audit_log_acao | btree | acao | não | sim |  | `CREATE INDEX idx_audit_log_acao ON public.audit_log USING btree (acao)` |
| idx_audit_log_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC)` |
| idx_audit_log_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_audit_log_empresa_id ON public.audit_log USING btree (empresa_id)` |
| idx_audit_log_registro_created | btree | registro_id, created_at | não | sim |  | `CREATE INDEX idx_audit_log_registro_created ON public.audit_log USING btree (registro_id, created_at DESC)` |
| idx_audit_log_registro_id | btree | registro_id | não | sim |  | `CREATE INDEX idx_audit_log_registro_id ON public.audit_log USING btree (registro_id)` |
| idx_audit_log_status_change | btree | tabela, registro_id, created_at | não | sim | `(acao = 'STATUS_CHANGE'::text)` | `CREATE INDEX idx_audit_log_status_change ON public.audit_log USING btree (tabela, registro_id, created_at DESC) WHERE (acao = 'STATUS_CHANGE'::text)` |
| idx_audit_log_status_change_scan | btree | tabela, created_at | não | sim | `(acao = 'STATUS_CHANGE'::text)` | `CREATE INDEX idx_audit_log_status_change_scan ON public.audit_log USING btree (tabela, created_at DESC) WHERE (acao = 'STATUS_CHANGE'::text)` |
| idx_audit_log_tabela | btree | tabela | não | sim |  | `CREATE INDEX idx_audit_log_tabela ON public.audit_log USING btree (tabela)` |
| idx_audit_log_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_audit_log_user_created ON public.audit_log USING btree (user_id, created_at DESC)` |
| idx_audit_log_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id)` |


## Policies (RLS)

### `Admins podem ver todo audit_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(auth.uid())` |
| WITH CHECK |  |

### `audit_log_self_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = auth.uid())` |

### `audit_log_self_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| detect_status_anomaly | AFTER | INSERT | ROW | enabled | public.trg_detect_status_anomaly |
| trg_audit_log_append_only | BEFORE | DELETE OR UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_audit_log_enriquecer_feedback | BEFORE | INSERT | ROW | enabled | public.tg_audit_log_enriquecer_feedback |
| trg_audit_log_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_append_only |
| trg_audit_log_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_append_only |
| trg_fwd_audit_unified | AFTER | INSERT | ROW | enabled | public.fwd_to_audit_unified |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
