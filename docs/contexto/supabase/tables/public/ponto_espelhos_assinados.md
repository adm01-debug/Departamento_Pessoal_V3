# public.ponto_espelhos_assinados

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
| 2 | `colaborador_id` | `uuid` | sim |  |  |  |
| 3 | `periodo_inicio` | `date` | não |  |  |  |
| 4 | `periodo_fim` | `date` | não |  |  |  |
| 5 | `total_horas_trabalhadas` | `interval` | sim |  |  |  |
| 6 | `saldo_banco_horas_periodo` | `interval` | sim |  |  |  |
| 7 | `hash_assinatura_colaborador` | `text` | sim |  |  |  |
| 8 | `data_assinatura_colaborador` | `timestamp with time zone` | sim |  |  |  |
| 9 | `hash_assinatura_rh` | `text` | sim |  |  |  |
| 10 | `data_assinatura_rh` | `timestamp with time zone` | sim |  |  |  |
| 11 | `status_assinatura` | `text` | sim | `'pendente'::text` |  |  |
| 12 | `arquivo_espelho_url` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `empresa_id` | `uuid` | sim |  |  |  |
| 15 | `competencia` | `text` | sim |  |  |  |
| 16 | `canonical_json` | `jsonb` | sim |  |  |  |
| 17 | `hash_sha256` | `text` | sim |  |  |  |
| 18 | `total_batidas` | `integer` | sim | `0` |  |  |
| 19 | `assinado_por_user_id` | `uuid` | sim |  |  |  |
| 20 | `assinado_ip` | `inet` | sim |  |  |  |
| 21 | `assinado_user_agent` | `text` | sim |  |  |  |
| 22 | `assinado_em` | `timestamp with time zone` | sim |  |  |  |
| 23 | `revogado_em` | `timestamp with time zone` | sim |  |  | Flag de revogação (a trilha completa fica em ponto_espelhos_revogacoes). Permite índice único parcial: revogado não bloqueia reassinatura. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ponto_espelhos_assinados_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| ponto_espelhos_assinados_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.ponto_espelhos_revogacoes | ponto_espelhos_revogacoes_espelho_id_fkey | espelho_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_espelho_empresa_comp | btree | empresa_id, competencia | não | sim |  | `CREATE INDEX idx_espelho_empresa_comp ON public.ponto_espelhos_assinados USING btree (empresa_id, competencia)` |
| idx_ponto_espelhos_assinados_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_ponto_espelhos_assinados_colaborador_id ON public.ponto_espelhos_assinados USING btree (colaborador_id)` |
| ponto_espelhos_assinados_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ponto_espelhos_assinados_pkey ON public.ponto_espelhos_assinados USING btree (id)` |
| uq_espelho_colab_competencia | btree | colaborador_id, competencia | sim | sim | `((competencia IS NOT NULL) AND (revogado_em IS NULL))` | `CREATE UNIQUE INDEX uq_espelho_colab_competencia ON public.ponto_espelhos_assinados USING btree (colaborador_id, competencia) WHERE ((competencia IS NOT NULL) AND (revogado_em IS NULL))` |


## Policies (RLS)

### `Colaboradores podem ver seus próprios espelhos`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(auth.uid() = colaborador_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ponto_espelhos_assinados_no_delete | BEFORE | DELETE | ROW | enabled | public.ponto_espelhos_assinados_guard_delete |
| trg_ponto_espelhos_assinados_no_update | BEFORE | UPDATE | ROW | enabled | public.ponto_espelhos_assinados_guard_update |


## Grants

| role | privilégios |
|---|---|
| anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
