# public.pdis

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
| 4 | `titulo` | `text` | não |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `competencia` | `text` | sim |  |  |  |
| 7 | `acao` | `text` | sim |  |  |  |
| 8 | `prazo` | `date` | sim |  |  |  |
| 9 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 10 | `progresso` | `numeric` | sim | `0` |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_pdis_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['rascunho'::text, 'ativo'::text, 'em_andamento'::text, 'pausado'::text, 'concluido'::text, 'cancelado'::text, 'vencido'::text])))` |  |  | sim |
| pdis_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| pdis_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| pdis_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pdis_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_pdis_colaborador_id ON public.pdis USING btree (colaborador_id)` |
| idx_pdis_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_pdis_empresa_id ON public.pdis USING btree (empresa_id)` |
| pdis_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pdis_pkey ON public.pdis USING btree (id)` |


## Policies (RLS)

### `pdis_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `pdis_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `pdis_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `pdis_update`

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
| pdis_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_pdis_status_transition |
| update_pdis_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
