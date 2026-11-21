# public.ponto_rep_justificativas

> De-para das justificativas do AtecSoft para o tipo de dia do DP.

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
| 5 | `nome` | `text` | não |  |  |  |
| 6 | `considera_normal` | `boolean` | não | `false` |  |  |
| 7 | `considera_falta` | `boolean` | não | `false` |  |  |
| 8 | `tipo_dia` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_justificativas_dispositivo_codigo_key | UNIQUE | `UNIQUE (dispositivo_id, codigo)` |  |  | sim |
| ponto_rep_justificativas_dispositivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (dispositivo_id) REFERENCES ponto_rep_dispositivos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_justificativas_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_justificativas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ponto_rep_justificativas_tipo_dia_check | CHECK | `CHECK (tipo_dia IS NULL OR (tipo_dia = ANY (ARRAY['normal'::text, 'feriado'::text, 'compensado'::text, 'folga'::text, 'falta'::text, 'atestado'::text, 'ferias'::text, 'licenca'::text])))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_rep_justificativas_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_ponto_rep_justificativas_empresa ON public.ponto_rep_justificativas USING btree (empresa_id)` |
| ponto_rep_justificativas_dispositivo_codigo_key | btree | dispositivo_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_justificativas_dispositivo_codigo_key ON public.ponto_rep_justificativas USING btree (dispositivo_id, codigo)` |
| ponto_rep_justificativas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_justificativas_pkey ON public.ponto_rep_justificativas USING btree (id)` |


## Policies (RLS)

### `ponto_rep_justificativas_select_rh`

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
