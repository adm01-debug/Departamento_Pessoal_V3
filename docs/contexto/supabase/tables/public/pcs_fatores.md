# public.pcs_fatores

> Server-validated weighted PCS factors and allowed scores.

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
| 2 | `plano_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `peso` | `numeric(8,4)` | não | `1` |  |  |
| 6 | `ordem` | `integer` | não | `0` |  |  |
| 7 | `graus` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pcs_fatores_nome_check | CHECK | `CHECK (length(btrim(nome)) >= 1 AND length(btrim(nome)) <= 160)` |  |  | sim |
| pcs_fatores_ordem_check | CHECK | `CHECK (ordem >= 0)` |  |  | sim |
| pcs_fatores_peso_check | CHECK | `CHECK (peso > 0::numeric AND peso <= 1000::numeric)` |  |  | sim |
| pcs_fatores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pcs_fatores_plano_id_fkey | FOREIGN KEY | `FOREIGN KEY (plano_id) REFERENCES pcs_planos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pcs_fatores_plano_id_nome_key | UNIQUE | `UNIQUE (plano_id, nome)` |  |  | sim |
| pcs_fatores_plano_id_ordem_key | UNIQUE | `UNIQUE (plano_id, ordem)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pcs_fatores_plano | btree | plano_id, ordem | não | sim |  | `CREATE INDEX idx_pcs_fatores_plano ON public.pcs_fatores USING btree (plano_id, ordem)` |
| pcs_fatores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pcs_fatores_pkey ON public.pcs_fatores USING btree (id)` |
| pcs_fatores_plano_id_nome_key | btree | plano_id, nome | sim | sim |  | `CREATE UNIQUE INDEX pcs_fatores_plano_id_nome_key ON public.pcs_fatores USING btree (plano_id, nome)` |
| pcs_fatores_plano_id_ordem_key | btree | plano_id, ordem | sim | sim |  | `CREATE UNIQUE INDEX pcs_fatores_plano_id_ordem_key ON public.pcs_fatores USING btree (plano_id, ordem)` |


## Policies (RLS)

### `pcs_fatores_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pcs_pode_ver_plano(plano_id)` |
| WITH CHECK |  |

### `pcs_fatores_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pcs_pode_gerir_plano(plano_id)` |
| WITH CHECK | `pcs_pode_gerir_plano(plano_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pcs_validate_factor | BEFORE | INSERT OR UPDATE | ROW | enabled | public.pcs_validate_factor |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
