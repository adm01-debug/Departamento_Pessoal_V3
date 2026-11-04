# public.promocoes

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
| 3 | `cargo_anterior_id` | `uuid` | sim |  |  |  |
| 4 | `cargo_novo_id` | `uuid` | sim |  |  |  |
| 5 | `salario_anterior` | `numeric` | sim |  |  |  |
| 6 | `salario_novo` | `numeric` | sim |  |  |  |
| 7 | `data_vigencia` | `text` | não |  |  |  |
| 8 | `motivo` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| promocoes_cargo_anterior_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_anterior_id) REFERENCES cargos(id)` | NO ACTION | NO ACTION | sim |
| promocoes_cargo_novo_id_fkey | FOREIGN KEY | `FOREIGN KEY (cargo_novo_id) REFERENCES cargos(id)` | NO ACTION | NO ACTION | sim |
| promocoes_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| promocoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| promocoes_salarios_nao_negativos | CHECK | `CHECK ((salario_anterior IS NULL OR salario_anterior >= 0::numeric) AND (salario_novo IS NULL OR salario_novo >= 0::numeric))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_promocoes_cargo_anterior_id | btree | cargo_anterior_id | não | sim |  | `CREATE INDEX idx_promocoes_cargo_anterior_id ON public.promocoes USING btree (cargo_anterior_id)` |
| idx_promocoes_cargo_novo_id | btree | cargo_novo_id | não | sim |  | `CREATE INDEX idx_promocoes_cargo_novo_id ON public.promocoes USING btree (cargo_novo_id)` |
| idx_promocoes_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_promocoes_colaborador_id ON public.promocoes USING btree (colaborador_id)` |
| promocoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX promocoes_pkey ON public.promocoes USING btree (id)` |


## Policies (RLS)

### `tenant_promocoes`

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
