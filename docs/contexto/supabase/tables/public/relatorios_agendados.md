# public.relatorios_agendados

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
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `tipo_relatorio` | `text` | não |  |  |  |
| 4 | `formato` | `text` | não | `'PDF'::text` |  |  |
| 5 | `parametros` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `email_destinatario` | `text` | não |  |  |  |
| 7 | `frequencia` | `text` | não |  |  |  |
| 8 | `dia_semana` | `integer` | sim |  |  |  |
| 9 | `dia_mes` | `integer` | sim |  |  |  |
| 10 | `hora_envio` | `time without time zone` | não | `'08:00:00'::time without time zone` |  |  |
| 11 | `ativo` | `boolean` | sim | `true` |  |  |
| 12 | `ultimo_envio` | `timestamp with time zone` | sim |  |  |  |
| 13 | `proximo_envio` | `timestamp with time zone` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `created_by` | `uuid` | não |  |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `empresa_id` | `uuid` | não |  |  |  |
| 18 | `dispatch_claim_token` | `uuid` | sim |  |  |  |
| 19 | `dispatch_claimed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| relatorios_agendados_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| relatorios_agendados_dia_mes_check | CHECK | `CHECK (dia_mes >= 1 AND dia_mes <= 31)` |  |  | sim |
| relatorios_agendados_dia_semana_check | CHECK | `CHECK (dia_semana >= 0 AND dia_semana <= 6)` |  |  | sim |
| relatorios_agendados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| relatorios_agendados_frequencia_check | CHECK | `CHECK (frequencia = ANY (ARRAY['diario'::text, 'semanal'::text, 'mensal'::text]))` |  |  | sim |
| relatorios_agendados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.log_envio_relatorios | log_envio_relatorios_agendamento_id_fkey | agendamento_id | CASCADE |
| public.report_dispatch_attempts | report_dispatch_attempts_agendamento_id_fkey | agendamento_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_relatorios_agendados_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_relatorios_agendados_created_by ON public.relatorios_agendados USING btree (created_by)` |
| idx_relatorios_agendados_dispatch_claim | btree | ativo, proximo_envio, dispatch_claimed_at | não | sim | `(ativo IS TRUE)` | `CREATE INDEX idx_relatorios_agendados_dispatch_claim ON public.relatorios_agendados USING btree (ativo, proximo_envio, dispatch_claimed_at) WHERE (ativo IS TRUE)` |
| idx_relatorios_agendados_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_relatorios_agendados_empresa_id ON public.relatorios_agendados USING btree (empresa_id)` |
| relatorios_agendados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX relatorios_agendados_pkey ON public.relatorios_agendados USING btree (id)` |


## Policies (RLS)

### `relatorios_agendados_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK |  |

### `relatorios_agendados_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `relatorios_agendados_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK |  |

### `relatorios_agendados_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_enforce_report_schedule_authorship | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_report_schedule_authorship |
| update_relatorios_agendados_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
