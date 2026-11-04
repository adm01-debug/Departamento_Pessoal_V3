# public.cnab_itens

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
| 2 | `remessa_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `nome_favorecido` | `text` | não |  |  |  |
| 5 | `cpf_cnpj_favorecido` | `text` | não |  |  |  |
| 6 | `banco_favorecido` | `text` | sim |  |  |  |
| 7 | `agencia_favorecido` | `text` | sim |  |  |  |
| 8 | `conta_favorecido` | `text` | sim |  |  |  |
| 9 | `valor_pagamento` | `numeric(18,2)` | não |  |  |  |
| 10 | `data_pagamento` | `date` | não |  |  |  |
| 11 | `tipo_pagamento` | `text` | sim |  |  |  |
| 12 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `folha_item_id` | `uuid` | sim |  |  |  |
| 15 | `seu_numero` | `text` | sim |  |  |  |
| 16 | `codigo_ocorrencia` | `text` | sim |  |  |  |
| 17 | `mensagem_ocorrencia` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cnab_itens_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| cnab_itens_folha_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_item_id) REFERENCES folha_itens(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| cnab_itens_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| cnab_itens_remessa_id_fkey | FOREIGN KEY | `FOREIGN KEY (remessa_id) REFERENCES cnab_remessas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| cnab_itens_valor_positivo | CHECK | `CHECK (valor_pagamento > 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cnab_itens_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cnab_itens_pkey ON public.cnab_itens USING btree (id)` |
| cnab_itens_remessa_seu_numero_uk | btree | remessa_id, seu_numero | sim | sim | `(seu_numero IS NOT NULL)` | `CREATE UNIQUE INDEX cnab_itens_remessa_seu_numero_uk ON public.cnab_itens USING btree (remessa_id, seu_numero) WHERE (seu_numero IS NOT NULL)` |
| idx_cnab_itens_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_cnab_itens_colaborador_id ON public.cnab_itens USING btree (colaborador_id)` |
| idx_cnab_itens_folha_item_id | btree | folha_item_id | não | sim |  | `CREATE INDEX idx_cnab_itens_folha_item_id ON public.cnab_itens USING btree (folha_item_id)` |
| idx_cnab_itens_remessa_id | btree | remessa_id | não | sim |  | `CREATE INDEX idx_cnab_itens_remessa_id ON public.cnab_itens USING btree (remessa_id)` |
| idx_cnab_itens_seu_numero | btree | seu_numero | não | sim |  | `CREATE INDEX idx_cnab_itens_seu_numero ON public.cnab_itens USING btree (seu_numero)` |


## Policies (RLS)

### `cnab_itens_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM cnab_remessas r   WHERE ((r.id = cnab_itens.remessa_id) AND pode_gerir_rh(r.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM cnab_remessas r   WHERE ((r.id = cnab_itens.remessa_id) AND pode_gerir_rh(r.empresa_id))))` |

### `cnab_itens_tenant_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM cnab_remessas r   WHERE ((r.id = cnab_itens.remessa_id) AND pode_gerir_rh(r.empresa_id))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
