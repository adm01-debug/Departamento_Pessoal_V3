# public.ferias_programacao

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
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `periodo_aquisitivo_id` | `uuid` | sim |  |  |  |
| 5 | `ano` | `integer` | não |  |  |  |
| 6 | `mes_previsto` | `integer` | não |  |  |  |
| 7 | `dias_previstos` | `integer` | não | `30` |  |  |
| 8 | `data_inicio_prevista` | `date` | sim |  |  |  |
| 9 | `data_fim_prevista` | `date` | sim |  |  |  |
| 10 | `status` | `programacao_ferias_status` | não | `'sugerido_gestor'::programacao_ferias_status` |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `aprovado_gestor_por` | `uuid` | sim |  |  |  |
| 13 | `aprovado_gestor_em` | `timestamp with time zone` | sim |  |  |  |
| 14 | `aprovado_rh_por` | `uuid` | sim |  |  |  |
| 15 | `aprovado_rh_em` | `timestamp with time zone` | sim |  |  |  |
| 16 | `rejeitado_por` | `uuid` | sim |  |  |  |
| 17 | `rejeitado_em` | `timestamp with time zone` | sim |  |  |  |
| 18 | `rejeitado_motivo` | `text` | sim |  |  |  |
| 19 | `ferias_id` | `uuid` | sim |  |  |  |
| 20 | `criado_por` | `uuid` | sim |  |  |  |
| 21 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_datas_prevista | CHECK | `CHECK (data_fim_prevista IS NULL OR data_inicio_prevista IS NULL OR data_fim_prevista >= data_inicio_prevista)` |  |  | sim |
| ferias_prog_datas_coerentes | CHECK | `CHECK (data_fim_prevista IS NULL OR data_inicio_prevista IS NULL OR data_fim_prevista >= data_inicio_prevista)` |  |  | sim |
| ferias_prog_mes_valido | CHECK | `CHECK (mes_previsto >= 1 AND mes_previsto <= 12)` |  |  | sim |
| ferias_programacao_ano_check | CHECK | `CHECK (ano >= 2000 AND ano <= 2100)` |  |  | sim |
| ferias_programacao_aprovado_gestor_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_gestor_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_programacao_aprovado_rh_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_rh_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_programacao_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_programacao_criado_por_fkey | FOREIGN KEY | `FOREIGN KEY (criado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_programacao_dias_previstos_check | CHECK | `CHECK (dias_previstos >= 5 AND dias_previstos <= 30)` |  |  | sim |
| ferias_programacao_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_programacao_ferias_id_fkey | FOREIGN KEY | `FOREIGN KEY (ferias_id) REFERENCES ferias(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_programacao_mes_previsto_check | CHECK | `CHECK (mes_previsto >= 1 AND mes_previsto <= 12)` |  |  | sim |
| ferias_programacao_periodo_aquisitivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (periodo_aquisitivo_id) REFERENCES periodos_aquisitivos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ferias_programacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ferias_programacao_rejeitado_por_fkey | FOREIGN KEY | `FOREIGN KEY (rejeitado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_programacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_programacao_pkey ON public.ferias_programacao USING btree (id)` |
| idx_fprog_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_fprog_colaborador ON public.ferias_programacao USING btree (colaborador_id)` |
| idx_fprog_empresa_ano_mes | btree | empresa_id, ano, mes_previsto | não | sim |  | `CREATE INDEX idx_fprog_empresa_ano_mes ON public.ferias_programacao USING btree (empresa_id, ano, mes_previsto)` |
| idx_fprog_ferias | btree | ferias_id | não | sim | `(ferias_id IS NOT NULL)` | `CREATE INDEX idx_fprog_ferias ON public.ferias_programacao USING btree (ferias_id) WHERE (ferias_id IS NOT NULL)` |
| idx_fprog_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_fprog_status ON public.ferias_programacao USING btree (empresa_id, status)` |
| uq_fprog_unico_ativo | btree | colaborador_id, ano, periodo_aquisitivo_id | sim | sim | `(status <> 'cancelado'::programacao_ferias_status)` | `CREATE UNIQUE INDEX uq_fprog_unico_ativo ON public.ferias_programacao USING btree (colaborador_id, ano, periodo_aquisitivo_id) WHERE (status <> 'cancelado'::programacao_ferias_status)` |


## Policies (RLS)

### `fprog_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))` |
| WITH CHECK |  |

### `fprog_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `user_belongs_to_empresa(auth.uid(), empresa_id)` |

### `fprog_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_belongs_to_empresa(auth.uid(), empresa_id) OR (EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = ferias_programacao.colaborador_id) AND (c.email = (( SELECT users.email            FROM auth.users           WHERE (users.id = auth.uid())))::text)))))` |
| WITH CHECK |  |

### `fprog_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_belongs_to_empresa(auth.uid(), empresa_id) AND (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'rh'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))` |
| WITH CHECK | `user_belongs_to_empresa(auth.uid(), empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fprog_updated_at | BEFORE | UPDATE | ROW | enabled | public.fprog_touch_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
