# public.premiacoes_campanhas

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `data_inicio` | `date` | não |  |  |  |
| 6 | `data_fim` | `date` | não |  |  |  |
| 7 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 8 | `orcamento_estimado` | `numeric(12,2)` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `status_aprovacao` | `text` | sim | `'rascunho'::text` |  |  |
| 12 | `comentarios_aprovacao` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 13 | `meta_dados` | `jsonb` | sim | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| premiacoes_campanhas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| premiacoes_campanhas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| premiacoes_campanhas_status_aprovacao_check | CHECK | `CHECK (status_aprovacao = ANY (ARRAY['rascunho'::text, 'revisando'::text, 'aprovado'::text, 'rejeitado'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.premiacoes_pagamentos | premiacoes_pagamentos_campanha_id_fkey | campanha_id | CASCADE |
| public.premiacoes_regras | premiacoes_regras_campanha_id_fkey | campanha_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_premiacoes_campanhas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_premiacoes_campanhas_empresa_id ON public.premiacoes_campanhas USING btree (empresa_id)` |
| premiacoes_campanhas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX premiacoes_campanhas_pkey ON public.premiacoes_campanhas USING btree (id)` |


## Policies (RLS)

### `Users can manage their own company campaigns`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT profiles.user_id    FROM profiles   WHERE (premiacoes_campanhas.empresa_id = premiacoes_campanhas.empresa_id)))` |
| WITH CHECK |  |

### `Users can view their own company campaigns`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() IN ( SELECT profiles.user_id    FROM profiles   WHERE (premiacoes_campanhas.empresa_id = premiacoes_campanhas.empresa_id)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_auditoria_premiacoes_campanhas | AFTER | INSERT OR UPDATE | ROW | enabled | public.processar_auditoria_premiacao |
| update_premiacoes_campanhas_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
