# public.transferencias

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
| 3 | `departamento_anterior_id` | `uuid` | sim |  |  |  |
| 4 | `departamento_novo_id` | `uuid` | sim |  |  |  |
| 5 | `data_vigencia` | `text` | não |  |  |  |
| 6 | `motivo` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| transferencias_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| transferencias_departamento_anterior_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_anterior_id) REFERENCES departamentos(id)` | NO ACTION | NO ACTION | sim |
| transferencias_departamento_novo_id_fkey | FOREIGN KEY | `FOREIGN KEY (departamento_novo_id) REFERENCES departamentos(id)` | NO ACTION | NO ACTION | sim |
| transferencias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_transferencias_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_transferencias_colaborador_id ON public.transferencias USING btree (colaborador_id)` |
| idx_transferencias_departamento_anterior_id | btree | departamento_anterior_id | não | sim |  | `CREATE INDEX idx_transferencias_departamento_anterior_id ON public.transferencias USING btree (departamento_anterior_id)` |
| idx_transferencias_departamento_novo_id | btree | departamento_novo_id | não | sim |  | `CREATE INDEX idx_transferencias_departamento_novo_id ON public.transferencias USING btree (departamento_novo_id)` |
| transferencias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX transferencias_pkey ON public.transferencias USING btree (id)` |


## Policies (RLS)

### `tenant_transferencias`

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
