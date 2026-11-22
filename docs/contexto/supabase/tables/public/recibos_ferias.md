# public.recibos_ferias

> Registro do recibo de férias baixado pelo RH (FeriasActions.tsx). Metadado de emissão — o PDF é gerado no navegador e não é arquivado aqui.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `valor` | `numeric(15,2)` | sim | `0` |  |  |
| 6 | `data_inicio` | `date` | sim |  |  |  |
| 7 | `data_fim` | `date` | sim |  |  |  |
| 8 | `ativo` | `boolean` | sim | `true` |  |  |
| 9 | `observacoes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |
| 13 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| recibos_ferias_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recibos_ferias_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| recibos_ferias_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| recibos_ferias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| recibos_ferias_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_recibos_ferias_colaborador | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_recibos_ferias_colaborador ON public.recibos_ferias USING btree (colaborador_id)` |
| idx_recibos_ferias_empresa_data | btree | empresa_id, data_inicio | não | sim |  | `CREATE INDEX idx_recibos_ferias_empresa_data ON public.recibos_ferias USING btree (empresa_id, data_inicio DESC)` |
| recibos_ferias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX recibos_ferias_pkey ON public.recibos_ferias USING btree (id)` |


## Policies (RLS)

### `recibos_ferias_rh_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK |  |

### `recibos_ferias_rh_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `recibos_ferias_rh_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK |  |

### `recibos_ferias_rh_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_recibos_ferias_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_recibos_ferias_validar | BEFORE | INSERT OR UPDATE | ROW | enabled | public.recibos_ferias_validar |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
