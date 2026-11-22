# public.ponto_rep_feriados

> Feriados do AtecSoft (tabela FERIADO) por coletor.

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
| 5 | `nome` | `text` | sim |  |  |  |
| 6 | `data` | `date` | não |  |  |  |
| 7 | `nao_computa_banco_horas` | `boolean` | não | `false` |  |  |
| 8 | `vinculo_cidade` | `integer` | sim |  |  |  |
| 9 | `vinculo_departamento` | `integer` | sim |  |  |  |
| 10 | `vinculo_empresa` | `integer` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_feriados_dispositivo_codigo_key | UNIQUE | `UNIQUE (dispositivo_id, codigo)` |  |  | sim |
| ponto_rep_feriados_dispositivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (dispositivo_id) REFERENCES ponto_rep_dispositivos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_feriados_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_feriados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_rep_feriados_empresa_data | btree | empresa_id, data | não | sim |  | `CREATE INDEX idx_ponto_rep_feriados_empresa_data ON public.ponto_rep_feriados USING btree (empresa_id, data)` |
| ponto_rep_feriados_dispositivo_codigo_key | btree | dispositivo_id, codigo | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_feriados_dispositivo_codigo_key ON public.ponto_rep_feriados USING btree (dispositivo_id, codigo)` |
| ponto_rep_feriados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_feriados_pkey ON public.ponto_rep_feriados USING btree (id)` |


## Policies (RLS)

### `ponto_rep_feriados_select_rh`

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
