# public.periodos_experiencia

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
| 3 | `data_inicio` | `date` | não |  |  |  |
| 4 | `primeira_etapa_fim` | `date` | sim |  |  |  |
| 5 | `segunda_etapa_fim` | `date` | sim |  |  |  |
| 6 | `dias_total` | `integer` | sim | `90` |  |  |
| 7 | `tipo` | `text` | sim | `'45+45'::text` |  |  |
| 8 | `status` | `text` | sim | `'em_andamento'::text` |  |  |
| 9 | `observacoes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| periodos_experiencia_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| periodos_experiencia_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_periodos_experiencia_col | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_periodos_experiencia_col ON public.periodos_experiencia USING btree (colaborador_id)` |
| idx_periodos_experiencia_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_periodos_experiencia_colaborador_id ON public.periodos_experiencia USING btree (colaborador_id)` |
| periodos_experiencia_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX periodos_experiencia_pkey ON public.periodos_experiencia USING btree (id)` |


## Policies (RLS)

### `tenant_periodos_experiencia`

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
