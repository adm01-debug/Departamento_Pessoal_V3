# public.premiacoes_regras

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
| 2 | `campanha_id` | `uuid` | não |  |  |  |
| 3 | `titulo` | `text` | não |  |  |  |
| 4 | `tipo_calculo` | `text` | não |  |  |  |
| 5 | `valor_base` | `numeric(12,2)` | sim |  |  |  |
| 6 | `meta_id` | `uuid` | sim |  |  |  |
| 7 | `configuracao` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| premiacoes_regras_campanha_id_fkey | FOREIGN KEY | `FOREIGN KEY (campanha_id) REFERENCES premiacoes_campanhas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| premiacoes_regras_meta_id_fkey | FOREIGN KEY | `FOREIGN KEY (meta_id) REFERENCES metas_okrs(id)` | NO ACTION | NO ACTION | sim |
| premiacoes_regras_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.premiacoes_pagamentos | premiacoes_pagamentos_regra_id_fkey | regra_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_premiacoes_regras_campanha_id | btree | campanha_id | não | sim |  | `CREATE INDEX idx_premiacoes_regras_campanha_id ON public.premiacoes_regras USING btree (campanha_id)` |
| idx_premiacoes_regras_meta_id | btree | meta_id | não | sim |  | `CREATE INDEX idx_premiacoes_regras_meta_id ON public.premiacoes_regras USING btree (meta_id)` |
| premiacoes_regras_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX premiacoes_regras_pkey ON public.premiacoes_regras USING btree (id)` |


## Policies (RLS)

### `Premiacoes regras scoped`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM premiacoes_campanhas pc   WHERE ((pc.id = premiacoes_regras.campanha_id) AND pertence_a_empresa(pc.empresa_id))))` |
| WITH CHECK |  |

### `Premiacoes regras update admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))` |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))` |

### `Premiacoes regras write admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
