# public.medidas_disciplinares

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
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | sim |  |  |  |
| 4 | `tipo` | `text` | não |  |  |  |
| 5 | `numero_sequencial` | `integer` | sim |  |  |  |
| 6 | `data_ocorrencia` | `date` | não |  |  |  |
| 7 | `descricao` | `text` | não |  |  |  |
| 8 | `testemunha_1` | `text` | sim |  |  |  |
| 9 | `testemunha_2` | `text` | sim |  |  |  |
| 10 | `dias_suspensao` | `integer` | sim | `0` |  |  |
| 11 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 12 | `assinado_em` | `timestamp with time zone` | sim |  |  |  |
| 13 | `documento_url` | `text` | sim |  |  |  |
| 14 | `aplicado_por` | `uuid` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 17 | `artigo_clt` | `text` | sim |  |  |  |
| 18 | `testemunha_1_nome` | `text` | sim |  |  |  |
| 19 | `testemunha_1_cpf` | `text` | sim |  |  |  |
| 20 | `testemunha_2_nome` | `text` | sim |  |  |  |
| 21 | `testemunha_2_cpf` | `text` | sim |  |  |  |
| 22 | `data_ciencia` | `timestamp with time zone` | sim |  |  |  |
| 23 | `colaborador_ciente` | `boolean` | sim | `false` |  |  |
| 24 | `recusa_assinatura` | `boolean` | sim | `false` |  |  |
| 25 | `motivo_recusa` | `text` | sim |  |  |  |
| 26 | `evidenciado_por` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 27 | `recorrencia_infrafacao` | `boolean` | sim | `false` |  |  |
| 28 | `id_registro_anterior` | `uuid` | sim |  |  |  |
| 29 | `hash_integridade` | `text` | sim |  |  |  |
| 30 | `data_conhecimento_fato` | `date` | sim |  |  |  |
| 31 | `prazo_ciencia_dias` | `integer` | sim | `3` |  |  |
| 32 | `status_workflow` | `text` | sim | `'aplicada'::text` |  |  |
| 33 | `gravidade` | `text` | sim |  |  |  |
| 34 | `aprovador_id` | `uuid` | sim |  |  |  |
| 35 | `data_aprovacao` | `timestamp with time zone` | sim |  |  |  |
| 36 | `contestacao_texto` | `text` | sim |  |  |  |
| 37 | `contestacao_data` | `timestamp with time zone` | sim |  |  |  |
| 38 | `contestacao_resposta` | `text` | sim |  |  |  |
| 39 | `pdf_url` | `text` | sim |  |  |  |
| 40 | `pdf_hash_sha256` | `text` | sim |  |  |  |
| 41 | `pdf_gerado_em` | `timestamp with time zone` | sim |  |  |  |
| 42 | `aprovado_gestor_por` | `uuid` | sim |  |  |  |
| 43 | `aprovado_gestor_em` | `timestamp with time zone` | sim |  |  |  |
| 44 | `aprovado_rh_por` | `uuid` | sim |  |  |  |
| 45 | `aprovado_rh_em` | `timestamp with time zone` | sim |  |  |  |
| 46 | `aprovado_juridico_por` | `uuid` | sim |  |  |  |
| 47 | `aprovado_juridico_em` | `timestamp with time zone` | sim |  |  |  |
| 48 | `rejeitado_por` | `uuid` | sim |  |  |  |
| 49 | `rejeitado_em` | `timestamp with time zone` | sim |  |  |  |
| 50 | `motivo_rejeicao` | `text` | sim |  |  |  |
| 51 | `arquivado_por` | `uuid` | sim |  |  |  |
| 52 | `arquivado_em` | `timestamp with time zone` | sim |  |  |  |
| 53 | `contestacao_prazo_ate` | `timestamp with time zone` | sim |  |  |  |
| 54 | `contestacao_prazo_horas` | `integer` | não | `48` |  |  |
| 55 | `contestacao_respondida_em` | `timestamp with time zone` | sim |  |  |  |
| 56 | `contestacao_respondida_por` | `uuid` | sim |  |  |  |
| 57 | `contestacao_aceita` | `boolean` | sim |  |  |  |
| 58 | `data_inicio_efeito` | `date` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medidas_disciplinares_aprovado_gestor_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_gestor_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_aprovado_juridico_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_juridico_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_aprovado_rh_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_rh_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_aprovador_id_fkey | FOREIGN KEY | `FOREIGN KEY (aprovador_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_arquivado_por_fkey | FOREIGN KEY | `FOREIGN KEY (arquivado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| medidas_disciplinares_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_gravidade_check | CHECK | `CHECK (gravidade IS NULL OR (gravidade = ANY (ARRAY['leve'::text, 'media'::text, 'grave'::text, 'gravissima'::text])))` |  |  | sim |
| medidas_disciplinares_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| medidas_disciplinares_rejeitado_por_fkey | FOREIGN KEY | `FOREIGN KEY (rejeitado_por) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| medidas_disciplinares_status_workflow_check | CHECK | `CHECK (status_workflow = ANY (ARRAY['rascunho'::text, 'aguardando_gestor'::text, 'aguardando_rh'::text, 'aguardando_juridico'::text, 'aplicada'::text, 'rejeitada'::text, 'arquivada'::text, 'contestada'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.medidas_ciencia_tokens | medidas_ciencia_tokens_medida_id_fkey | medida_id | CASCADE |
| public.medidas_disciplinares_anexos | medidas_disciplinares_anexos_medida_id_fkey | medida_id | CASCADE |
| public.medidas_disciplinares_contestacao_anexos | medidas_disciplinares_contestacao_anexos_medida_id_fkey | medida_id | CASCADE |
| public.medidas_disciplinares_integracao | medidas_disciplinares_integracao_medida_id_fkey | medida_id | CASCADE |
| public.medidas_disciplinares_workflow_log | medidas_disciplinares_workflow_log_medida_id_fkey | medida_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_medidas_aprovador | btree | aprovador_id | não | sim | `(aprovador_id IS NOT NULL)` | `CREATE INDEX idx_medidas_aprovador ON public.medidas_disciplinares USING btree (aprovador_id) WHERE (aprovador_id IS NOT NULL)` |
| idx_medidas_disciplinares_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_medidas_disciplinares_colaborador_id ON public.medidas_disciplinares USING btree (colaborador_id)` |
| idx_medidas_disciplinares_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_medidas_disciplinares_empresa_id ON public.medidas_disciplinares USING btree (empresa_id)` |
| idx_medidas_empresa_data | btree | empresa_id, data_ocorrencia | não | sim |  | `CREATE INDEX idx_medidas_empresa_data ON public.medidas_disciplinares USING btree (empresa_id, data_ocorrencia DESC)` |
| idx_medidas_status_workflow | btree | empresa_id, status_workflow | não | sim |  | `CREATE INDEX idx_medidas_status_workflow ON public.medidas_disciplinares USING btree (empresa_id, status_workflow)` |
| idx_medidas_tipo | btree | tipo | não | sim |  | `CREATE INDEX idx_medidas_tipo ON public.medidas_disciplinares USING btree (tipo)` |
| medidas_disciplinares_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medidas_disciplinares_pkey ON public.medidas_disciplinares USING btree (id)` |


## Policies (RLS)

### `medidas_disciplinares_manage`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id))` |
| WITH CHECK | `(pode_gerir_rh(empresa_id) OR pode_gerir_pessoas(empresa_id))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_alert_severe_measure | AFTER | INSERT | ROW | enabled | public.fn_alert_severe_disciplinary_measure |
| tr_enforce_medida_disciplinar_hash | BEFORE | INSERT OR UPDATE | ROW | enabled | public.enforce_medida_disciplinar_hash |
| tr_impedir_alteracao_medida_aplicada | BEFORE | UPDATE | ROW | enabled | public.impedir_alteracao_medida_aplicada |
| tr_proibir_delete_medida_aplicada | BEFORE | DELETE | ROW | enabled | public.proibir_delete_medida_aplicada |
| trg_medida_aplicada_integrar | AFTER | UPDATE | ROW | enabled | public.trg_medida_aplicada_integrar |
| trg_medida_contest_notify_after | AFTER | UPDATE | ROW | enabled | public.trg_medida_contestacao_notify_after |
| trg_medida_contest_set_prazo | BEFORE | UPDATE | ROW | enabled | public.trg_medida_contestacao_notify |
| trg_medida_esocial_aplicada | AFTER | UPDATE | ROW | enabled | public.trg_medida_esocial_on_aplicada |
| trg_validar_medida_clt | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_validar_medida_disciplinar_clt |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
