# public.pcs_avaliacoes_cargo

> Cargo evaluation whose total is always calculated by a trigger.

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
| 3 | `cargo_id` | `uuid` | não |  |  |  |
| 4 | `pontuacoes` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 5 | `pontos_total` | `numeric(14,4)` | não | `0` |  |  |
| 6 | `justificativa` | `text` | sim |  |  |  |
| 7 | `avaliado_por` | `uuid` | não | `auth.uid()` |  |  |
| 8 | `avaliado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pcs_avaliacoes_cargo_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pcs_avaliacoes_cargo_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| pcs_avaliacoes_cargo_plano_id_cargo_id_key | UNIQUE | `UNIQUE (plano_id, cargo_id)` |  |  | sim |
| pcs_avaliacoes_cargo_plano_id_fkey | FOREIGN KEY | `FOREIGN KEY (plano_id) REFERENCES pcs_planos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pcs_avaliacoes_cargo_pontos_total_check | CHECK | `CHECK (pontos_total >= 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pcs_aval_cargo | btree | cargo_id | não | sim |  | `CREATE INDEX idx_pcs_aval_cargo ON public.pcs_avaliacoes_cargo USING btree (cargo_id)` |
| idx_pcs_aval_plano | btree | plano_id, pontos_total | não | sim |  | `CREATE INDEX idx_pcs_aval_plano ON public.pcs_avaliacoes_cargo USING btree (plano_id, pontos_total DESC)` |
| pcs_avaliacoes_cargo_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pcs_avaliacoes_cargo_pkey ON public.pcs_avaliacoes_cargo USING btree (id)` |
| pcs_avaliacoes_cargo_plano_id_cargo_id_key | btree | plano_id, cargo_id | sim | sim |  | `CREATE UNIQUE INDEX pcs_avaliacoes_cargo_plano_id_cargo_id_key ON public.pcs_avaliacoes_cargo USING btree (plano_id, cargo_id)` |


## Policies (RLS)

### `pcs_avaliacoes_cargo_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pcs_pode_ver_plano(plano_id)` |
| WITH CHECK |  |

### `pcs_avaliacoes_cargo_write`

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
| trg_pcs_recalc_pontos | BEFORE | INSERT OR UPDATE | ROW | enabled | public.pcs_recalc_pontos |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
