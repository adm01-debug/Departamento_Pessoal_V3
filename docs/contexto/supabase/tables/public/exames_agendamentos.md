# public.exames_agendamentos

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `clinica_id` | `uuid` | não |  |  |  |
| 5 | `tipo_exame` | `text` | não |  |  |  |
| 6 | `data_agendada` | `timestamp with time zone` | não |  |  |  |
| 7 | `distancia_km` | `numeric(8,2)` | sim |  |  |  |
| 8 | `colaborador_lat` | `numeric(10,7)` | sim |  |  |  |
| 9 | `colaborador_lng` | `numeric(10,7)` | sim |  |  |  |
| 10 | `status` | `text` | não | `'agendado'::text` |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `aso_id` | `uuid` | sim |  |  |  |
| 13 | `criado_por` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| exames_agendamentos_clinica_id_fkey | FOREIGN KEY | `FOREIGN KEY (clinica_id) REFERENCES clinicas_partners(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| exames_agendamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| exames_agendamentos_status_check | CHECK | `CHECK (status = ANY (ARRAY['agendado'::text, 'confirmado'::text, 'realizado'::text, 'cancelado'::text, 'faltou'::text, 'reagendado'::text]))` |  |  | sim |
| exames_agendamentos_tipo_exame_check | CHECK | `CHECK (tipo_exame = ANY (ARRAY['admissional'::text, 'periodico'::text, 'demissional'::text, 'mudanca_funcao'::text, 'retorno_trabalho'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.asos | asos_agendamento_id_fkey | agendamento_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| exames_agendamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX exames_agendamentos_pkey ON public.exames_agendamentos USING btree (id)` |
| idx_exames_agend_clinica | btree | clinica_id | não | sim |  | `CREATE INDEX idx_exames_agend_clinica ON public.exames_agendamentos USING btree (clinica_id)` |
| idx_exames_agend_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_exames_agend_colaborador ON public.exames_agendamentos USING btree (colaborador_id)` |
| idx_exames_agend_data | btree | data_agendada | não | sim |  | `CREATE INDEX idx_exames_agend_data ON public.exames_agendamentos USING btree (data_agendada)` |
| idx_exames_agend_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_exames_agend_empresa_status ON public.exames_agendamentos USING btree (empresa_id, status)` |


## Policies (RLS)

### `RH/Admin gerenciam agendamentos da empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid()))) OR has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `((empresa_id IN ( SELECT ue.empresa_id    FROM user_empresas ue   WHERE (ue.user_id = auth.uid()))) OR has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_exames_agend_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
