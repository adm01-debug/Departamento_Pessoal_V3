# public.epis_entregas

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
| 2 | `epi_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `empresa_id` | `uuid` | sim |  |  |  |
| 5 | `data_entrega` | `date` | não |  |  |  |
| 6 | `data_devolucao` | `date` | sim |  |  |  |
| 7 | `quantidade` | `integer` | sim | `1` |  |  |
| 8 | `motivo` | `text` | sim | `'novo'::text` |  |  |
| 9 | `assinatura_url` | `text` | sim |  |  |  |
| 10 | `observacoes` | `text` | sim |  |  |  |
| 11 | `entregue_por` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `hash_integridade` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| epis_devolucao_coerente | CHECK | `CHECK (data_devolucao IS NULL OR data_devolucao >= data_entrega)` |  |  | sim |
| epis_entregas_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| epis_entregas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| epis_entregas_epi_id_fkey | FOREIGN KEY | `FOREIGN KEY (epi_id) REFERENCES epis(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| epis_entregas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| epis_entregas_qtd_positiva | CHECK | `CHECK (COALESCE(quantidade, 1) > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| epis_entregas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX epis_entregas_pkey ON public.epis_entregas USING btree (id)` |
| idx_epis_entregas_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_epis_entregas_colaborador_id ON public.epis_entregas USING btree (colaborador_id)` |
| idx_epis_entregas_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_epis_entregas_empresa_id ON public.epis_entregas USING btree (empresa_id)` |
| idx_epis_entregas_epi_id | btree | epi_id | não | sim |  | `CREATE INDEX idx_epis_entregas_epi_id ON public.epis_entregas USING btree (epi_id)` |


## Policies (RLS)

### `epis_entregas_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `epis_entregas_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `epis_entregas_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `epis_entregas_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_enforce_epi_entrega_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_epi_entrega_hash |
| tr_impedir_alteracao_epi_entrega_assinada | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_epi_entrega_assinada |
| tr_proibir_delete_epi_entrega_assinada | BEFORE | DELETE | ROW | enabled | public.proibir_delete_epi_entrega_assinada |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
