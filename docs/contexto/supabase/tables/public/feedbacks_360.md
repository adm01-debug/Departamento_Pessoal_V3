# public.feedbacks_360

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.vw_feedbacks_360_versao, public.vw_matriz_nine_box |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `empresa_id` | `uuid` | sim |  |  |  |
| 3 | `ciclo_id` | `uuid` | sim |  |  |  |
| 4 | `avaliado_id` | `uuid` | sim |  |  |  |
| 5 | `avaliador_id` | `uuid` | sim |  |  |  |
| 6 | `tipo` | `text` | sim | `'par'::text` |  |  |
| 7 | `nota_geral` | `numeric` | sim |  |  |  |
| 8 | `pontos_fortes` | `text` | sim |  |  |  |
| 9 | `pontos_melhoria` | `text` | sim |  |  |  |
| 10 | `comentarios` | `text` | sim |  |  |  |
| 11 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `potencial` | `integer` | sim |  |  |  |
| 15 | `performance` | `integer` | sim |  |  |  |
| 16 | `revisao` | `integer` | não | `0` |  | Contador monotonico incrementado a CADA alteracao da linha pelo trigger trg_feedbacks_360_revisao (status, nota, potencial ou qualquer outro campo). Entra na versao canonica: reabrir/alterar/concluir de novo invalida a validacao anterior do RH mesmo dentro da MESMA transacao, quando now() e constante. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feedbacks_360_avaliado_id_fkey | FOREIGN KEY | `FOREIGN KEY (avaliado_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| feedbacks_360_avaliador_id_fkey | FOREIGN KEY | `FOREIGN KEY (avaliador_id) REFERENCES colaboradores(id)` | NO ACTION | NO ACTION | sim |
| feedbacks_360_ciclo_id_fkey | FOREIGN KEY | `FOREIGN KEY (ciclo_id) REFERENCES ciclos_avaliacao(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| feedbacks_360_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| feedbacks_360_performance_check | CHECK | `CHECK (performance >= 1 AND performance <= 5)` |  |  | sim |
| feedbacks_360_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| feedbacks_360_potencial_check | CHECK | `CHECK (potencial >= 1 AND potencial <= 5)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.feedbacks_360_aprovacoes_gestor | feedbacks_360_aprovacoes_gestor_feedback_id_fkey | feedback_id | RESTRICT |
| public.feedbacks_360_operacoes | feedbacks_360_operacoes_feedback_id_fkey | feedback_id | RESTRICT |
| public.feedbacks_360_validacoes_potencial | feedbacks_360_validacoes_potencial_feedback_id_fkey | feedback_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feedbacks_360_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_pkey ON public.feedbacks_360 USING btree (id)` |
| idx_feedbacks_360_avaliado_id | btree | avaliado_id | não | sim |  | `CREATE INDEX idx_feedbacks_360_avaliado_id ON public.feedbacks_360 USING btree (avaliado_id)` |
| idx_feedbacks_360_avaliador_id | btree | avaliador_id | não | sim |  | `CREATE INDEX idx_feedbacks_360_avaliador_id ON public.feedbacks_360 USING btree (avaliador_id)` |
| idx_feedbacks_360_ciclo_id | btree | ciclo_id | não | sim |  | `CREATE INDEX idx_feedbacks_360_ciclo_id ON public.feedbacks_360 USING btree (ciclo_id)` |
| idx_feedbacks_360_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_feedbacks_360_empresa_id ON public.feedbacks_360 USING btree (empresa_id)` |


## Policies (RLS)

### `feedbacks_360_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(pode_gerir_avaliacoes() AND (empresa_id IS NOT NULL) AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))` |

### `feedbacks_360_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pode_gerir_avaliacoes() AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_feedbacks_360_consolidacao | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.trg_feedbacks_360_consolidacao |
| trg_feedbacks_360_revisao | BEFORE | UPDATE | ROW | enabled | public.tg_feedbacks_360_revisao |


## Grants

| role | privilégios |
|---|---|
| anon | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
