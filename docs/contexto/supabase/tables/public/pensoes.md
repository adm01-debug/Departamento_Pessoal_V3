# public.pensoes

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
| 3 | `beneficiario` | `text` | não |  |  |  |
| 4 | `cpf_beneficiario` | `text` | sim |  |  |  |
| 5 | `percentual` | `numeric` | sim | `0` |  |  |
| 6 | `valor_fixo` | `numeric` | sim | `0` |  |  |
| 7 | `tipo` | `text` | sim | `'judicial'::text` |  |  |
| 8 | `banco` | `text` | sim |  |  |  |
| 9 | `agencia` | `text` | sim |  |  |  |
| 10 | `conta` | `text` | sim |  |  |  |
| 11 | `ativo` | `boolean` | sim | `true` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pensoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pensoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pensoes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_pensoes_colaborador_id ON public.pensoes USING btree (colaborador_id)` |
| pensoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pensoes_pkey ON public.pensoes USING btree (id)` |


## Policies (RLS)

### `tenant_pensoes`

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
