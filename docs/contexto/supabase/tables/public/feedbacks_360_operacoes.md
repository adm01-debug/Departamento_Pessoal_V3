# public.feedbacks_360_operacoes

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
| 1 | `idempotency_key` | `text` | não |  |  |  |
| 2 | `feedback_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `operacao` | `text` | não |  |  | Rotulo da operacao idempotente: concluir\|cancelar\|reabrir\|validar_potencial\|criar\|decidir_aprovacao_gestor\|enviar_avaliacao_ao_gestor. |
| 5 | `hash_parametros` | `text` | não |  |  |  |
| 6 | `resultado` | `jsonb` | não |  |  |  |
| 7 | `criada_em` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feedbacks_360_operacoes_feedback_id_fkey | FOREIGN KEY | `FOREIGN KEY (feedback_id) REFERENCES feedbacks_360(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| feedbacks_360_operacoes_operacao_check | CHECK | `CHECK (operacao = ANY (ARRAY['concluir'::text, 'cancelar'::text, 'reabrir'::text, 'validar_potencial'::text, 'criar'::text, 'decidir_aprovacao_gestor'::text, 'enviar_avaliacao_ao_gestor'::text, 'editar_feedback'::text]))` |  |  | sim |
| feedbacks_360_operacoes_pkey | PRIMARY KEY | `PRIMARY KEY (idempotency_key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feedbacks_360_operacoes_pkey | btree | idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_operacoes_pkey ON public.feedbacks_360_operacoes USING btree (idempotency_key)` |


## Policies (RLS)

### `fbo_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pode_gerir_avaliacoes() AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
