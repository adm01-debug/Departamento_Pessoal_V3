# public.ferias_solicitacoes

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `data_inicio` | `date` | não |  |  |  |
| 5 | `data_fim` | `date` | não |  |  |  |
| 6 | `dias` | `integer` | sim | `30` |  |  |
| 7 | `abono_pecuniario` | `boolean` | sim | `false` |  |  |
| 8 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 9 | `aprovado_por` | `uuid` | sim |  |  |  |
| 10 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 11 | `observacoes` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ferias_solicitacoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ferias_solicitacoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| ferias_solicitacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ferias_solicitacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ferias_solicitacoes_pkey ON public.ferias_solicitacoes USING btree (id)` |
| idx_ferias_solicitacoes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_ferias_solicitacoes_colaborador_id ON public.ferias_solicitacoes USING btree (colaborador_id)` |
| idx_ferias_solicitacoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ferias_solicitacoes_empresa_id ON public.ferias_solicitacoes USING btree (empresa_id)` |


## Policies (RLS)

### `tenant_ferias_solicitacoes`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_ferias_solicitacoes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.process_ferias_audit |
| update_ferias_solicitacoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
