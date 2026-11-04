# public.eventos_variaveis

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
| usada por views | public.v_ferias_folha_reconciliacao |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `competencia` | `text` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `rubrica_id` | `uuid` | não |  |  |  |
| 5 | `referencia` | `numeric(10,2)` | sim |  |  |  |
| 6 | `valor` | `numeric(12,2)` | não |  |  |  |
| 7 | `observacao` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `created_by` | `uuid` | sim |  |  |  |
| 10 | `origem_ferias_id` | `uuid` | sim |  |  |  |
| 11 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| eventos_variaveis_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| eventos_variaveis_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| eventos_variaveis_origem_ferias_id_fkey | FOREIGN KEY | `FOREIGN KEY (origem_ferias_id) REFERENCES ferias(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| eventos_variaveis_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| eventos_variaveis_rubrica_id_fkey | FOREIGN KEY | `FOREIGN KEY (rubrica_id) REFERENCES rubricas_folha(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| eventos_variaveis_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX eventos_variaveis_pkey ON public.eventos_variaveis USING btree (id)` |
| idx_eventos_variaveis_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_eventos_variaveis_colaborador_id ON public.eventos_variaveis USING btree (colaborador_id)` |
| idx_eventos_variaveis_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_eventos_variaveis_created_by ON public.eventos_variaveis USING btree (created_by)` |
| idx_eventos_variaveis_origem_ferias | btree | origem_ferias_id | não | sim |  | `CREATE INDEX idx_eventos_variaveis_origem_ferias ON public.eventos_variaveis USING btree (origem_ferias_id)` |
| idx_eventos_variaveis_rubrica_id | btree | rubrica_id | não | sim |  | `CREATE INDEX idx_eventos_variaveis_rubrica_id ON public.eventos_variaveis USING btree (rubrica_id)` |
| uq_eventos_variaveis_ferias_rubrica | btree | origem_ferias_id, rubrica_id | sim | sim | `(origem_ferias_id IS NOT NULL)` | `CREATE UNIQUE INDEX uq_eventos_variaveis_ferias_rubrica ON public.eventos_variaveis USING btree (origem_ferias_id, rubrica_id) WHERE (origem_ferias_id IS NOT NULL)` |


## Policies (RLS)

### `tenant_eventos_variaveis`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
