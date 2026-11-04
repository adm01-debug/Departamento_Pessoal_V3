# public.metas_okrs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `colaborador_id` | `uuid` | sim |  |  |  |
| 4 | `ciclo_id` | `uuid` | sim |  |  |  |
| 5 | `titulo` | `text` | não |  |  |  |
| 6 | `descricao` | `text` | sim |  |  |  |
| 7 | `tipo` | `text` | sim | `'individual'::text` |  |  |
| 8 | `progresso` | `numeric` | sim | `0` |  |  |
| 9 | `meta_valor` | `numeric` | sim |  |  |  |
| 10 | `valor_atual` | `numeric` | sim |  |  |  |
| 11 | `data_limite` | `date` | sim |  |  |  |
| 12 | `status` | `text` | sim | `'em_andamento'::text` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| metas_okrs_ciclo_id_fkey | FOREIGN KEY | `FOREIGN KEY (ciclo_id) REFERENCES ciclos_avaliacao(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| metas_okrs_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| metas_okrs_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| metas_okrs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.premiacoes_regras | premiacoes_regras_meta_id_fkey | meta_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_metas_okrs_ciclo_id | btree | ciclo_id | não | sim |  | `CREATE INDEX idx_metas_okrs_ciclo_id ON public.metas_okrs USING btree (ciclo_id)` |
| idx_metas_okrs_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_metas_okrs_colaborador_id ON public.metas_okrs USING btree (colaborador_id)` |
| idx_metas_okrs_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_metas_okrs_empresa_id ON public.metas_okrs USING btree (empresa_id)` |
| metas_okrs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX metas_okrs_pkey ON public.metas_okrs USING btree (id)` |


## Policies (RLS)

### `Metas acessíveis por empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |
| WITH CHECK | `((empresa_id IS NULL) OR pertence_a_empresa(empresa_id))` |

### `metas_okrs_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `metas_okrs_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `metas_okrs_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `metas_okrs_update`

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
| set_timestamp_metas_okrs | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| update_metas_okrs_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
