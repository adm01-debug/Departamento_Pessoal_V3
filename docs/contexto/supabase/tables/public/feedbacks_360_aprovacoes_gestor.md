# public.feedbacks_360_aprovacoes_gestor

> Historico append-only das decisoes do GESTOR, ancoradas na versao canonica da avaliacao do gestor.

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
| 2 | `consolidacao_id` | `uuid` | não |  |  |  |
| 3 | `feedback_id` | `uuid` | não |  |  |  |
| 4 | `empresa_id` | `uuid` | não |  |  |  |
| 5 | `ciclo_id` | `uuid` | não |  |  |  |
| 6 | `colaborador_id` | `uuid` | não |  |  |  |
| 7 | `decisao` | `text` | não |  |  |  |
| 8 | `justificativa` | `text` | sim |  |  |  |
| 9 | `versao_avaliacao` | `text` | não |  |  |  |
| 10 | `revisao` | `integer` | não |  |  |  |
| 11 | `decidido_por` | `uuid` | não |  |  |  |
| 12 | `decidido_em` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `idempotency_key` | `text` | sim |  |  |  |
| 14 | `hash_parametros` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feedbacks_360_aprovacoes_gestor_consolidacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (consolidacao_id) REFERENCES feedbacks_360_consolidacoes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| feedbacks_360_aprovacoes_gestor_decisao_check | CHECK | `CHECK (decisao = ANY (ARRAY['aprovado'::text, 'devolvido'::text]))` |  |  | sim |
| feedbacks_360_aprovacoes_gestor_feedback_id_fkey | FOREIGN KEY | `FOREIGN KEY (feedback_id) REFERENCES feedbacks_360(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| feedbacks_360_aprovacoes_gestor_idempotency_key_key | UNIQUE | `UNIQUE (idempotency_key)` |  |  | sim |
| feedbacks_360_aprovacoes_gestor_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feedbacks_360_aprovacoes_gestor_idempotency_key_key | btree | idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_aprovacoes_gestor_idempotency_key_key ON public.feedbacks_360_aprovacoes_gestor USING btree (idempotency_key)` |
| feedbacks_360_aprovacoes_gestor_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_aprovacoes_gestor_pkey ON public.feedbacks_360_aprovacoes_gestor USING btree (id)` |
| idx_fb360_aprov_gestor | btree | empresa_id, ciclo_id, colaborador_id, decidido_em | não | sim |  | `CREATE INDEX idx_fb360_aprov_gestor ON public.feedbacks_360_aprovacoes_gestor USING btree (empresa_id, ciclo_id, colaborador_id, decidido_em DESC)` |


## Policies (RLS)

### `fag_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) AND (pode_gerir_avaliacoes() OR pode_aprovar_colaborador(colaborador_id)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
