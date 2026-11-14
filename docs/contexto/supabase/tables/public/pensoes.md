# public.pensoes

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
| 13 | `empresa_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pensoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pensoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| pensoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pensoes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_pensoes_colaborador_id ON public.pensoes USING btree (colaborador_id)` |
| idx_pensoes_empresa_ativo | btree | empresa_id | não | sim | `(ativo IS TRUE)` | `CREATE INDEX idx_pensoes_empresa_ativo ON public.pensoes USING btree (empresa_id) WHERE (ativo IS TRUE)` |
| idx_pensoes_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_pensoes_empresa_id ON public.pensoes USING btree (empresa_id)` |
| pensoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pensoes_pkey ON public.pensoes USING btree (id)` |


## Policies (RLS)

### `pensoes_rh_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = pensoes.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK |  |

### `pensoes_rh_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = pensoes.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |

### `pensoes_rh_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = pensoes.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = pensoes.colaborador_id) AND pode_gerir_rh(c.empresa_id))))` |

### `pensoes_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(colaborador_id IN ( SELECT c.id    FROM colaboradores c   WHERE (c.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pensoes_set_empresa | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_pensoes_set_empresa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
