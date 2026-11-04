# public.ferias_reconciliacao_logs

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
| 2 | `executado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `verificadas` | `integer` | não | `0` |  |  |
| 4 | `corrigidas` | `integer` | não | `0` |  |  |
| 5 | `restantes` | `integer` | não | `0` |  |  |
| 6 | `duracao_ms` | `integer` | não | `0` |  |  |
| 7 | `detalhes` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ferias_reconciliacao_logs_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_reconciliacao_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_reconciliacao_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_reconciliacao_logs_pkey ON public.ferias_reconciliacao_logs USING btree (id)` |
| idx_ferias_reconc_logs_empresa | btree | empresa_id, executado_em | não | sim |  | `CREATE INDEX idx_ferias_reconc_logs_empresa ON public.ferias_reconciliacao_logs USING btree (empresa_id, executado_em DESC)` |
| idx_ferias_reconciliacao_logs_empresa_executado | btree | empresa_id, executado_em | não | sim |  | `CREATE INDEX idx_ferias_reconciliacao_logs_empresa_executado ON public.ferias_reconciliacao_logs USING btree (empresa_id, executado_em DESC)` |
| idx_ferias_reconciliacao_logs_pendencias | btree | empresa_id, executado_em | não | sim | `(restantes > 0)` | `CREATE INDEX idx_ferias_reconciliacao_logs_pendencias ON public.ferias_reconciliacao_logs USING btree (empresa_id, executado_em DESC) WHERE (restantes > 0)` |


## Policies (RLS)

### `reconciliacao_logs_admin_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'rh'::app_role)) AND ((empresa_id IS NULL) OR (EXISTS ( SELECT 1    FROM user_empresas ue   WHERE ((ue.user_id = auth.uid()) AND (ue.empresa_id = ferias_reconciliacao_logs.empresa_id))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ferias_reconciliacao_alert | AFTER | INSERT | ROW | enabled | public.trg_ferias_reconciliacao_alert |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
