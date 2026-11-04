# public.ciclos_avaliacao

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
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `descricao` | `text` | sim |  |  |  |
| 5 | `data_inicio` | `date` | não |  |  |  |
| 6 | `data_fim` | `date` | não |  |  |  |
| 7 | `status` | `text` | não | `'rascunho'::text` |  |  |
| 8 | `tipo` | `text` | sim | `'anual'::text` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_ciclos_avaliacao_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['rascunho'::text, 'ativo'::text, 'em_andamento'::text, 'concluido'::text, 'cancelado'::text, 'arquivado'::text])))` |  |  | sim |
| chk_ciclos_avaliacao_tipo | CHECK | `CHECK (tipo IS NULL OR (tipo = ANY (ARRAY['desempenho'::text, '360'::text, 'competencias'::text, 'okr'::text, 'pdi'::text, 'experiencia'::text, 'anual'::text, 'semestral'::text, 'trimestral'::text])))` |  |  | sim |
| ciclos_avaliacao_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| ciclos_avaliacao_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.feedbacks_360 | feedbacks_360_ciclo_id_fkey | ciclo_id | SET NULL |
| public.metas_okrs | metas_okrs_ciclo_id_fkey | ciclo_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ciclos_avaliacao_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ciclos_avaliacao_pkey ON public.ciclos_avaliacao USING btree (id)` |
| idx_ciclos_avaliacao_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ciclos_avaliacao_empresa_id ON public.ciclos_avaliacao USING btree (empresa_id)` |


## Policies (RLS)

### `ciclos_avaliacao_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND pode_gerir_avaliacoes())` |
| WITH CHECK |  |

### `ciclos_avaliacao_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND pode_gerir_avaliacoes())` |

### `ciclos_avaliacao_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `ciclos_avaliacao_update`

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
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| ciclos_bloqueio_exclusao_com_dependencias | BEFORE | DELETE | ROW | enabled | public.bloquear_exclusao_ciclo_com_dependencias |
| ciclos_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_ciclos_status_transition |
| update_ciclos_avaliacao_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
