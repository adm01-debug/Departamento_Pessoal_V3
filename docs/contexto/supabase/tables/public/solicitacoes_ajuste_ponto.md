# public.solicitacoes_ajuste_ponto

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 10 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `colaborador_id` | `uuid` | não |  |  |  |
| 3 | `empresa_id` | `uuid` | não |  |  |  |
| 4 | `data_ponto` | `date` | não |  |  |  |
| 5 | `hora_original` | `time without time zone` | sim |  |  |  |
| 6 | `hora_sugerida` | `time without time zone` | não |  |  |  |
| 7 | `tipo_ponto` | `text` | não |  |  |  |
| 8 | `motivo` | `text` | não |  |  |  |
| 9 | `status` | `text` | sim | `'pendente'::text` |  |  |
| 10 | `aprovado_por` | `uuid` | sim |  |  |  |
| 11 | `observacoes_gestor` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `rascunho` | `boolean` | sim | `false` |  |  |
| 15 | `data_analise` | `timestamp with time zone` | sim |  |  |  |
| 16 | `analisado_por` | `uuid` | sim |  |  |  |
| 17 | `relatorio_conformidade` | `jsonb` | sim | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_solicitacoes_ajuste_ponto_status | CHECK | `CHECK (status IS NULL OR (status = ANY (ARRAY['pendente'::text, 'em_analise'::text, 'aprovada'::text, 'rejeitada'::text, 'cancelada'::text, 'estornada'::text])))` |  |  | sim |
| solicitacoes_ajuste_ponto_analisado_por_fkey | FOREIGN KEY | `FOREIGN KEY (analisado_por) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| solicitacoes_ajuste_ponto_aprovado_por_fkey | FOREIGN KEY | `FOREIGN KEY (aprovado_por) REFERENCES profiles(id)` | NO ACTION | NO ACTION | sim |
| solicitacoes_ajuste_ponto_colaborador_id_fkey | FOREIGN KEY | `FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| solicitacoes_ajuste_ponto_empresa_id_fkey | FOREIGN KEY | `FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| solicitacoes_ajuste_ponto_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_solic_ajuste_pendente | btree | empresa_id, created_at | não | sim | `(status = 'pendente'::text)` | `CREATE INDEX idx_solic_ajuste_pendente ON public.solicitacoes_ajuste_ponto USING btree (empresa_id, created_at DESC) WHERE (status = 'pendente'::text)` |
| idx_solicitacoes_ajuste_ponto_analisado_por | btree | analisado_por | não | sim |  | `CREATE INDEX idx_solicitacoes_ajuste_ponto_analisado_por ON public.solicitacoes_ajuste_ponto USING btree (analisado_por)` |
| idx_solicitacoes_ajuste_ponto_aprovado_por | btree | aprovado_por | não | sim |  | `CREATE INDEX idx_solicitacoes_ajuste_ponto_aprovado_por ON public.solicitacoes_ajuste_ponto USING btree (aprovado_por)` |
| idx_solicitacoes_ajuste_ponto_colaborador_id | btree | colaborador_id | não | sim |  | `CREATE INDEX idx_solicitacoes_ajuste_ponto_colaborador_id ON public.solicitacoes_ajuste_ponto USING btree (colaborador_id)` |
| idx_solicitacoes_ajuste_ponto_empresa_id | btree | empresa_id | não | sim |  | `CREATE INDEX idx_solicitacoes_ajuste_ponto_empresa_id ON public.solicitacoes_ajuste_ponto USING btree (empresa_id)` |
| solicitacoes_ajuste_ponto_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX solicitacoes_ajuste_ponto_pkey ON public.solicitacoes_ajuste_ponto USING btree (id)` |


## Policies (RLS)

### `Colaboradores criam rascunho ou enviada`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.email = (auth.jwt() ->> 'email'::text)))) AND (status = ANY (ARRAY['rascunho'::text, 'enviado'::text])))` |

### `Colaboradores deletam seus rascunhos`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.email = (auth.jwt() ->> 'email'::text)))) AND (status = 'rascunho'::text))` |
| WITH CHECK |  |

### `Colaboradores editam seus rascunhos`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.email = (auth.jwt() ->> 'email'::text)))) AND (status = 'rascunho'::text))` |
| WITH CHECK |  |

### `Colaboradores veem suas próprias solicitações`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(colaborador_id IN ( SELECT colaboradores.id    FROM colaboradores   WHERE (colaboradores.email = (auth.jwt() ->> 'email'::text))))` |
| WITH CHECK |  |

### `Gestores e RH aprovam solicitações`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((EXISTS ( SELECT 1    FROM user_roles   WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = ANY (ARRAY['gestor'::text, 'admin'::text, 'rh'::text]))))) AND (empresa_id IN ( SELECT empresas.id    FROM empresas)))` |
| WITH CHECK | `(status = ANY (ARRAY['aprovado'::text, 'recusado'::text, 'revisao'::text, 'encaminhado'::text]))` |

### `Gestores veem solicitações da empresa`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `pertence_a_empresa(empresa_id)` |
| WITH CHECK |  |

### `solicitacoes_ajuste_ponto_tenant_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((empresa_id IN ( SELECT get_user_empresas(auth.uid()) AS get_user_empresas)) OR is_admin(auth.uid()))` |
| WITH CHECK |  |

### `solicitacoes_delete_policy`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT profiles.role_display    FROM profiles   WHERE (profiles.user_id = auth.uid())  LIMIT 1) = ANY (ARRAY['admin'::text, 'gestor'::text]))` |
| WITH CHECK |  |

### `solicitacoes_select_policy`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT profiles.role_display    FROM profiles   WHERE (profiles.user_id = auth.uid())  LIMIT 1) = ANY (ARRAY['admin'::text, 'gestor'::text]))` |
| WITH CHECK |  |

### `solicitacoes_update_policy`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT profiles.role_display    FROM profiles   WHERE (profiles.user_id = auth.uid())  LIMIT 1) = ANY (ARRAY['admin'::text, 'gestor'::text]))` |
| WITH CHECK | `(( SELECT profiles.role_display    FROM profiles   WHERE (profiles.user_id = auth.uid())  LIMIT 1) = ANY (ARRAY['admin'::text, 'gestor'::text]))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| ajuste_ponto_status_transition | BEFORE | UPDATE | ROW | enabled | public.trg_ajuste_ponto_status_transition |
| audit_status_change | AFTER | UPDATE | ROW | enabled | public.trg_audit_status_change |
| tr_gerar_conformidade_ponto | BEFORE | UPDATE | ROW | enabled | public.gerar_relatorio_conformidade_ponto |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| dp_mcp_role | SELECT |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
