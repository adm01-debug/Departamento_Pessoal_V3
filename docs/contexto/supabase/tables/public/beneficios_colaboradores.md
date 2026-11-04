# public.beneficios_colaboradores

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
| 3 | `beneficio_id` | `uuid` | não |  |  |  |
| 4 | `valor_customizado` | `numeric(15,2)` | sim |  |  |  |
| 5 | `data_inicio` | `date` | não |  |  |  |
| 6 | `data_fim` | `date` | sim |  |  |  |
| 7 | `ativo` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| beneficios_colaboradores_beneficio_id_fkey | FOREIGN KEY | `FOREIGN KEY (beneficio_id) REFERENCES beneficios(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficios_colaboradores_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| beneficios_colaboradores_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| beneficios_colaboradores_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX beneficios_colaboradores_pkey ON public.beneficios_colaboradores USING btree (id)` |
| idx_beneficios_colaboradores_beneficio_id | btree | beneficio_id | não | sim |  | `CREATE INDEX idx_beneficios_colaboradores_beneficio_id ON public.beneficios_colaboradores USING btree (beneficio_id)` |
| idx_beneficios_colaboradores_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_beneficios_colaboradores_colaborador_id ON public.beneficios_colaboradores USING btree (colaborador_id)` |


## Policies (RLS)

### `Empresa vê benefícios dos colaboradores`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM colaboradores c   WHERE ((c.id = beneficios_colaboradores.colaborador_id) AND (c.empresa_id IN ( SELECT user_empresas.empresa_id            FROM user_empresas           WHERE (user_empresas.user_id = auth.uid()))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
