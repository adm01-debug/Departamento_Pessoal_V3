# public.jornadas_horarios

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
| 2 | `jornada_id` | `uuid` | não |  |  |  |
| 3 | `dia_semana` | `integer` | não |  |  |  |
| 4 | `entrada` | `time without time zone` | sim |  |  |  |
| 5 | `saida` | `time without time zone` | sim |  |  |  |
| 6 | `intervalo_inicio` | `time without time zone` | sim |  |  |  |
| 7 | `intervalo_fim` | `time without time zone` | sim |  |  |  |
| 8 | `dia_util` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| jornadas_horarios_dia_valido | CHECK | `CHECK (dia_semana >= 0 AND dia_semana <= 7)` |  |  | sim |
| jornadas_horarios_jornada_id_dia_semana_key | UNIQUE | `UNIQUE (jornada_id, dia_semana)` |  |  | sim |
| jornadas_horarios_jornada_id_fkey | FOREIGN KEY | `FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| jornadas_horarios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| jornadas_horarios_jornada_id_dia_semana_key | btree | jornada_id, dia_semana | sim | sim |  | `CREATE UNIQUE INDEX jornadas_horarios_jornada_id_dia_semana_key ON public.jornadas_horarios USING btree (jornada_id, dia_semana)` |
| jornadas_horarios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX jornadas_horarios_pkey ON public.jornadas_horarios USING btree (id)` |


## Policies (RLS)

### `jh_mod`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(jornada_id IN ( SELECT jornadas.id    FROM jornadas   WHERE (jornadas.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |
| WITH CHECK | `(jornada_id IN ( SELECT jornadas.id    FROM jornadas   WHERE (jornadas.empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
