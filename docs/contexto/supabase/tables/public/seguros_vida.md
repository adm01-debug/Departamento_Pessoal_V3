# public.seguros_vida

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
| 4 | `seguradora` | `text` | sim |  |  |  |
| 5 | `numero_apolice` | `text` | sim |  |  |  |
| 6 | `capital_segurado` | `numeric` | sim | `0` |  |  |
| 7 | `premio_mensal` | `numeric` | sim | `0` |  |  |
| 8 | `data_inicio` | `date` | sim |  |  |  |
| 9 | `data_fim` | `date` | sim |  |  |  |
| 10 | `ativo` | `boolean` | sim | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `apolice_numero` | `text` | sim |  |  |  |
| 13 | `data_vencimento_apolice` | `date` | sim |  |  |  |
| 14 | `possui_assistencia_funeral` | `boolean` | sim | `false` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seguros_vida_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| seguros_vida_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| seguros_vida_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.beneficiarios_seguro | beneficiarios_seguro_seguro_vida_id_fkey | seguro_vida_id | CASCADE |
| public.seguros_colaboradores | seguros_colaboradores_seguro_vida_id_fkey | seguro_vida_id | CASCADE |
| public.sinistros_seguro | sinistros_seguro_seguro_vida_id_fkey | seguro_vida_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seguros_vida_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_seguros_vida_colaborador_id ON public.seguros_vida USING btree (colaborador_id)` |
| idx_seguros_vida_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_seguros_vida_empresa_id ON public.seguros_vida USING btree (empresa_id)` |
| seguros_vida_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seguros_vida_pkey ON public.seguros_vida USING btree (id)` |


## Policies (RLS)

### `seguros_vida_rh_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK |  |

### `seguros_vida_rh_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `seguros_vida_rh_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `pode_gerir_rh(empresa_id)` |
| WITH CHECK | `pode_gerir_rh(empresa_id)` |

### `seguros_vida_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_seguros_vida_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
