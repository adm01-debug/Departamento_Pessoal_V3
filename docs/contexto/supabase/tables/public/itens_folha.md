# public.itens_folha

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
| 2 | `folha_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `rubrica_id` | `uuid` | não |  |  |  |
| 5 | `quantidade` | `numeric(10,2)` | sim | `0` |  |  |
| 6 | `valor` | `numeric(15,2)` | não |  |  |  |
| 7 | `referencia` | `character varying(50)` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| itens_folha_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| itens_folha_folha_id_fkey | FOREIGN KEY | `FOREIGN KEY (folha_id) REFERENCES folhas_pagamento(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| itens_folha_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| itens_folha_rubrica_id_fkey | FOREIGN KEY | `FOREIGN KEY (rubrica_id) REFERENCES rubricas_folha(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_itens_folha_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_itens_folha_colaborador_id ON public.itens_folha USING btree (colaborador_id)` |
| idx_itens_folha_folha_id | btree | folha_id | não | sim |  | `CREATE INDEX idx_itens_folha_folha_id ON public.itens_folha USING btree (folha_id)` |
| idx_itens_folha_rubrica_id | btree | rubrica_id | não | sim |  | `CREATE INDEX idx_itens_folha_rubrica_id ON public.itens_folha USING btree (rubrica_id)` |
| itens_folha_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX itens_folha_pkey ON public.itens_folha USING btree (id)` |


## Policies (RLS)

### `Acesso aos itens via folha`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM folhas_pagamento f   WHERE ((f.id = itens_folha.folha_id) AND (f.empresa_id IN ( SELECT user_empresas.empresa_id            FROM user_empresas           WHERE (user_empresas.user_id = auth.uid()))))))` |
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
