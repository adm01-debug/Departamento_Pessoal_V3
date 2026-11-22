# public.ponto_rep_dispositivos

> Coletores do relógio de ponto, um por unidade. Token só em hash.

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
| 2 | `empresa_id` | `uuid` | não |  |  |  |
| 3 | `nome` | `text` | não |  |  |  |
| 4 | `unidade` | `text` | não |  |  |  |
| 5 | `token_hash` | `text` | não |  |  |  |
| 6 | `token_prefixo` | `text` | não |  |  |  |
| 7 | `ativo` | `boolean` | não | `true` |  |  |
| 8 | `revogado_em` | `timestamp with time zone` | sim |  |  |  |
| 9 | `ultimo_contato_em` | `timestamp with time zone` | sim |  |  |  |
| 10 | `ultima_marcacao_em` | `timestamp with time zone` | sim |  |  |  |
| 11 | `versao_coletor` | `text` | sim |  |  |  |
| 12 | `criado_por` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_rep_dispositivos_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| ponto_rep_dispositivos_empresa_unidade_key | UNIQUE | `UNIQUE (empresa_id, unidade)` |  |  | sim |
| ponto_rep_dispositivos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ponto_rep_dispositivos_token_hash_fmt | CHECK | `CHECK (token_hash ~ '^[0-9a-f]{64}$'::text)` |  |  | sim |
| ponto_rep_dispositivos_token_hash_key | UNIQUE | `UNIQUE (token_hash)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ponto_rep_dias | ponto_rep_dias_dispositivo_id_fkey | dispositivo_id | RESTRICT |
| public.ponto_rep_feriados | ponto_rep_feriados_dispositivo_id_fkey | dispositivo_id | RESTRICT |
| public.ponto_rep_funcionarios | ponto_rep_funcionarios_dispositivo_id_fkey | dispositivo_id | RESTRICT |
| public.ponto_rep_horarios | ponto_rep_horarios_dispositivo_id_fkey | dispositivo_id | RESTRICT |
| public.ponto_rep_justificativas | ponto_rep_justificativas_dispositivo_id_fkey | dispositivo_id | RESTRICT |
| public.ponto_rep_lotes | ponto_rep_lotes_dispositivo_id_fkey | dispositivo_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| ponto_rep_dispositivos_empresa_unidade_key | btree | empresa_id, unidade | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_dispositivos_empresa_unidade_key ON public.ponto_rep_dispositivos USING btree (empresa_id, unidade)` |
| ponto_rep_dispositivos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_dispositivos_pkey ON public.ponto_rep_dispositivos USING btree (id)` |
| ponto_rep_dispositivos_token_hash_key | btree | token_hash | sim | sim |  | `CREATE UNIQUE INDEX ponto_rep_dispositivos_token_hash_key ON public.ponto_rep_dispositivos USING btree (token_hash)` |


## Policies (RLS)

### `ponto_rep_dispositivos_select_rh`

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
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |


Grants por coluna:

| coluna | role | privilégios |
|---|---|---|
| ativo | authenticated | SELECT |
| created_at | authenticated | SELECT |
| empresa_id | authenticated | SELECT |
| id | authenticated | SELECT |
| nome | authenticated | SELECT |
| revogado_em | authenticated | SELECT |
| token_prefixo | authenticated | SELECT |
| ultima_marcacao_em | authenticated | SELECT |
| ultimo_contato_em | authenticated | SELECT |
| unidade | authenticated | SELECT |
| updated_at | authenticated | SELECT |
| versao_coletor | authenticated | SELECT |
