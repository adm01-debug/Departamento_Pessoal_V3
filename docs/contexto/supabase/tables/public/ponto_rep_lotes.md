# public.ponto_rep_lotes

> Cada envio recebido de um coletor do relógio de ponto.

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
| 4 | `recebido_em` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `periodo_inicio` | `date` | sim |  |  |  |
| 6 | `periodo_fim` | `date` | sim |  |  |  |
| 7 | `total_funcionarios` | `integer` | não | `0` |  |  |
| 8 | `total_dias` | `integer` | não | `0` |  |  |
| 9 | `dias_alterados` | `integer` | não | `0` |  |  |
| 10 | `status` | `text` | não | `'recebido'::text` |  |  |
| 11 | `mensagem_erro` | `text` | sim |  |  |  |
| 12 | `hash_sha256` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_lotes_dispositivo_id_fkey | FOREIGN KEY | `FOREIGN KEY (dispositivo_id) REFERENCES ponto_rep_dispositivos(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_lotes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_lotes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ponto_rep_lotes_status_check | CHECK | `CHECK (status = ANY (ARRAY['recebido'::text, 'processado'::text, 'parcial'::text, 'erro'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ponto_rep_dias | ponto_rep_dias_lote_id_fkey | lote_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ponto_rep_lotes_dispositivo_recebido | btree | dispositivo_id, recebido_em | não | sim |  | `CREATE INDEX idx_ponto_rep_lotes_dispositivo_recebido ON public.ponto_rep_lotes USING btree (dispositivo_id, recebido_em DESC)` |
| ponto_rep_lotes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_lotes_pkey ON public.ponto_rep_lotes USING btree (id)` |


## Policies (RLS)

### `ponto_rep_lotes_select_rh`

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
