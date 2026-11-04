# public.treinamento_participantes

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
| 2 | `treinamento_id` | `uuid` | não |  |  |  |
| 3 | `colaborador_id` | `uuid` | não |  |  |  |
| 4 | `presente` | `boolean` | sim | `false` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| treinamento_participantes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| treinamento_participantes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| treinamento_participantes_treinamento_id_fkey | FOREIGN KEY | `FOREIGN KEY (treinamento_id) REFERENCES treinamentos(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_treinamento_participantes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_treinamento_participantes_colaborador_id ON public.treinamento_participantes USING btree (colaborador_id)` |
| idx_treinamento_participantes_treinamento_id | btree | treinamento_id | não | sim |  | `CREATE INDEX idx_treinamento_participantes_treinamento_id ON public.treinamento_participantes USING btree (treinamento_id)` |
| treinamento_participantes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX treinamento_participantes_pkey ON public.treinamento_participantes USING btree (id)` |


## Policies (RLS)

### `tenant_treinamento_participantes`

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
