# public.notificacoes

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
| usada por views | public.vw_alertas_rh |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `mensagem` | `text` | não |  |  |  |
| 6 | `entidade_tipo` | `text` | sim |  |  |  |
| 7 | `entidade_id` | `uuid` | sim |  |  |  |
| 8 | `lida` | `boolean` | sim | `false` |  |  |
| 9 | `data_referencia` | `date` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_notificacoes_tipo | CHECK | `CHECK (tipo IS NULL OR (tipo = ANY (ARRAY['info'::text, 'sucesso'::text, 'aviso'::text, 'erro'::text, 'sistema'::text, 'ponto'::text, 'ferias'::text, 'folha'::text, 'beneficio'::text, 'documento'::text, 'avaliacao'::text, 'treinamento'::text, 'admissao'::text, 'desligamento'::text, 'alerta'::text, 'aprovacao'::text, 'tarefa'::text, 'notificacao'::text, 'ciencia'::text, 'nova_admissao'::text, 'holerites'::text, 'rescisao'::text, 'pdi'::text, 'ferias_vencendo'::text, 'ferias_aprovada'::text, 'ferias_pagamento_d5'::text, 'ferias_reconciliacao'::text, 'sla_reconciliacao_ferias'::text, 'periodo_aquisitivo'::text, 'contrato_vencendo'::text, 'contrato_pendente'::text, 'contrato_gerado'::text, 'contrato_assinatura_pendente'::text, 'documento_vencendo'::text, 'ponto_aprovado'::text, 'ponto_recusado'::text, 'sem_batida'::text, 'medida_aplicada'::text, 'regimento_sst_pendente'::text, 'sst_regimento_pendente'::text])))` |  |  | sim |
| notificacoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| notificacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| notificacoes_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_notif_user_unread | btree | user_id, created_at | não | sim | `(lida = false)` | `CREATE INDEX idx_notif_user_unread ON public.notificacoes USING btree (user_id, created_at DESC) WHERE (lida = false)` |
| idx_notificacoes_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_notificacoes_created_at ON public.notificacoes USING btree (created_at DESC)` |
| idx_notificacoes_empresa_created | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_notificacoes_empresa_created ON public.notificacoes USING btree (empresa_id, created_at DESC)` |
| idx_notificacoes_empresa_created_desc | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_notificacoes_empresa_created_desc ON public.notificacoes USING btree (empresa_id, created_at DESC)` |
| idx_notificacoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_notificacoes_empresa_id ON public.notificacoes USING btree (empresa_id)` |
| idx_notificacoes_lida | btree | lida | não | sim |  | `CREATE INDEX idx_notificacoes_lida ON public.notificacoes USING btree (lida)` |
| idx_notificacoes_tipo | btree | tipo | não | sim |  | `CREATE INDEX idx_notificacoes_tipo ON public.notificacoes USING btree (tipo)` |
| idx_notificacoes_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_notificacoes_user_id ON public.notificacoes USING btree (user_id)` |
| idx_notificacoes_user_unread | btree | user_id, created_at | não | sim | `(lida = false)` | `CREATE INDEX idx_notificacoes_user_unread ON public.notificacoes USING btree (user_id, created_at DESC) WHERE (lida = false)` |
| notificacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX notificacoes_pkey ON public.notificacoes USING btree (id)` |
| uq_notif_ferias_d5_dia | btree | user_id, entidade_tipo, entidade_id, data_referencia | sim | sim | `(tipo = 'ferias_pagamento_d5'::text)` | `CREATE UNIQUE INDEX uq_notif_ferias_d5_dia ON public.notificacoes USING btree (user_id, entidade_tipo, entidade_id, data_referencia) WHERE (tipo = 'ferias_pagamento_d5'::text)` |


## Policies (RLS)

### `Users can manage scoped notifications`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(auth.uid()) OR (user_id = auth.uid()) OR ((empresa_id IS NOT NULL) AND user_belongs_to_empresa(auth.uid(), empresa_id)))` |
| WITH CHECK | `(is_admin(auth.uid()) OR (user_id = auth.uid()) OR ((empresa_id IS NOT NULL) AND user_belongs_to_empresa(auth.uid(), empresa_id)))` |

### `Usuários deletam suas próprias notificações lidas`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((auth.uid() = user_id) AND (lida = true))` |
| WITH CHECK |  |

### `notificacoes_select_policy`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |

### `notificacoes_update_policy`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK | `(lida IS NOT NULL)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_notificacoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
