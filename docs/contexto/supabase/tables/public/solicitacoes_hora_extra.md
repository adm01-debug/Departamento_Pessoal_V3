# public.solicitacoes_hora_extra

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `data` | `date` | não |  |  |  |
| 5 | `horas_solicitadas` | `numeric(5,2)` | não |  |  |  |
| 6 | `motivo` | `text` | não |  |  |  |
| 7 | `status` | `text` | não | `'pendente'::text` |  |  |
| 8 | `aprovado_por` | `uuid` | sim |  |  |  |
| 9 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 10 | `observacoes_aprovador` | `text` | sim |  |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| solicitacoes_hora_extra_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| solicitacoes_hora_extra_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| solicitacoes_hora_extra_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_solicitacoes_hora_extra_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_solicitacoes_hora_extra_colaborador_id ON public.solicitacoes_hora_extra USING btree (colaborador_id)` |
| idx_solicitacoes_hora_extra_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_solicitacoes_hora_extra_empresa_id ON public.solicitacoes_hora_extra USING btree (empresa_id)` |
| solicitacoes_hora_extra_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX solicitacoes_hora_extra_pkey ON public.solicitacoes_hora_extra USING btree (id)` |


## Policies (RLS)

### `tenant_solicitacoes_hora_extra`

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
| update_solicitacoes_hora_extra_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
