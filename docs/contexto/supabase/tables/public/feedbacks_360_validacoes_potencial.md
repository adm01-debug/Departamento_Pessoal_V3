# public.feedbacks_360_validacoes_potencial

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
| 3 | `ciclo_id` | `uuid` | sim |  |  |  |
| 4 | `colaborador_id` | `uuid` | não |  |  |  |
| 5 | `feedback_id` | `uuid` | não |  |  |  |
| 6 | `versao_avaliacao` | `text` | não |  |  |  |
| 7 | `potencial_validado` | `numeric(4,2)` | não |  |  |  |
| 8 | `validado_por` | `uuid` | não |  |  |  |
| 9 | `validado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `observacao` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feedbacks_360_validacoes_potencial_feedback_id_fkey | FOREIGN KEY | `FOREIGN KEY (feedback_id) REFERENCES feedbacks_360(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| feedbacks_360_validacoes_potencial_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| feedbacks_360_validacoes_potencial_potencial_validado_check | CHECK | `CHECK (potencial_validado >= 1::numeric AND potencial_validado <= 5::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feedbacks_360_validacoes_potencial_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_validacoes_potencial_pkey ON public.feedbacks_360_validacoes_potencial USING btree (id)` |
| idx_fb360_validacoes_potencial | btree | feedback_id, validado_em | não | sim |  | `CREATE INDEX idx_fb360_validacoes_potencial ON public.feedbacks_360_validacoes_potencial USING btree (feedback_id, validado_em DESC)` |


## Policies (RLS)

### `fvp_select`

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
