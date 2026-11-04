# public.feedbacks_360_consolidacoes

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
| 3 | `ciclo_id` | `uuid` | não |  |  |  |
| 4 | `colaborador_id` | `uuid` | não |  |  |  |
| 5 | `status` | `text` | não | `'em_preparacao'::text` |  |  |
| 6 | `enviado_por` | `uuid` | sim |  |  |  |
| 7 | `enviado_em` | `timestamp with time zone` | sim |  |  |  |
| 8 | `atualizado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `versao_consolidada` | `text` | sim |  |  |  |
| 10 | `gestor_responsavel_colaborador_id` | `uuid` | sim |  |  |  |
| 11 | `gestor_responsavel_user_id` | `uuid` | sim |  |  |  |
| 12 | `revisao` | `integer` | não | `0` |  |  |
| 13 | `atualizado_por` | `uuid` | sim |  |  |  |
| 14 | `desempenho_proposto` | `numeric` | sim |  |  | Desempenho proposto pelo RH na avaliação consolidada (1–5). |
| 15 | `potencial_proposto` | `numeric` | sim |  |  | Potencial proposto pelo RH na avaliação consolidada (1–5). |
| 16 | `desempenho_aprovado` | `numeric` | sim |  |  | Snapshot do Desempenho confirmado pelo gestor na aprovação vigente. |
| 17 | `potencial_aprovado` | `numeric` | sim |  |  | Snapshot do Potencial confirmado pelo gestor na aprovação vigente. |
| 18 | `aprovado_por` | `uuid` | sim |  |  |  |
| 19 | `aprovado_em` | `timestamp with time zone` | sim |  |  |  |
| 20 | `aprovacao_id` | `uuid` | sim |  |  | Linha de feedbacks_360_aprovacoes_gestor que produziu o snapshot vigente. |
| 21 | `snapshot_aprovado` | `jsonb` | sim |  |  | Cópia imutável dos valores/categorias confirmados na aprovação. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fbc_desempenho_aprovado_escala | CHECK | `CHECK (desempenho_aprovado IS NULL OR desempenho_aprovado >= 1::numeric AND desempenho_aprovado <= 5::numeric)` |  |  | sim |
| fbc_desempenho_proposto_escala | CHECK | `CHECK (desempenho_proposto IS NULL OR desempenho_proposto >= 1::numeric AND desempenho_proposto <= 5::numeric)` |  |  | sim |
| fbc_potencial_aprovado_escala | CHECK | `CHECK (potencial_aprovado IS NULL OR potencial_aprovado >= 1::numeric AND potencial_aprovado <= 5::numeric)` |  |  | sim |
| fbc_potencial_proposto_escala | CHECK | `CHECK (potencial_proposto IS NULL OR potencial_proposto >= 1::numeric AND potencial_proposto <= 5::numeric)` |  |  | sim |
| feedbacks_360_consolidacoes_empresa_id_ciclo_id_colaborador_key | UNIQUE | `UNIQUE (empresa_id, ciclo_id, colaborador_id)` |  |  | sim |
| feedbacks_360_consolidacoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| feedbacks_360_consolidacoes_status_check | CHECK | `CHECK (status = ANY (ARRAY['em_preparacao'::text, 'sem_gestor'::text, 'aguardando_gestor'::text, 'devolvida'::text, 'aprovada_gestor'::text, 'aguardando_rh'::text, 'concluida_validada'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.feedbacks_360_aprovacoes_gestor | feedbacks_360_aprovacoes_gestor_consolidacao_id_fkey | consolidacao_id | RESTRICT |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feedbacks_360_consolidacoes_empresa_id_ciclo_id_colaborador_key | btree | empresa_id, ciclo_id, colaborador_id | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_consolidacoes_empresa_id_ciclo_id_colaborador_key ON public.feedbacks_360_consolidacoes USING btree (empresa_id, ciclo_id, colaborador_id)` |
| feedbacks_360_consolidacoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX feedbacks_360_consolidacoes_pkey ON public.feedbacks_360_consolidacoes USING btree (id)` |
| idx_fb360_consolidacoes_gestor | btree | gestor_responsavel_user_id, status | não | sim |  | `CREATE INDEX idx_fb360_consolidacoes_gestor ON public.feedbacks_360_consolidacoes USING btree (gestor_responsavel_user_id, status)` |


## Policies (RLS)

### `fcs_select`

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
