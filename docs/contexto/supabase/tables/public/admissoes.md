# public.admissoes

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `nome` | `text` | não |  |  |  |
| 3 | `cargo` | `text` | não |  |  |  |
| 4 | `departamento` | `text` | não |  |  |  |
| 5 | `salario_proposto` | `numeric` | não |  |  |  |
| 6 | `data_prevista` | `date` | não |  |  |  |
| 7 | `etapa` | `etapa_admissao` | não | `'solicitacao'::etapa_admissao` |  |  |
| 8 | `observacoes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `checklist_documentos_pessoais` | `boolean` | sim | `false` |  |  |
| 13 | `checklist_comprovante_endereco` | `boolean` | sim | `false` |  |  |
| 14 | `checklist_foto` | `boolean` | sim | `false` |  |  |
| 15 | `checklist_ctps` | `boolean` | sim | `false` |  |  |
| 16 | `checklist_exame_admissional` | `boolean` | sim | `false` |  |  |
| 17 | `checklist_contrato_assinado` | `boolean` | sim | `false` |  |  |
| 18 | `checklist_esocial_enviado` | `boolean` | sim | `false` |  |  |
| 19 | `cpf` | `text` | sim |  |  |  |
| 20 | `data_nascimento` | `date` | sim |  |  |  |
| 21 | `sexo` | `text` | sim |  |  |  |
| 22 | `email` | `text` | sim |  |  |  |
| 23 | `telefone` | `text` | sim |  |  |  |
| 24 | `estado_civil` | `text` | sim | `'solteiro'::text` |  |  |
| 25 | `nome_mae` | `text` | sim |  |  |  |
| 26 | `empresa_id` | `uuid` | sim |  |  |  |
| 27 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 28 | `template_contrato_id` | `uuid` | sim |  |  |  |
| 29 | `status_esocial` | `text` | sim | `'pendente'::text` |  |  |
| 30 | `protocolo_esocial` | `text` | sim |  |  |  |
| 31 | `data_transmissao_esocial` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| admissoes_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| admissoes_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id)` | NO ACTION | NO ACTION | sim |
| admissoes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.admissao_tokens | admissao_tokens_admissao_id_fkey | admissao_id | CASCADE |
| public.contratos_gerados | contratos_gerados_admissao_id_fkey | admissao_id | CASCADE |
| public.documentos_admissao | documentos_admissao_admissao_id_fkey | admissao_id | CASCADE |
| public.esocial_eventos | esocial_eventos_admissao_id_fkey | admissao_id | SET NULL |
| public.notificacoes_admissao | notificacoes_admissao_admissao_id_fkey | admissao_id | CASCADE |
| public.tarefas_onboarding | tarefas_onboarding_admissao_id_fkey | admissao_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| admissoes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX admissoes_pkey ON public.admissoes USING btree (id)` |
| idx_admissoes_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_admissoes_created_by ON public.admissoes USING btree (created_by)` |
| idx_admissoes_empresa | btree | empresa_id | não | sim |  | `CREATE INDEX idx_admissoes_empresa ON public.admissoes USING btree (empresa_id)` |
| idx_admissoes_empresa_created | btree | empresa_id, created_at | não | sim |  | `CREATE INDEX idx_admissoes_empresa_created ON public.admissoes USING btree (empresa_id, created_at DESC)` |


## Policies (RLS)

### `Admissoes scoped by empresa`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `admissoes_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(((empresa_id IS NOT NULL) AND (empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `tenant_admissoes_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `tenant_admissoes_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |

### `tenant_admissoes_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |

### `tenant_admissoes_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_admissoes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_audit_change |
| tr_admissoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| tr_create_onboarding_tasks | AFTER | INSERT | ROW | enabled | public.fn_create_default_onboarding_tasks |
| trg_admissao_auto_workflow | AFTER | INSERT | ROW | enabled | public.fn_workflow_admissao_auto |
| trg_workflow_admissao | AFTER | INSERT | ROW | enabled | public.fn_processar_workflow_admissao |
| trigger_auditoria_admissao | BEFORE | UPDATE | ROW | enabled | public.registrar_auditoria_contratual |
| update_admissoes_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
