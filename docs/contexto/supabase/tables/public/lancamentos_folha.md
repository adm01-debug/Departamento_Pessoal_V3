# public.lancamentos_folha

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
| 2 | `holerite_id` | `uuid` | não |  |  |  |
| 3 | `rubrica_id` | `uuid` | não |  |  |  |
| 4 | `rubrica_codigo` | `text` | não |  |  |  |
| 5 | `rubrica_descricao` | `text` | não |  |  |  |
| 6 | `tipo` | `tipo_evento_folha` | não |  |  |  |
| 7 | `referencia` | `numeric(10,2)` | sim |  |  |  |
| 8 | `valor` | `numeric(12,2)` | não |  |  |  |
| 9 | `automatico` | `boolean` | sim | `false` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lancamentos_folha_holerite_id_fkey | FOREIGN KEY | `FOREIGN KEY (holerite_id) REFERENCES holerites(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| lancamentos_folha_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| lancamentos_folha_rubrica_id_fkey | FOREIGN KEY | `FOREIGN KEY (rubrica_id) REFERENCES rubricas_folha(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lancamentos_folha_holerite_id | btree | holerite_id | não | sim |  | `CREATE INDEX idx_lancamentos_folha_holerite_id ON public.lancamentos_folha USING btree (holerite_id)` |
| idx_lancamentos_folha_rubrica_id | btree | rubrica_id | não | sim |  | `CREATE INDEX idx_lancamentos_folha_rubrica_id ON public.lancamentos_folha USING btree (rubrica_id)` |
| lancamentos_folha_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lancamentos_folha_pkey ON public.lancamentos_folha USING btree (id)` |


## Policies (RLS)

### `lancamentos_folha_rh_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (holerites h      JOIN colaboradores c ON ((c.id = h.colaborador_id)))   WHERE ((h.id = lancamentos_folha.holerite_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (holerites h      JOIN colaboradores c ON ((c.id = h.colaborador_id)))   WHERE ((h.id = lancamentos_folha.holerite_id) AND pode_gerir_rh(c.empresa_id))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
