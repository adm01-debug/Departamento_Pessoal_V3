# public.despesas

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
| 3 | `categoria` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | não |  |  |  |
| 5 | `valor` | `numeric(10,2)` | não |  |  |  |
| 6 | `data_despesa` | `date` | não |  |  |  |
| 7 | `comprovante_url` | `text` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 9 | `aprovado_por` | `uuid` | sim |  |  |  |
| 10 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `observacoes_aprovador` | `text` | sim |  |  |  |
| 13 | `empresa_id` | `uuid` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `tipo` | `text` | não | `'reembolso'::text` |  |  |
| 17 | `folha_id` | `uuid` | sim |  |  |  |
| 18 | `rejeitado_motivo` | `text` | sim |  |  |  |
| 19 | `integrado_folha_em` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| despesas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| despesas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| despesas_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| despesas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| despesas_status_check | CHECK | `CHECK (status = ANY (ARRAY['rascunho'::text, 'pendente'::text, 'aprovado'::text, 'rejeitado'::text, 'integrado_folha'::text, 'pago'::text, 'cancelado'::text]))` |  |  | sim |
| despesas_tipo_check | CHECK | `CHECK (tipo = ANY (ARRAY['reembolso'::text, 'adiantamento'::text, 'despesa_viagem'::text, 'material'::text, 'alimentacao'::text, 'transporte'::text, 'outro'::text]))` |  |  | sim |
| despesas_valor_positivo | CHECK | `CHECK (valor > 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.despesas_aprovacoes_log | despesas_aprovacoes_log_despesa_id_fkey | despesa_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| despesas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX despesas_pkey ON public.despesas USING btree (id)` |
| idx_despesas_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_despesas_colaborador ON public.despesas USING btree (colaborador_id)` |
| idx_despesas_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_despesas_colaborador_id ON public.despesas USING btree (colaborador_id)` |
| idx_despesas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_despesas_empresa_id ON public.despesas USING btree (empresa_id)` |
| idx_despesas_empresa_status | btree | empresa_id, status | não | sim |  | `CREATE INDEX idx_despesas_empresa_status ON public.despesas USING btree (empresa_id, status)` |
| idx_despesas_folha | btree | folha_id | não | sim | `(folha_id IS NOT NULL)` | `CREATE INDEX idx_despesas_folha ON public.despesas USING btree (folha_id) WHERE (folha_id IS NOT NULL)` |


## Policies (RLS)

### `empresa_despesas`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_despesas_log | AFTER | INSERT OR UPDATE | ROW | enabled | public.log_despesa_status_change |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
