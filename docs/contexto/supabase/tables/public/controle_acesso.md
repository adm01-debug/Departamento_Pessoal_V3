# public.controle_acesso

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
| 3 | `tipo` | `text` | não |  |  |  |
| 4 | `metodo` | `text` | sim | `'manual'::text` |  |  |
| 5 | `local` | `text` | sim |  |  |  |
| 6 | `area` | `text` | sim |  |  |  |
| 7 | `latitude` | `numeric(10,7)` | sim |  |  |  |
| 8 | `longitude` | `numeric(10,7)` | sim |  |  |  |
| 9 | `ip_address` | `text` | sim |  |  |  |
| 10 | `dispositivo` | `text` | sim |  |  |  |
| 11 | `empresa_id` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| controle_acesso_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| controle_acesso_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| controle_acesso_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| controle_acesso_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX controle_acesso_pkey ON public.controle_acesso USING btree (id)` |
| idx_controle_acesso_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_controle_acesso_colaborador_id ON public.controle_acesso USING btree (colaborador_id)` |
| idx_controle_acesso_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_controle_acesso_empresa_id ON public.controle_acesso USING btree (empresa_id)` |


## Policies (RLS)

### `empresa_controle_acesso`

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
| tr_updated_at_controle_acesso | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
