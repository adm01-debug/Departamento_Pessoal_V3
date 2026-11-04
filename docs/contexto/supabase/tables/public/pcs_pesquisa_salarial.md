# public.pcs_pesquisa_salarial

> Tenant-scoped external salary benchmark observations.

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
| 3 | `cargo_id` | `uuid` | sim |  |  |  |
| 4 | `cargo_referencia` | `text` | não |  |  |  |
| 5 | `fonte` | `text` | não |  |  |  |
| 6 | `data_referencia` | `date` | não |  |  |  |
| 7 | `regiao` | `text` | sim |  |  |  |
| 8 | `amostra` | `integer` | sim |  |  |  |
| 9 | `p25` | `numeric(14,2)` | sim |  |  |  |
| 10 | `p50` | `numeric(14,2)` | sim |  |  |  |
| 11 | `p75` | `numeric(14,2)` | sim |  |  |  |
| 12 | `p90` | `numeric(14,2)` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pcs_pesquisa_percentis_coerentes | CHECK | `CHECK ((p25 IS NULL OR p50 IS NULL OR p25 <= p50) AND (p50 IS NULL OR p75 IS NULL OR p50 <= p75) AND (p75 IS NULL OR p90 IS NULL OR p75 <= p90))` |  |  | sim |
| pcs_pesquisa_salarial_amostra_check | CHECK | `CHECK (amostra IS NULL OR amostra > 0)` |  |  | sim |
| pcs_pesquisa_salarial_cargo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| pcs_pesquisa_salarial_cargo_referencia_check | CHECK | `CHECK (length(btrim(cargo_referencia)) >= 1 AND length(btrim(cargo_referencia)) <= 160)` |  |  | sim |
| pcs_pesquisa_salarial_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pcs_pesquisa_salarial_fonte_check | CHECK | `CHECK (length(btrim(fonte)) >= 1 AND length(btrim(fonte)) <= 240)` |  |  | sim |
| pcs_pesquisa_salarial_p25_check | CHECK | `CHECK (p25 IS NULL OR p25 >= 0::numeric)` |  |  | sim |
| pcs_pesquisa_salarial_p50_check | CHECK | `CHECK (p50 IS NULL OR p50 >= 0::numeric)` |  |  | sim |
| pcs_pesquisa_salarial_p75_check | CHECK | `CHECK (p75 IS NULL OR p75 >= 0::numeric)` |  |  | sim |
| pcs_pesquisa_salarial_p90_check | CHECK | `CHECK (p90 IS NULL OR p90 >= 0::numeric)` |  |  | sim |
| pcs_pesquisa_salarial_percentis_coerentes | CHECK | `CHECK ((p25 IS NULL OR p50 IS NULL OR p25 <= p50) AND (p50 IS NULL OR p75 IS NULL OR p50 <= p75) AND (p75 IS NULL OR p90 IS NULL OR p75 <= p90))` |  |  | sim |
| pcs_pesquisa_salarial_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pcs_pesquisa_cargo | btree | cargo_id | não | sim | `(cargo_id IS NOT NULL)` | `CREATE INDEX idx_pcs_pesquisa_cargo ON public.pcs_pesquisa_salarial USING btree (cargo_id) WHERE (cargo_id IS NOT NULL)` |
| idx_pcs_pesquisa_empresa | btree | empresa_id, data_referencia | não | sim |  | `CREATE INDEX idx_pcs_pesquisa_empresa ON public.pcs_pesquisa_salarial USING btree (empresa_id, data_referencia DESC)` |
| pcs_pesquisa_salarial_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pcs_pesquisa_salarial_pkey ON public.pcs_pesquisa_salarial USING btree (id)` |


## Policies (RLS)

### `pcs_pesquisa_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin(auth.uid()) OR (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))` |
| WITH CHECK |  |

### `pcs_pesquisa_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pcs_pesquisa_salarial_updated_at | BEFORE | UPDATE | ROW | enabled | public.pcs_touch_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
