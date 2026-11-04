# public.dependentes_beneficios

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
| 2 | `dependente_id` | `uuid` | não |  |  |  |
| 3 | `beneficio_id` | `uuid` | não |  |  |  |
| 4 | `valor_dependente` | `numeric(12,2)` | sim | `0` |  |  |
| 5 | `valor_empresa` | `numeric(12,2)` | sim | `0` |  |  |
| 6 | `ativo` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dependentes_beneficios_beneficio_id_fkey | FOREIGN KEY | `FOREIGN KEY (beneficio_id) REFERENCES beneficios(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dependentes_beneficios_dependente_id_beneficio_id_key | UNIQUE | `UNIQUE (dependente_id, beneficio_id)` |  |  | sim |
| dependentes_beneficios_dependente_id_fkey | FOREIGN KEY | `FOREIGN KEY (dependente_id) REFERENCES dependentes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| dependentes_beneficios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| dependentes_beneficios_dependente_id_beneficio_id_key | btree | dependente_id, beneficio_id | sim | sim |  | `CREATE UNIQUE INDEX dependentes_beneficios_dependente_id_beneficio_id_key ON public.dependentes_beneficios USING btree (dependente_id, beneficio_id)` |
| dependentes_beneficios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX dependentes_beneficios_pkey ON public.dependentes_beneficios USING btree (id)` |
| idx_dependentes_beneficios_beneficio_id | btree | beneficio_id | não | sim |  | `CREATE INDEX idx_dependentes_beneficios_beneficio_id ON public.dependentes_beneficios USING btree (beneficio_id)` |


## Policies (RLS)

### `tenant_dependentes_beneficios`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(dependente_id IN ( SELECT dependentes.id    FROM dependentes   WHERE (dependentes.colaborador_id IN ( SELECT colaboradores.id            FROM colaboradores           WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |
| WITH CHECK | `(dependente_id IN ( SELECT dependentes.id    FROM dependentes   WHERE (dependentes.colaborador_id IN ( SELECT colaboradores.id            FROM colaboradores           WHERE (colaboradores.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
