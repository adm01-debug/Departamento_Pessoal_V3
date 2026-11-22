# public.ponto_rep_horarios

> Jornadas do AtecSoft (tabela HORARIO_LINHAS), uma linha por dia da semana.

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
| 2 | `dispositivo_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `codigo` | `integer` | não |  |  |  |
| 5 | `ident` | `integer` | sim |  |  |  |
| 6 | `dia_semana` | `smallint` | não |  |  |  |
| 7 | `pares` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `tipo_calculo` | `integer` | sim |  |  |  |
| 9 | `tolerancia_falta` | `time without time zone` | sim |  |  |  |
| 10 | `tolerancia_extra` | `time without time zone` | sim |  |  |  |
| 11 | `neutro` | `boolean` | não | `false` |  |  |
| 12 | `fecha` | `boolean` | não | `false` |  |  |
| 13 | `ajuste` | `boolean` | não | `false` |  |  |
| 14 | `folga` | `boolean` | não | `false` |  |  |
| 15 | `extra` | `boolean` | não | `false` |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_horarios_dia_semana_check | CHECK | `CHECK (dia_semana >= 1 AND dia_semana <= 7)` |  |  | sim |
| ponto_rep_horarios_dispositivo_codigo_dia_key | UNIQUE | `UNIQUE (dispositivo_id, codigo, dia_semana)` |  |  | sim |
| ponto_rep_horarios_dispositivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (dispositivo_id) REFERENCES ponto_rep_dispositivos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_horarios_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_horarios_pares_array | CHECK | `CHECK (jsonb_typeof(pares) = 'array'::text)` |  |  | sim |
| ponto_rep_horarios_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_rep_horarios_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ponto_rep_horarios_empresa ON public.ponto_rep_horarios USING btree (empresa_id)` |
| ponto_rep_horarios_dispositivo_codigo_dia_key | btree | dispositivo_id, codigo, dia_semana | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_horarios_dispositivo_codigo_dia_key ON public.ponto_rep_horarios USING btree (dispositivo_id, codigo, dia_semana)` |
| ponto_rep_horarios_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_horarios_pkey ON public.ponto_rep_horarios USING btree (id)` |


## Policies (RLS)

### `ponto_rep_horarios_select_rh`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pertence_a_empresa(empresa_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'rh'::app_role)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
