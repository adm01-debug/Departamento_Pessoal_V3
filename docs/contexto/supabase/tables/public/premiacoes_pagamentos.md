# public.premiacoes_pagamentos

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `campanha_id` | `uuid` | não |  |  |  |
| 4 | `regra_id` | `uuid` | não |  |  |  |
| 5 | `valor_calculado` | `numeric(12,2)` | não |  |  |  |
| 6 | `valor_aprovado` | `numeric(12,2)` | sim |  |  |  |
| 7 | `status` | `text` | não | `'calculado'::text` |  |  |
| 8 | `data_pagamento` | `date` | sim |  |  |  |
| 9 | `observacoes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `integrado_folha` | `boolean` | sim | `false` |  |  |
| 13 | `data_integracao` | `timestamp with time zone` | sim |  |  |  |
| 14 | `referencia_folha` | `text` | sim |  |  |  |
| 15 | `status_conciliacao` | `text` | sim | `'pendente'::text` |  |  |
| 16 | `valor_folha_real` | `numeric(12,2)` | sim |  |  |  |
| 17 | `justificativa_divergencia` | `text` | sim |  |  |  |
| 18 | `logs_calculo` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 19 | `historico_mudancas` | `jsonb` | sim | `'[]'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| prem_pag_valor_aprovado_positivo | CHECK | `CHECK (valor_aprovado IS NULL OR valor_aprovado >= 0::numeric)` |  |  | sim |
| prem_pag_valor_calculado_positivo | CHECK | `CHECK (valor_calculado IS NULL OR valor_calculado >= 0::numeric)` |  |  | sim |
| prem_pag_valor_folha_positivo | CHECK | `CHECK (valor_folha_real IS NULL OR valor_folha_real >= 0::numeric)` |  |  | sim |
| premiacoes_pagamentos_campanha_id_fkey | FOREIGN KEY | `FOREIGN KEY (campanha_id) REFERENCES premiacoes_campanhas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| premiacoes_pagamentos_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| premiacoes_pagamentos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| premiacoes_pagamentos_regra_id_fkey | FOREIGN KEY | `FOREIGN KEY (regra_id) REFERENCES premiacoes_regras(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| premiacoes_pagamentos_status_conciliacao_check | CHECK | `CHECK (status_conciliacao = ANY (ARRAY['pendente'::text, 'conciliado'::text, 'divergente'::text]))` |  |  | sim |
| premiacoes_valores_nao_negativos | CHECK | `CHECK (COALESCE(valor_calculado, 0::numeric) >= 0::numeric AND (valor_aprovado IS NULL OR valor_aprovado >= 0::numeric) AND (valor_folha_real IS NULL OR valor_folha_real >= 0::numeric))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_premiacoes_pagamentos_campanha_id | btree | campanha_id | não | sim |  | `CREATE INDEX idx_premiacoes_pagamentos_campanha_id ON public.premiacoes_pagamentos USING btree (campanha_id)` |
| idx_premiacoes_pagamentos_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_premiacoes_pagamentos_colaborador_id ON public.premiacoes_pagamentos USING btree (colaborador_id)` |
| idx_premiacoes_pagamentos_folha | btree | integrado_folha, referencia_folha | não | sim |  | `CREATE INDEX idx_premiacoes_pagamentos_folha ON public.premiacoes_pagamentos USING btree (integrado_folha, referencia_folha)` |
| idx_premiacoes_pagamentos_regra_id | btree | regra_id | não | sim |  | `CREATE INDEX idx_premiacoes_pagamentos_regra_id ON public.premiacoes_pagamentos USING btree (regra_id)` |
| premiacoes_pagamentos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX premiacoes_pagamentos_pkey ON public.premiacoes_pagamentos USING btree (id)` |


## Policies (RLS)

### `Premiacoes pagamentos scoped`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM premiacoes_campanhas pc   WHERE ((pc.id = premiacoes_pagamentos.campanha_id) AND pertence_a_empresa(pc.empresa_id))))` |
| WITH CHECK |  |

### `Premiacoes pagamentos update admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))` |

### `Premiacoes pagamentos write admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_auditoria_premiacoes_pagamentos | AFTER | INSERT OR UPDATE | ROW | enabled | public.processar_auditoria_premiacao |
| update_premiacoes_pagamentos_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
