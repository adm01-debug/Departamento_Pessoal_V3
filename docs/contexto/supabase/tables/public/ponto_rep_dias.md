# public.ponto_rep_dias

> Cópia fiel do cartão ponto diário do AtecSoft (tabela CP).

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
| 4 | `lote_id` | `uuid` | sim |  |  |  |
| 5 | `funcionario_codigo` | `integer` | não |  |  |  |
| 6 | `data` | `date` | não |  |  |  |
| 7 | `marcacoes` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `abono` | `time without time zone` | sim |  |  |  |
| 9 | `abono_negativo` | `time without time zone` | sim |  |  |  |
| 10 | `folga` | `boolean` | não | `false` |  |  |
| 11 | `neutro` | `boolean` | não | `false` |  |  |
| 12 | `justificativa_abono` | `integer` | sim |  |  |  |
| 13 | `horario_codigo` | `integer` | sim |  |  |  |
| 14 | `hash_conteudo` | `text` | não |  |  |  |
| 15 | `processado_em` | `timestamp with time zone` | sim |  |  |  |
| 16 | `erro_processamento` | `text` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_dias_dispositivo_func_data_key | UNIQUE | `UNIQUE (dispositivo_id, funcionario_codigo, data)` |  |  | sim |
| ponto_rep_dias_dispositivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (dispositivo_id) REFERENCES ponto_rep_dispositivos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_dias_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_dias_lote_id_fkey | FOREIGN KEY | `FOREIGN KEY (lote_id) REFERENCES ponto_rep_lotes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ponto_rep_dias_marcacoes_array | CHECK | `CHECK (jsonb_typeof(marcacoes) = 'array'::text)` |  |  | sim |
| ponto_rep_dias_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_rep_dias_empresa_data | btree | empresa_id, data | não | sim |  | `CREATE INDEX idx_ponto_rep_dias_empresa_data ON public.ponto_rep_dias USING btree (empresa_id, data)` |
| idx_ponto_rep_dias_lote_id | btree | lote_id | não | sim |  | `CREATE INDEX idx_ponto_rep_dias_lote_id ON public.ponto_rep_dias USING btree (lote_id)` |
| idx_ponto_rep_dias_pendentes | btree | dispositivo_id, data | não | sim | `(processado_em IS NULL)` | `CREATE INDEX idx_ponto_rep_dias_pendentes ON public.ponto_rep_dias USING btree (dispositivo_id, data) WHERE (processado_em IS NULL)` |
| ponto_rep_dias_dispositivo_func_data_key | btree | dispositivo_id, funcionario_codigo, data | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_dias_dispositivo_func_data_key ON public.ponto_rep_dias USING btree (dispositivo_id, funcionario_codigo, data)` |
| ponto_rep_dias_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_dias_pkey ON public.ponto_rep_dias USING btree (id)` |


## Policies (RLS)

### `ponto_rep_dias_select_rh`

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
